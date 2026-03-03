"""Zoom meeting utilities for schedule creation."""

import base64
import json
import logging
from uuid import uuid4
from urllib.parse import urlparse
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlencode
from urllib.request import Request, urlopen

from flask import current_app

logger = logging.getLogger(__name__)


def _request_json(url: str, *, method: str, headers: dict[str, str], body: dict | None, timeout: int) -> dict:
    payload = None
    if body is not None:
        payload = json.dumps(body).encode("utf-8")

    request = Request(url=url, data=payload, method=method)
    for header_name, header_value in headers.items():
        request.add_header(header_name, header_value)

    with urlopen(request, timeout=timeout) as response:
        raw = response.read().decode("utf-8")
        return json.loads(raw) if raw else {}


def _mock_zoom_link() -> str:
    meeting_id = str(uuid4().int % (10**11)).zfill(11)
    return f"https://zoom.us/j/{meeting_id}"


def _zoom_access_token(timeout_seconds: int) -> str:
    client_id = current_app.config.get("ZOOM_CLIENT_ID", "")
    client_secret = current_app.config.get("ZOOM_CLIENT_SECRET", "")
    account_id = current_app.config.get("ZOOM_ACCOUNT_ID", "")

    if not client_id or not client_secret or not account_id:
        raise RuntimeError("Zoom is not configured.")

    basic_token = base64.b64encode(f"{client_id}:{client_secret}".encode("utf-8")).decode("ascii")
    token_url = "https://zoom.us/oauth/token?" + urlencode(
        {
            "grant_type": "account_credentials",
            "account_id": account_id,
        }
    )

    token_response = _request_json(
        token_url,
        method="POST",
        headers={
            "Authorization": f"Basic {basic_token}",
        },
        body=None,
        timeout=timeout_seconds,
    )
    access_token = token_response.get("access_token", "")
    if not access_token:
        raise RuntimeError("Zoom token response did not include access_token.")
    return str(access_token)


def _extract_meeting_id_from_join_url(join_url: str) -> str | None:
    parsed = urlparse(join_url)
    path_parts = [part for part in parsed.path.split("/") if part]
    if len(path_parts) < 2:
        return None
    marker = path_parts[-2]
    meeting_id = path_parts[-1]
    if marker != "j" or not meeting_id.isdigit():
        return None
    return meeting_id


def invalidate_zoom_meeting_link(join_url: str) -> bool:
    """Invalidate a Zoom meeting by deleting it at provider level.

    Returns True when deletion was attempted successfully (or when running in mock mode),
    False when the link cannot be parsed or provider deletion fails.
    """

    meeting_id = _extract_meeting_id_from_join_url(join_url)
    if not meeting_id:
        logger.warning("Unable to parse Zoom meeting id from join url")
        return False

    timeout_seconds = int(current_app.config.get("ZOOM_API_TIMEOUT_SECONDS", 10))

    client_id = current_app.config.get("ZOOM_CLIENT_ID", "")
    client_secret = current_app.config.get("ZOOM_CLIENT_SECRET", "")
    account_id = current_app.config.get("ZOOM_ACCOUNT_ID", "")
    if not client_id or not client_secret or not account_id:
        if bool(current_app.config.get("ZOOM_MOCK_LINK_FALLBACK_ENABLED", True)):
            logger.warning("Zoom credentials missing; skipping provider invalidation in mock mode")
            return True
        logger.error("Zoom credentials missing; cannot invalidate provider meeting")
        return False

    try:
        access_token = _zoom_access_token(timeout_seconds)
        delete_url = f"https://api.zoom.us/v2/meetings/{meeting_id}"
        _request_json(
            delete_url,
            method="DELETE",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
            },
            body=None,
            timeout=timeout_seconds,
        )
    except HTTPError as exc:
        details = exc.read().decode("utf-8") if hasattr(exc, "read") else ""
        logger.exception("Zoom API HTTP error during invalidation", extra={"status_code": getattr(exc, "code", None), "details": details})
        return False
    except URLError:
        logger.exception("Zoom API network error during invalidation")
        return False
    except (RuntimeError, ValueError, json.JSONDecodeError):
        logger.exception("Zoom meeting invalidation failed")
        return False

    return True


def create_zoom_meeting_link(topic: str) -> str:
    """Create a Zoom recurring meeting and return its join URL.

    Falls back to a mock Zoom URL when credentials are not configured and
    `ZOOM_MOCK_LINK_FALLBACK_ENABLED` is true.
    """

    client_id = current_app.config.get("ZOOM_CLIENT_ID", "")
    client_secret = current_app.config.get("ZOOM_CLIENT_SECRET", "")
    account_id = current_app.config.get("ZOOM_ACCOUNT_ID", "")
    timeout_seconds = int(current_app.config.get("ZOOM_API_TIMEOUT_SECONDS", 10))

    if not client_id or not client_secret or not account_id:
        if bool(current_app.config.get("ZOOM_MOCK_LINK_FALLBACK_ENABLED", True)):
            mock_link = _mock_zoom_link()
            logger.warning("Zoom credentials missing; using mock Zoom link")
            return mock_link
        raise RuntimeError("Zoom is not configured.")

    try:
        access_token = _zoom_access_token(timeout_seconds)

        zoom_user_id = quote(current_app.config.get("ZOOM_USER_ID", "me"), safe="")
        create_meeting_url = f"https://api.zoom.us/v2/users/{zoom_user_id}/meetings"
        meeting_response = _request_json(
            create_meeting_url,
            method="POST",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
            },
            body={
                "topic": topic,
                "type": 3,
                "timezone": current_app.config.get("ZOOM_TIMEZONE", "UTC"),
                "settings": {
                    "join_before_host": False,
                    "waiting_room": True,
                },
            },
            timeout=timeout_seconds,
        )
    except HTTPError as exc:
        details = exc.read().decode("utf-8") if hasattr(exc, "read") else ""
        logger.exception("Zoom API HTTP error", extra={"status_code": getattr(exc, "code", None), "details": details})
        raise RuntimeError("Unable to create Zoom meeting.") from exc
    except URLError as exc:
        logger.exception("Zoom API network error")
        raise RuntimeError("Unable to connect to Zoom API.") from exc
    except (ValueError, json.JSONDecodeError) as exc:
        logger.exception("Zoom API response parse failed")
        raise RuntimeError("Invalid response from Zoom API.") from exc

    join_url = meeting_response.get("join_url", "")
    if not join_url:
        raise RuntimeError("Zoom meeting response did not include join_url.")
    return str(join_url)
