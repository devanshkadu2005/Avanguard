"""
Output safety validator — checks LLM response against content policies and admin-defined rules.
Replaces the old schema validator (RefundResponse).
"""
import re
from db.database import get_db


# Patterns that indicate system prompt leakage
PROMPT_LEAKAGE_PATTERNS = [
    r"you are avanguard",
    r"your system prompt",
    r"my instructions are",
    r"i was told to",
    r"my programming says",
    r"as an ai assistant.{0,20}my rules",
]


def _get_admin_rules() -> list[dict]:
    """Load all admin-defined content rules from the database."""
    try:
        with get_db() as cur:
            cur.execute("SELECT rule_name, value, description FROM business_rules ORDER BY id")
            return [dict(r) for r in cur.fetchall()]
    except Exception:
        return []


def check_output_safety(response_text: str) -> dict:
    """
    Validates the LLM response against content safety rules.
    Checks:
      1. Prompt leakage detection (system prompt appearing in output)
      2. Response length limits (from admin rules)
      3. Admin-defined content rules (text-based rules checked against response)

    Returns: {passed: bool, reason: str, flagged_categories: list}
    """
    flagged = []
    lower_response = response_text.lower()

    # ── Check 1: Prompt leakage ──
    for pattern in PROMPT_LEAKAGE_PATTERNS:
        try:
            if re.search(pattern, lower_response, re.IGNORECASE):
                flagged.append("prompt_leakage")
                break
        except re.error:
            continue

    # ── Check 2: Admin-defined content rules ──
    admin_rules = _get_admin_rules()
    for rule in admin_rules:
        rule_name = rule["rule_name"]
        rule_value = str(rule["value"]).strip()

        # max_response_length: numeric check
        if rule_name == "max_response_length":
            try:
                max_len = int(float(rule_value))
                if len(response_text) > max_len:
                    flagged.append("response_too_long")
            except (ValueError, TypeError):
                pass

        # blocked_topics: comma-separated list of blocked topics
        elif rule_name == "blocked_topics":
            if rule_value:
                topics = [t.strip().lower() for t in rule_value.split(",") if t.strip()]
                for topic in topics:
                    if topic in lower_response:
                        flagged.append(f"blocked_topic:{topic}")

        # Any other rule: treat value as a policy description to check
        # Admin can add custom rules like:
        #   rule_name: "no_medical_advice"
        #   value: "Response must not provide specific medical diagnoses or prescriptions"
        # These are stored for the LLM-based safety check (done in the pipeline)
        # Here we just do keyword-based checks for rules that have a simple pattern
        else:
            # If the rule value looks like a pattern/keyword list, check it
            if rule_value.startswith("block:") or rule_value.startswith("deny:"):
                keywords = [k.strip().lower() for k in rule_value.split(":", 1)[1].split(",") if k.strip()]
                for kw in keywords:
                    if kw in lower_response:
                        flagged.append(f"rule_violation:{rule_name}")
                        break

    if flagged:
        return {
            "passed": False,
            "reason": f"Content policy violation: {', '.join(flagged)}",
            "flagged_categories": flagged,
        }

    return {
        "passed": True,
        "reason": "Output safety checks passed.",
        "flagged_categories": [],
    }
