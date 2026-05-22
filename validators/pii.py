"""
PII Detector — lightweight regex-based implementation.
Replaces presidio-analyzer which is too large for serverless (500MB+).
Detects and redacts: emails, phone numbers, credit cards.
"""
import re

PII_PATTERNS = [
    ("EMAIL_ADDRESS",  r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+"),
    ("PHONE_NUMBER",   r"(\+?\d[\d\s\-().]{7,}\d)"),
    ("CREDIT_CARD",    r"\b(?:\d[ -]?){13,16}\b"),
    ("SSN",            r"\b\d{3}-\d{2}-\d{4}\b"),
]


def check_and_redact_pii(text: str) -> dict:
    """
    Detects PII via regex, redacts it, and returns a mapping.
    Returns: {passed, has_pii, redacted_text, mapping, reason}
    """
    redacted = text
    mapping: dict[str, str] = {}
    found_types: list[str] = []

    for entity_type, pattern in PII_PATTERNS:
        def _replace(m: re.Match, et: str = entity_type) -> str:
            token = f"[{et}_REDACTED]"
            original = m.group(0)
            if token not in mapping:
                mapping[token] = original
            return token

        new_text, n = re.subn(pattern, _replace, redacted)
        if n > 0:
            found_types.append(entity_type)
            redacted = new_text

    if not found_types:
        return {
            "passed": True,
            "has_pii": False,
            "redacted_text": text,
            "mapping": {},
            "reason": "No PII detected.",
        }

    return {
        "passed": True,
        "has_pii": True,
        "redacted_text": redacted,
        "mapping": mapping,
        "reason": f"PII detected and redacted: {', '.join(found_types)}.",
    }
