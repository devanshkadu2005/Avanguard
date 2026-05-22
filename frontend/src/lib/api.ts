const TOKEN_KEY = "avanguard_token";

function authHeaders(): Record<string, string> {
  const t = localStorage.getItem(TOKEN_KEY);
  return t ? { Authorization: `Bearer ${t}` } : {};
}

export interface Message {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  verdict?: string;
  pipeline_steps?: Record<string, { passed: boolean; reason: string; has_pii?: boolean }>;
  token_count?: number;
  created_at: string;
}

export interface Conversation {
  id: string;
  title: string;
  status: string;
  message_count: number;
  flagged: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChatResponse {
  conversation_id: string;
  message_id: string;
  response: string;
  verdict: string;
  reason: string;
  steps: Record<string, { passed: boolean; reason: string; has_pii?: boolean }>;
  pipeline_logs: PipelineLog[];
  token_count: number;
  retried: boolean;
}

export interface PipelineLog {
  id: string;
  message_id: string;
  step_name: string;
  step_order: number;
  status: string;
  input_text: string;
  output_text: string;
  details: Record<string, unknown>;
  duration_ms: number;
  created_at: string;
}

export interface Rule {
  id: number;
  rule_name: string;
  value: string;
  description: string;
}

export interface InjectionRule {
  id: number;
  pattern: string;
  source: string;
  created_at: string;
}

export interface DashboardStats {
  total_conversations: number;
  total_messages: number;
  injection_blocked: number;
  pii_detected: number;
  policy_violations: number;
  avg_response_ms: number;
  [key: string]: number;
}

// ─── Public ───
export async function sendMessage(message: string, conversationId?: string): Promise<ChatResponse> {
  const r = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, conversation_id: conversationId }),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(err.detail || err.message || err.error || "Request failed");
  }
  return r.json();
}

export async function getConversations(): Promise<Conversation[]> {
  const r = await fetch("/api/conversations");
  const d = await r.json();
  return d.conversations;
}

export async function getConversation(id: string): Promise<{ conversation: Conversation; messages: Message[]; pipeline_logs: PipelineLog[] }> {
  const r = await fetch(`/api/conversations/${id}`);
  return r.json();
}

export async function createConversation(): Promise<Conversation> {
  const r = await fetch("/api/conversations", { method: "POST", headers: { "Content-Type": "application/json" } });
  return r.json();
}

// ─── Admin ───
export async function adminLogin(username: string, password: string): Promise<{ token: string }> {
  const r = await fetch("/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!r.ok) throw new Error("Invalid credentials");
  const d = await r.json();
  localStorage.setItem(TOKEN_KEY, d.token);
  return d;
}

export async function getDashboard(): Promise<DashboardStats> {
  const r = await fetch("/api/admin/dashboard", { headers: authHeaders() });
  if (r.status === 401) throw new Error("Unauthorized");
  return r.json();
}

export async function getAdminConversations(status?: string): Promise<Conversation[]> {
  const url = status && status !== "all" ? `/api/admin/conversations?status=${status}` : "/api/admin/conversations";
  const r = await fetch(url, { headers: authHeaders() });
  if (r.status === 401) throw new Error("Unauthorized");
  const d = await r.json();
  return d.conversations;
}

export async function getAdminConversationDetail(id: string): Promise<{ conversation: Conversation; messages: Message[]; pipeline_logs: PipelineLog[] }> {
  const r = await fetch(`/api/admin/conversations/${id}`, { headers: authHeaders() });
  if (r.status === 401) throw new Error("Unauthorized");
  return r.json();
}

export async function getAdminRules(): Promise<Rule[]> {
  const r = await fetch("/api/admin/rules", { headers: authHeaders() });
  const d = await r.json();
  return d.rules;
}

export async function updateAdminRule(name: string, value: string): Promise<void> {
  await fetch(`/api/admin/rules/${name}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ value }),
  });
}

export async function createAdminRule(rule_name: string, value: string, description: string): Promise<void> {
  await fetch("/api/admin/rules", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ rule_name, value, description }),
  });
}

export async function deleteAdminRule(name: string): Promise<void> {
  await fetch(`/api/admin/rules/${name}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
}

export async function getAdminInjectionRules(): Promise<InjectionRule[]> {
  const r = await fetch("/api/admin/injection-rules", { headers: authHeaders() });
  const d = await r.json();
  return d.rules;
}

export async function getAdminLogs(messageId?: string): Promise<PipelineLog[]> {
  const url = messageId ? `/api/admin/logs?message_id=${messageId}` : "/api/admin/logs";
  const r = await fetch(url, { headers: authHeaders() });
  const d = await r.json();
  return d.logs;
}

export function getAdminWsUrl(): string {
  const token = localStorage.getItem(TOKEN_KEY) ?? "";
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  // Use host from window if available, otherwise default to localhost for dev
  const host = window.location.hostname === "localhost" ? "127.0.0.1:8000" : window.location.host;
  return `${protocol}//${host}/ws/admin?token=${token}`;
}
