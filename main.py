import os
import uuid
import json
import time
import asyncio
from collections import defaultdict
from fastapi import FastAPI, Request, HTTPException, Depends, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse, FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from dotenv import load_dotenv

from db.database import get_db
from auth import create_token, verify_token, verify_password

load_dotenv()

app = FastAPI(title="AvanGuard v2 - Secure Chatbot")

# Allow localhost in dev + any Vercel deployment URL in prod
ALLOWED_ORIGINS = os.environ.get("ALLOWED_ORIGINS", "").split(",")
ALLOWED_ORIGINS += ["http://localhost:5173", "http://127.0.0.1:5173"]
ALLOWED_ORIGINS = [o.strip() for o in ALLOWED_ORIGINS if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Rate Limiter ───
class RateLimiter:
    def __init__(self, max_requests: int = 20, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window = window_seconds
        self.requests: dict[str, list[float]] = defaultdict(list)

    def is_allowed(self, key: str) -> bool:
        now = time.time()
        self.requests[key] = [t for t in self.requests[key] if now - t < self.window]
        if len(self.requests[key]) >= self.max_requests:
            return False
        self.requests[key].append(now)
        return True

    def remaining(self, key: str) -> int:
        now = time.time()
        self.requests[key] = [t for t in self.requests[key] if now - t < self.window]
        return max(0, self.max_requests - len(self.requests[key]))

rate_limiter = RateLimiter(max_requests=20, window_seconds=60)

# ─── WebSocket Manager ───
class ConnectionManager:
    def __init__(self):
        self.connections: list[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.connections.append(ws)

    def disconnect(self, ws: WebSocket):
        if ws in self.connections:
            self.connections.remove(ws)

    async def broadcast(self, message: dict):
        dead = []
        for ws in self.connections:
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)

ws_manager = ConnectionManager()

# ─── Auth dependency ───
def get_admin(request: Request):
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(401, "Missing token")
    payload = verify_token(auth[7:])
    if not payload:
        raise HTTPException(401, "Invalid or expired token")
    return payload


# ═══════════════════════════════════════════
#  PUBLIC ROUTES
# ═══════════════════════════════════════════

class ChatMessage(BaseModel):
    message: str
    conversation_id: Optional[str] = None

@app.post("/api/chat")
async def chat(body: ChatMessage, request: Request):
    # Rate limiting
    client_ip = request.client.host if request.client else "unknown"
    if not rate_limiter.is_allowed(client_ip):
        raise HTTPException(429, detail={
            "error": "Rate limit exceeded",
            "message": f"Maximum requests per minute reached. Try again shortly.",
            "remaining": 0,
        })

    conversation_id = body.conversation_id
    if not conversation_id:
        conversation_id = str(uuid.uuid4())
        with get_db() as cur:
            cur.execute("""
                INSERT INTO conversations (id, title, status)
                VALUES (%s, 'New Conversation', 'active')
            """, (conversation_id,))

    from pipeline.orchestrator import process_message
    result = process_message(conversation_id, body.message)
    result["rate_limit_remaining"] = rate_limiter.remaining(client_ip)

    # Broadcast to admin WebSocket
    try:
        await ws_manager.broadcast({
            "type": "new_message",
            "conversation_id": conversation_id,
            "message_id": result.get("message_id"),
            "verdict": result.get("verdict", "UNKNOWN"),
            "timestamp": time.time(),
        })
    except Exception:
        pass

    return result

@app.get("/api/conversations")
def list_conversations():
    with get_db() as cur:
        cur.execute("SELECT * FROM conversations ORDER BY updated_at DESC")
        rows = cur.fetchall()
    return {"conversations": [dict(r) for r in rows]}

@app.post("/api/conversations")
def create_conversation():
    conversation_id = str(uuid.uuid4())
    with get_db() as cur:
        cur.execute("""
            INSERT INTO conversations (id, title, status)
            VALUES (%s, 'New Conversation', 'active') RETURNING *
        """, (conversation_id,))
        row = cur.fetchone()
    return dict(row)

@app.get("/api/conversations/{conversation_id}")
def get_conversation(conversation_id: str):
    with get_db() as cur:
        cur.execute("SELECT * FROM conversations WHERE id = %s", (conversation_id,))
        conv = cur.fetchone()
        if not conv:
            raise HTTPException(404, "Conversation not found")
        
        cur.execute("SELECT * FROM messages WHERE conversation_id = %s ORDER BY created_at ASC", (conversation_id,))
        messages = cur.fetchall()
        
        # Get logs for all messages in conversation
        cur.execute("""
            SELECT l.* FROM pipeline_logs l
            JOIN messages m ON l.message_id = m.id
            WHERE m.conversation_id = %s
            ORDER BY m.created_at ASC, l.step_order ASC
        """, (conversation_id,))
        logs = cur.fetchall()

    return {
        "conversation": dict(conv), 
        "messages": [dict(m) for m in messages],
        "pipeline_logs": [dict(l) for l in logs]
    }


# ═══════════════════════════════════════════
#  ADMIN ROUTES
# ═══════════════════════════════════════════

class LoginBody(BaseModel):
    username: str
    password: str

@app.post("/api/admin/login")
def admin_login(body: LoginBody):
    with get_db() as cur:
        cur.execute("SELECT * FROM admin_users WHERE username = %s", (body.username,))
        user = cur.fetchone()
    if not user:
        raise HTTPException(401, "Invalid credentials")
    if not verify_password(body.password, user["password_hash"]):
        raise HTTPException(401, "Invalid credentials")
    token = create_token(body.username)
    return {"token": token, "username": body.username}


@app.get("/api/admin/dashboard")
def admin_dashboard(admin=Depends(get_admin)):
    with get_db() as cur:
        cur.execute("SELECT COUNT(*) as total FROM conversations")
        total_conv = cur.fetchone()["total"]
        
        cur.execute("SELECT COUNT(*) as total FROM messages")
        total_msg = cur.fetchone()["total"]

        # Security metrics from messages
        cur.execute("SELECT COUNT(*) as cnt FROM messages WHERE verdict = 'FAIL'")
        fail_cnt = cur.fetchone()["cnt"]

        # Metrics from pipeline logs
        cur.execute("SELECT COUNT(*) as cnt FROM pipeline_logs WHERE step_name = 'injection' AND status = 'fail'")
        inj_blocked = cur.fetchone()["cnt"]
        
        cur.execute("SELECT COUNT(*) as cnt FROM pipeline_logs WHERE step_name = 'pii' AND status = 'flag'")
        pii_detected = cur.fetchone()["cnt"]

        cur.execute("SELECT COUNT(*) as cnt FROM pipeline_logs WHERE step_name IN ('content_safety', 'content_rules') AND status = 'fail'")
        policy_violations = cur.fetchone()["cnt"]

        cur.execute("SELECT AVG(duration_ms) as avg_time FROM pipeline_logs")
        avg_row = cur.fetchone()
        avg_time = round(float(avg_row["avg_time"])) if avg_row and avg_row["avg_time"] else 0

    return {
        "total_conversations": total_conv,
        "total_messages": total_msg,
        "injection_blocked": inj_blocked,
        "pii_detected": pii_detected,
        "policy_violations": policy_violations,
        "avg_response_ms": avg_time,
    }

@app.get("/api/admin/conversations")
def admin_conversations(status: Optional[str] = None, admin=Depends(get_admin)):
    with get_db() as cur:
        if status and status.lower() != "all":
            cur.execute("SELECT * FROM conversations WHERE status = %s ORDER BY updated_at DESC LIMIT 100", (status,))
        else:
            cur.execute("SELECT * FROM conversations ORDER BY updated_at DESC LIMIT 100")
        rows = cur.fetchall()
    return {"conversations": [dict(r) for r in rows]}

@app.get("/api/admin/conversations/{conversation_id}")
def admin_conversation_detail(conversation_id: str, admin=Depends(get_admin)):
    return get_conversation(conversation_id)

@app.get("/api/admin/rules")
def admin_rules(admin=Depends(get_admin)):
    with get_db() as cur:
        cur.execute("SELECT * FROM business_rules ORDER BY id")
        rows = cur.fetchall()
    return {"rules": [dict(r) for r in rows]}

class RuleUpdate(BaseModel):
    value: str

@app.put("/api/admin/rules/{rule_name}")
def admin_update_rule(rule_name: str, body: RuleUpdate, admin=Depends(get_admin)):
    with get_db() as cur:
        cur.execute("UPDATE business_rules SET value = %s, updated_at = NOW() WHERE rule_name = %s", (body.value, rule_name))
    return {"ok": True}

class RuleCreate(BaseModel):
    rule_name: str
    value: str
    description: str

@app.post("/api/admin/rules")
def admin_create_rule(body: RuleCreate, admin=Depends(get_admin)):
    with get_db() as cur:
        cur.execute("INSERT INTO business_rules (rule_name, value, description) VALUES (%s, %s, %s)", 
                    (body.rule_name, body.value, body.description))
    return {"ok": True}

@app.delete("/api/admin/rules/{rule_name}")
def admin_delete_rule(rule_name: str, admin=Depends(get_admin)):
    with get_db() as cur:
        cur.execute("DELETE FROM business_rules WHERE rule_name = %s", (rule_name,))
    return {"ok": True}

@app.get("/api/admin/injection-rules")
def admin_injection_rules(admin=Depends(get_admin)):
    with get_db() as cur:
        cur.execute("SELECT * FROM injection_rules ORDER BY id")
        rows = cur.fetchall()
    return {"rules": [dict(r) for r in rows]}

@app.get("/api/admin/logs")
def admin_logs(message_id: Optional[str] = None, admin=Depends(get_admin)):
    with get_db() as cur:
        if message_id:
            cur.execute("SELECT * FROM pipeline_logs WHERE message_id = %s ORDER BY step_order, created_at", (message_id,))
        else:
            cur.execute("SELECT * FROM pipeline_logs ORDER BY created_at DESC LIMIT 200")
        rows = cur.fetchall()
    return {"logs": [dict(r) for r in rows]}

# ═══════════════════════════════════════════
#  WEBSOCKET
# ═══════════════════════════════════════════

@app.websocket("/ws/admin")
async def admin_websocket(ws: WebSocket):
    token = ws.query_params.get("token", "")
    if not verify_token(token):
        await ws.close(code=4001)
        return
    await ws_manager.connect(ws)
    try:
        while True:
            await ws.receive_text()  # keep alive
    except WebSocketDisconnect:
        ws_manager.disconnect(ws)

# ═══════════════════════════════════════════
#  FRONTEND SERVING (local dev only)
# ═══════════════════════════════════════════

frontend_dist = os.path.join(os.path.dirname(__file__), "frontend", "dist")
frontend_index = os.path.join(frontend_dist, "index.html")

if os.path.exists(frontend_dist) and not os.environ.get("VERCEL"):
    from fastapi.staticfiles import StaticFiles
    assets_dir = os.path.join(frontend_dist, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="static")

    @app.get("/{full_path:path}")
    def serve_frontend(full_path: str):
        if os.path.exists(frontend_index):
            return FileResponse(frontend_index)
        return HTMLResponse("<h1>AvanGuard v2 API</h1>")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
