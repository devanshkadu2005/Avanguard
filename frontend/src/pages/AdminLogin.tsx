import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Shield, LogIn, Loader2 } from "lucide-react";
import { adminLogin } from "@/lib/api";

export default function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await adminLogin(username, password);
      nav("/admin/dashboard");
    } catch {
      setError("Invalid username or password.");
    } finally {
      setLoading(false);
    }
  };

  const INPUT: React.CSSProperties = {
    width: "100%", padding: "0.7rem 0.875rem", fontSize: "0.875rem",
    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "10px", color: "rgba(255,255,255,0.85)", outline: "none", fontFamily: "inherit",
  };

  return (
    <div style={{ minHeight: "100vh", background: "#050810", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none" }}>
        <div style={{ position: "absolute", top: "30%", left: "40%", width: "400px", height: "400px", background: "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)", borderRadius: "50%" }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          width: "100%", maxWidth: "400px", padding: "2.5rem",
          borderRadius: "20px", background: "rgba(255,255,255,0.025)",
          border: "1px solid rgba(255,255,255,0.07)", backdropFilter: "blur(16px)",
          boxShadow: "0 0 80px rgba(99,102,241,0.08)", zIndex: 1,
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg,#6366f1,#38bdf8)", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: "1rem" }}>
            <Shield style={{ width: 20, height: 20, color: "white" }} />
          </div>
          <h1 style={{ fontSize: "1.3rem", fontWeight: 700, color: "rgba(255,255,255,0.9)", marginBottom: "0.3rem" }}>Admin Login</h1>
          <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.35)" }}>AvanGuard Security Dashboard</p>
        </div>

        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: "0.4rem" }}>Username</label>
            <input value={username} onChange={(e) => setUsername(e.target.value)} style={INPUT} placeholder="admin" autoFocus />
          </div>
          <div>
            <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: "0.4rem" }}>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={INPUT} placeholder="••••••••" />
          </div>

          {error && <div style={{ fontSize: "0.8rem", color: "#ef4444", textAlign: "center" }}>{error}</div>}

          <button type="submit" disabled={loading} style={{
            width: "100%", padding: "0.75rem", borderRadius: "10px", border: "none",
            fontSize: "0.875rem", fontWeight: 700, cursor: "pointer",
            background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "white",
            fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
            boxShadow: "0 4px 20px rgba(99,102,241,0.35)", opacity: loading ? 0.7 : 1,
          }}>
            {loading ? <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} /> : <LogIn style={{ width: 16, height: 16 }} />}
            Sign In
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: "1.5rem" }}>
          <Link to="/" style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.3)", textDecoration: "none" }}>← Back to Portal</Link>
        </div>
      </motion.div>

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}
