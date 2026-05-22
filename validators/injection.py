"""
Injection validator — two-tier: regex DB + LLM Judge.
Self-healing: if the AI catches a new injection, its pattern is saved to the DB.
"""
import re
from db.database import get_db


def _get_patterns() -> list[str]:
    with get_db() as cur:
        cur.execute("SELECT pattern FROM injection_rules ORDER BY id")
        return [r["pattern"] for r in cur.fetchall()]


def _save_pattern(pattern: str, source: str = "ai_generated"):
    try:
        with get_db() as cur:
            cur.execute(
                "INSERT INTO injection_rules (pattern, source) VALUES (%s, %s) ON CONFLICT (pattern) DO NOTHING",
                (pattern, source),
            )
    except Exception as e:
        print(f"[injection] Failed to save pattern: {e}")


def check_injection(text: str) -> dict:
    """
    Tier 1: Regex patterns from DB.
    Tier 2: LLM-as-a-judge (if regex passes).
    Returns {passed, reason, details}.
    """
    lower = text.lower()

    # Tier 1 — regex
    patterns = _get_patterns()
    for pat in patterns:
        try:
            if re.search(pat, lower, re.IGNORECASE):
                return {
                    "passed": False,
                    "reason": "Prompt injection detected (regex match).",
                    "details": f"Matched pattern: {pat}",
                }
        except re.error:
            continue

    # Tier 2 — LLM judge
    try:
        from adapters.openai import analyze_injection_intent

        result = analyze_injection_intent(text)
        if result.get("is_injection"):
            new_regex = result.get("regex", "")
            if new_regex:
                _save_pattern(new_regex, "ai_generated")
            return {
                "passed": False,
                "reason": "Prompt injection detected (AI judge).",
                "details": f"AI-generated regex: {new_regex}" if new_regex else "Flagged by AI",
                "thinking": result.get("thinking", "")
            }
    except Exception as e:
        print(f"[injection] LLM judge error: {e}")

    return {"passed": True, "reason": "No injection detected.", "details": "", "thinking": ""}
