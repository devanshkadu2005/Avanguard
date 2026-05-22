"""
Chat pipeline orchestrator.
Runs the full AvanGuard security pipeline for a chat message, logging every step to PostgreSQL.
Supports multi-turn conversations with history.
"""
import os
import time
import json
import uuid
from dotenv import load_dotenv
from db.database import get_db

load_dotenv()
FAIL_MODE = os.environ.get("FAIL_MODE", "closed").lower()


def _log_step(cur, message_id: str, step_name: str, step_order: int,
              status: str, input_text: str, output_text: str,
              details: dict, duration_ms: int):
    cur.execute("""
        INSERT INTO pipeline_logs (id, message_id, step_name, step_order, status, input_text, output_text, details, duration_ms)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
    """, (str(uuid.uuid4()), message_id, step_name, step_order, status,
          input_text, output_text, json.dumps(details), duration_ms))


def _get_conversation_history(cur, conversation_id: str, limit: int = 20) -> list[dict]:
    """Load recent conversation history for multi-turn support."""
    cur.execute("""
        SELECT role, content FROM messages
        WHERE conversation_id = %s
        ORDER BY created_at ASC
        LIMIT %s
    """, (conversation_id, limit))
    return [{"role": r["role"], "content": r["content"]} for r in cur.fetchall()]


