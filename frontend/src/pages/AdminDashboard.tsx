import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Shield, ShieldAlert, Zap, LogOut, Database, EyeOff, LayoutDashboard, MessageSquare, XCircle, Search } from "lucide-react";
import { getDashboard, getAdminLogs, getAdminWsUrl, DashboardStats, PipelineLog } from "@/lib/api";

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [logs, setLogs] = useState<PipelineLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const nav = useNavigate();

  const loadData = async () => {
    try {
      const [d, l] = await Promise.all([getDashboard(), getAdminLogs()]);
      setStats(d);
      setLogs(l);
    } catch {
      nav("/admin/login");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    let ws: WebSocket;
    const connectWs = () => {
      ws = new WebSocket(getAdminWsUrl());
      ws.onmessage = () => loadData();
      ws.onclose = () => setTimeout(connectWs, 3000);
    };
    connectWs();
    return () => ws?.close();
  }, [nav]);

  const handleLogout = () => {
    localStorage.removeItem("avanguard_token");
    nav("/");
  };

  const filteredLogs = logs.filter(log => 
    log.step_name.toLowerCase().includes(search.toLowerCase()) || 
    log.status.toLowerCase().includes(search.toLowerCase()) ||
    log.message_id.includes(search)
  );

  const STAT_CARDS = [
    { key: "total_conversations", label: "Conversations", icon: <LayoutDashboard />, color: "#6366f1" },
    { key: "total_messages", label: "Total Messages", icon: <MessageSquare />, color: "#38bdf8" },
    { key: "injection_blocked", label: "Injections Blocked", icon: <ShieldAlert />, color: "#ef4444" },
    { key: "pii_detected", label: "PII Detected", icon: <EyeOff />, color: "#f59e0b" },
    { key: "policy_violations", label: "Policy Violations", icon: <XCircle />, color: "#8b5cf6" },
    { key: "avg_response_ms", label: "Avg Response", icon: <Zap />, color: "#10b981", suffix: "ms" },
  ];

  if (loading) return <div style={{ minHeight: "100vh", background: "#050810", color: "white", display: "flex", alignItems: "center", justifyContent: "center" }}>Loading...</div>;

  return (
    <div style={{ minHeight: "100vh", background: "#050810", color: "white", padding: "2rem" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        
        {/* Header */}
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "3rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg,#6366f1,#38bdf8)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Shield style={{ color: "white" }} />
            </div>
            <div>
              <h1 style={{ fontSize: "1.4rem", fontWeight: 700, margin: 0 }}>Security Dashboard</h1>
              <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.4)", margin: 0 }}>AvanGuard metrics and logs</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: "1rem" }}>
            <button onClick={() => nav("/admin/rules")} style={{ padding: "0.5rem 1rem", borderRadius: "8px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Database size={16} /> Content Rules
            </button>
            <button onClick={handleLogout} style={{ padding: "0.5rem 1rem", borderRadius: "8px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <LogOut size={16} /> Logout
            </button>
          </div>
        </header>

        {/* Stats Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1.5rem", marginBottom: "3rem" }}>
          {STAT_CARDS.map((c, i) => (
            <motion.div key={c.key} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
              style={{ padding: "1.5rem", borderRadius: "16px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
              <div style={{ color: c.color, marginBottom: "0.5rem" }}>{c.icon}</div>
              <div style={{ fontSize: "2rem", fontWeight: 700, color: "white" }}>
                {stats?.[c.key] ?? 0}{c.suffix}
              </div>
              <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.4)" }}>{c.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Security Events Log */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h2 style={{ fontSize: "1.2rem", fontWeight: 600 }}>Recent Security Events</h2>
            <div style={{ position: "relative" }}>
              <Search style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.3)" }} size={16} />
              <input 
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search logs..."
                style={{ padding: "0.5rem 1rem 0.5rem 2.5rem", borderRadius: "8px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white", outline: "none", fontSize: "0.85rem" }}
              />
            </div>
          </div>

          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "16px", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ background: "rgba(255,255,255,0.02)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "rgba(255,255,255,0.4)" }}>
                  <th style={{ padding: "1rem" }}>Time</th>
                  <th style={{ padding: "1rem" }}>Step</th>
                  <th style={{ padding: "1rem" }}>Status</th>
                  <th style={{ padding: "1rem" }}>Message ID</th>
                  <th style={{ padding: "1rem" }}>Output / Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.slice(0, 50).map((log, i) => (
                  <motion.tr key={log.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                    style={{ borderTop: "1px solid rgba(255,255,255,0.05)", fontSize: "0.85rem" }}>
                    <td style={{ padding: "1rem", color: "rgba(255,255,255,0.4)" }}>{new Date(log.created_at).toLocaleTimeString()}</td>
                    <td style={{ padding: "1rem", fontWeight: 500 }}>{log.step_name}</td>
                    <td style={{ padding: "1rem" }}>
                      <span style={{ 
                        padding: "0.2rem 0.5rem", borderRadius: "4px", fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase",
                        background: log.status === 'pass' ? 'rgba(16,185,129,0.1)' : log.status === 'fail' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
                        color: log.status === 'pass' ? '#10b981' : log.status === 'fail' ? '#ef4444' : '#f59e0b'
                      }}>
                        {log.status}
                      </span>
                    </td>
                    <td style={{ padding: "1rem", fontFamily: "JetBrains Mono", color: "rgba(255,255,255,0.5)", fontSize: "0.7rem" }}>{log.message_id.split("-")[0]}</td>
                    <td style={{ padding: "1rem", color: "rgba(255,255,255,0.6)", maxWidth: "300px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {log.output_text || JSON.stringify(log.details)}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
            {filteredLogs.length === 0 && (
              <div style={{ padding: "2rem", textAlign: "center", color: "rgba(255,255,255,0.3)" }}>No security events found.</div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
