"""
Content rules validator — checks LLM response against admin-defined text-based rules.
Replaces the old business rules validator (order/refund-specific).
Admin can add/remove rules as text via the admin dashboard.
"""
from db.database import get_db
from typing import Optional


def _get_rule(name: str) -> Optional[str]:
    """Get a single rule value by name."""
    with get_db() as cur:
        cur.execute("SELECT value FROM business_rules WHERE rule_name = %s", (name,))
        row = cur.fetchone()
        return str(row["value"]) if row else None


def _get_all_rules() -> list[dict]:
    """Get all admin-defined rules."""
    with get_db() as cur:
        cur.execute("SELECT rule_name, value, description FROM business_rules ORDER BY id")
        return [dict(r) for r in cur.fetchall()]


def check_content_rules(response_text: str) -> dict:
    """
    Validates the LLM response against admin-defined content rules.
    Rules are text-based and managed by admin (add/remove via dashboard).

    Rule format examples:
      - max_response_length: "2000" -> response must be <= 2000 chars
      - blocked_topics: "politics,religion" -> response must not contain these
      - Custom rules with "block:" prefix for keyword blocking

    Returns: {passed: bool, reason: str}
    """
    rules = _get_all_rules()
    lower_response = response_text.lower()

    for rule in rules:
        rule_name = rule["rule_name"]
        rule_value = str(rule["value"]).strip()

        # ── max_response_length ──
        if rule_name == "max_response_length":
            try:
                max_len = int(float(rule_value))
                if len(response_text) > max_len:
                    return {
                        "passed": False,
                        "reason": f"Response length ({len(response_text)} chars) exceeds limit ({max_len} chars).",
                    }
            except (ValueError, TypeError):
                pass

        # ── blocked_topics: comma-separated keywords ──
        elif rule_name == "blocked_topics":
            if rule_value:
                topics = [t.strip().lower() for t in rule_value.split(",") if t.strip()]
                for topic in topics:
                    if topic in lower_response:
                        return {
                            "passed": False,
                            "reason": f"Response contains blocked topic: '{topic}'.",
                        }

        # ── Custom rules with block:/deny: prefix ──
        else:
            if rule_value.startswith("block:") or rule_value.startswith("deny:"):
                keywords = [k.strip().lower() for k in rule_value.split(":", 1)[1].split(",") if k.strip()]
                for kw in keywords:
                    if kw in lower_response:
                        return {
                            "passed": False,
                            "reason": f"Response violates rule '{rule_name}': matched keyword '{kw}'.",
                        }

    return {"passed": True, "reason": "All content rules passed."}