def process_message(conversation_id: str, user_message: str) -> dict:
    """
    Run the full AvanGuard security pipeline on a chat message.
    Steps:
      1. Injection Check (input)
      2. PII Redaction (input)
      3. LLM Response Generation
      4. Output Safety Check (LLM-as-judge on response)
      5. Content Rules Check (admin-defined rules on response)
      6. Final Decision

    Returns the result dict with the assistant response and pipeline metadata.
    """
    fail_mode = os.environ.get("FAIL_MODE", FAIL_MODE).lower()
    steps_result = {}
    current_text = user_message
    total_tokens = 0
    retried = False
    message_id = str(uuid.uuid4())

    with get_db() as cur:
        # Save the user message
        cur.execute("""
            INSERT INTO messages (id, conversation_id, role, content, created_at)
            VALUES (%s, %s, 'user', %s, NOW())
        """, (message_id, conversation_id, user_message))

        # Load conversation history for multi-turn
        history = _get_conversation_history(cur, conversation_id)

        # ── Step 1: Injection Check ──
        t0 = time.time()
        from validators.injection import check_injection
        inj = check_injection(current_text)
        dur = int((time.time() - t0) * 1000)
        steps_result["injection"] = inj
        _log_step(cur, message_id, "injection", 1,
                  "pass" if inj["passed"] else "fail",
                  current_text, inj["reason"],
                  {"details": inj.get("details", ""), "thinking": inj.get("thinking", "")}, dur)

        if not inj["passed"]:
            verdict = "WARNING" if fail_mode == "open" else "FAIL"
            blocked_response = "⚠️ Your message was blocked by our security system. It was flagged as a potential prompt injection attempt."

            # Save the blocked response as assistant message
            assistant_msg_id = str(uuid.uuid4())
            cur.execute("""
                INSERT INTO messages (id, conversation_id, role, content, verdict, pipeline_steps, created_at)
                VALUES (%s, %s, 'assistant', %s, %s, %s, NOW())
            """, (assistant_msg_id, conversation_id, blocked_response, verdict,
                  json.dumps(steps_result)))

            # Update conversation
            cur.execute("""
                UPDATE conversations SET updated_at = NOW(), status = %s WHERE id = %s
            """, ("flagged" if verdict == "FAIL" else "active", conversation_id))

            _log_step(cur, message_id, "decision", 6, verdict.lower(),
                      "", f"Blocked: {inj['reason']}", {}, 0)

            # Get pipeline logs for this message
            cur.execute("SELECT * FROM pipeline_logs WHERE message_id = %s ORDER BY step_order", (message_id,))
            logs = _serialize_logs(cur.fetchall())

            return {
                "conversation_id": conversation_id,
                "message_id": message_id,
                "response": blocked_response,
                "verdict": verdict,
                "reason": inj["reason"],
                "steps": steps_result,
                "pipeline_logs": logs,
                "token_count": 0,
                "retried": False,
            }

        # ── Step 2: PII Redaction ──
        t0 = time.time()
        try:
            from validators.pii import check_and_redact_pii
            pii_result = check_and_redact_pii(current_text)
        except Exception as e:
            pii_result = {"passed": True, "reason": f"PII check skipped: {e}",
                          "has_pii": False, "redacted_text": current_text}
        dur = int((time.time() - t0) * 1000)
        steps_result["pii"] = pii_result
        cleaned_text = pii_result.get("redacted_text", current_text)
        _log_step(cur, message_id, "pii", 2,
                  "pass" if not pii_result.get("has_pii") else "flag",
                  current_text, cleaned_text,
                  {"has_pii": pii_result.get("has_pii", False)}, dur)

        pii_flagged = pii_result.get("has_pii", False)

        # ── Step 3: LLM Response Generation ──
        t0 = time.time()
        from adapters.openai import get_chat_response
        llm = get_chat_response(cleaned_text, history)
        dur = int((time.time() - t0) * 1000)
        steps_result["llm"] = {"passed": llm["passed"], "reason": llm["reason"]}
        total_tokens += llm.get("token_count", 0)
        _log_step(cur, message_id, "llm", 3,
                  "pass" if llm["passed"] else "fail",
                  cleaned_text, llm.get("text", ""),
                  {"token_count": llm.get("token_count", 0)}, dur)

        if not llm["passed"]:
            verdict = "WARNING" if fail_mode == "open" else "FAIL"
            error_response = "I'm sorry, I wasn't able to generate a response. Please try again."

            assistant_msg_id = str(uuid.uuid4())
            cur.execute("""
                INSERT INTO messages (id, conversation_id, role, content, verdict, pipeline_steps, token_count, created_at)
                VALUES (%s, %s, 'assistant', %s, %s, %s, %s, NOW())
            """, (assistant_msg_id, conversation_id, error_response, verdict,
                  json.dumps(steps_result), total_tokens))

            cur.execute("UPDATE conversations SET updated_at = NOW() WHERE id = %s", (conversation_id,))

            cur.execute("SELECT * FROM pipeline_logs WHERE message_id = %s ORDER BY step_order", (message_id,))
            logs = _serialize_logs(cur.fetchall())

            return {
                "conversation_id": conversation_id,
                "message_id": message_id,
                "response": error_response,
                "verdict": verdict,
                "reason": f"LLM call failed: {llm['reason']}",
                "steps": steps_result,
                "pipeline_logs": logs,
                "token_count": total_tokens,
                "retried": False,
            }

        assistant_response = llm["text"]

        # ── Step 4: Output Safety Check (LLM-as-judge) ──
        t0 = time.time()
        from adapters.openai import check_output_safety as llm_safety_check
        safety = llm_safety_check(assistant_response)
        dur = int((time.time() - t0) * 1000)
        safety_passed = safety.get("is_safe", True)
        steps_result["content_safety"] = {
            "passed": safety_passed,
            "reason": safety.get("reason", "") if not safety_passed else "Output safety check passed."
        }
        _log_step(cur, message_id, "content_safety", 4,
                  "pass" if safety_passed else "fail",
                  assistant_response[:500], "safe" if safety_passed else safety.get("reason", ""),
                  {"is_safe": safety_passed, "thinking": safety.get("thinking", "")}, dur)

        # ── Step 5: Content Rules Check ──
        t0 = time.time()
        from validators.rules import check_content_rules
        rules_result = check_content_rules(assistant_response)
        dur = int((time.time() - t0) * 1000)
        steps_result["content_rules"] = rules_result
        _log_step(cur, message_id, "content_rules", 5,
                  "pass" if rules_result["passed"] else "fail",
                  assistant_response[:500], rules_result["reason"],
                  {}, dur)

        # ── Retry on safety/rules failure ──
        if not safety_passed or not rules_result["passed"]:
            retried = True
            fail_reason = safety.get("reason", "") if not safety_passed else rules_result["reason"]

            t0 = time.time()
            from adapters.openai import get_chat_retry
            retry_llm = get_chat_retry(cleaned_text, history, fail_reason)
            dur = int((time.time() - t0) * 1000)
            total_tokens += retry_llm.get("token_count", 0)
            _log_step(cur, message_id, "retry_llm", 3, "retry",
                      cleaned_text, retry_llm.get("text", ""),
                      {"token_count": retry_llm.get("token_count", 0)}, dur)

            if retry_llm["passed"]:
                assistant_response = retry_llm["text"]
                # Re-check safety and rules on retried response
                safety = llm_safety_check(assistant_response)
                safety_passed = safety.get("is_safe", True)
                steps_result["content_safety"] = {
                    "passed": safety_passed,
                    "reason": safety.get("reason", "") if not safety_passed else "Output safety check passed.",
                    "thinking": safety.get("thinking", "")
                }
                rules_result = check_content_rules(assistant_response)
                steps_result["content_rules"] = rules_result

        # ── Step 6: Final Decision ──
        if safety_passed and rules_result["passed"]:
            if pii_flagged:
                verdict = "REVIEW"
                final_reason = f"PII detected in input. {pii_result['reason']}"
            else:
                verdict = "PASS"
                final_reason = "All security checks passed."
        else:
            if fail_mode == "open":
                verdict = "WARNING"
                final_reason = rules_result["reason"] if not rules_result["passed"] else safety.get("reason", "")
            else:
                verdict = "FAIL"
                final_reason = rules_result["reason"] if not rules_result["passed"] else safety.get("reason", "")
                assistant_response = "⚠️ The response was blocked by our content safety system. Please rephrase your question."

        _log_step(cur, message_id, "decision", 6, verdict.lower(),
                  "", final_reason, {}, 0)

        # Save assistant message
        assistant_msg_id = str(uuid.uuid4())
        cur.execute("""
            INSERT INTO messages (id, conversation_id, role, content, verdict, pipeline_steps, token_count, retried, created_at)
            VALUES (%s, %s, 'assistant', %s, %s, %s, %s, %s, NOW())
        """, (assistant_msg_id, conversation_id, assistant_response, verdict,
              json.dumps(steps_result), total_tokens, retried))

        # Update conversation title (from first user message) and timestamp
        cur.execute("SELECT message_count FROM conversations WHERE id = %s", (conversation_id,))
        conv = cur.fetchone()
        if conv and conv.get("message_count", 0) == 0:
            title = user_message[:60] + ("..." if len(user_message) > 60 else "")
            cur.execute("""
                UPDATE conversations SET title = %s, updated_at = NOW(),
                message_count = message_count + 2 WHERE id = %s
            """, (title, conversation_id))
        else:
            cur.execute("""
                UPDATE conversations SET updated_at = NOW(),
                message_count = message_count + 2 WHERE id = %s
            """, (conversation_id,))

        # Get pipeline logs for this message
        cur.execute("SELECT * FROM pipeline_logs WHERE message_id = %s ORDER BY step_order, created_at", (message_id,))
        logs = _serialize_logs(cur.fetchall())

        return {
            "conversation_id": conversation_id,
            "message_id": message_id,
            "response": assistant_response,
            "verdict": verdict,
            "reason": final_reason,
            "steps": steps_result,
            "pipeline_logs": logs,
            "token_count": total_tokens,
            "retried": retried,
        }


def _serialize_logs(rows) -> list[dict]:
    """Convert DB rows to serializable dicts."""
    logs = []
    for r in rows:
        d = dict(r)
        d["id"] = str(d["id"])
        d["message_id"] = str(d["message_id"])
        d["created_at"] = str(d["created_at"]) if d.get("created_at") else None
        logs.append(d)
    return logs
