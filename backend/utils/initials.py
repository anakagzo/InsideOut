import re


def _normalize_name_part(value):
	normalized = re.sub(r"[^A-Za-z0-9]", "", (value or "").strip())
	return normalized.upper()


def generate_unique_initials(first_name, last_name, user_model, exclude_user_id=None):
	first_part = _normalize_name_part(first_name)
	last_part = _normalize_name_part(last_name)

	if not first_part:
		first_part = "X"
	if not last_part:
		last_part = "X"

	max_length = max(len(first_part), len(last_part))
	candidates = []
	for index in range(1, max_length + 1):
		candidates.append(f"{first_part[:index]}{last_part[:index]}")

	existing_query = user_model.query.filter(user_model.initials.in_(candidates))
	if exclude_user_id is not None:
		existing_query = existing_query.filter(user_model.id != exclude_user_id)

	existing_initials = {
		item[0]
		for item in existing_query.with_entities(user_model.initials).all()
	}

	for candidate in candidates:
		if candidate not in existing_initials:
			return candidate

	base_candidate = candidates[-1]
	suffix_query = user_model.query.filter(user_model.initials.like(f"{base_candidate}%"))
	if exclude_user_id is not None:
		suffix_query = suffix_query.filter(user_model.id != exclude_user_id)

	suffix_matches = {
		item[0]
		for item in suffix_query.with_entities(user_model.initials).all()
	}

	suffix = 2
	while f"{base_candidate}{suffix}" in suffix_matches:
		suffix += 1

	return f"{base_candidate}{suffix}"
