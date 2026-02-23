"""JWT token revocation storage helpers.

Stores revoked token JTIs in the database with token metadata.
"""

from __future__ import annotations

from datetime import UTC, datetime

from flask import has_app_context
from sqlalchemy.exc import SQLAlchemyError

from db import db


def _utcnow_naive() -> datetime:
	return datetime.now(UTC).replace(tzinfo=None)


def _from_unix_timestamp(timestamp: int | float | None) -> datetime | None:
	if timestamp is None:
		return None
	return datetime.fromtimestamp(timestamp, tz=UTC).replace(tzinfo=None)


class _BlocklistStore:
	"""Backwards-compatible blocklist interface with DB persistence."""

	def __init__(self) -> None:
		self._fallback = set()

	def _table_available(self) -> bool:
		if not has_app_context():
			return False
		return "token_blocklist" in db.metadata.tables

	def prune_expired(self) -> None:
		if not self._table_available():
			return
		from models.token_blocklist import TokenBlocklist

		db.session.query(TokenBlocklist).filter(TokenBlocklist.expires_at < _utcnow_naive()).delete(
			synchronize_session=False,
		)
		db.session.commit()

	def add(
		self,
		jti: str,
		*,
		token_type: str | None = None,
		user_id: int | None = None,
		expires_at: datetime | None = None,
	) -> None:
		self._fallback.add(jti)
		if not self._table_available():
			return

		from models.token_blocklist import TokenBlocklist

		try:
			self.prune_expired()
			existing = db.session.query(TokenBlocklist).filter_by(jti=jti).first()
			if existing:
				return

			entry = TokenBlocklist()
			entry.jti = jti
			entry.token_type = token_type
			entry.user_id = user_id
			entry.expires_at = expires_at
			db.session.add(entry)
			db.session.commit()
		except SQLAlchemyError:
			db.session.rollback()

	def revoke_payload(self, jwt_payload: dict) -> None:
		raw_identity = jwt_payload.get("identity")
		user_id: int | None = None
		if isinstance(raw_identity, int):
			user_id = raw_identity
		elif isinstance(raw_identity, str) and raw_identity.isdigit():
			user_id = int(raw_identity)

		self.add(
			jwt_payload["jti"],
			token_type=jwt_payload.get("type"),
			user_id=user_id,
			expires_at=_from_unix_timestamp(jwt_payload.get("exp")),
		)

	def __contains__(self, jti: str) -> bool:
		if jti in self._fallback:
			return True
		if not self._table_available():
			return False

		from models.token_blocklist import TokenBlocklist

		exists = db.session.query(TokenBlocklist.id).filter_by(jti=jti).first() is not None
		if exists:
			self._fallback.add(jti)
		return exists

	def clear(self) -> None:
		self._fallback.clear()
		if not self._table_available():
			return

		from models.token_blocklist import TokenBlocklist

		db.session.query(TokenBlocklist).delete(synchronize_session=False)
		db.session.commit()


BLOCKLIST = _BlocklistStore()
