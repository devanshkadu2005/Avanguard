import { motion } from "framer-motion";
import { Shield, ShieldCheck, Eye, Brain, Scale, Zap, ArrowRight, Lock, BarChart3, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";

const FEATURES = [
  { icon: ShieldCheck, title: "Prompt Injection Detection", desc: "Two-tier defense: self-healing regex library + AI judge that learns from every attack", color: "#ef4444" },
  { icon: Eye, title: "PII Redaction", desc: "Automatically detects and redacts emails, phone numbers, and sensitive data before LLM processing", color: "#f59e0b" },
  { icon: Brain, title: "LLM Analysis", desc: "LLM evaluates requests with detailed reasoning and confidence scores — not blind approval", color: "#6366f1" },
  { icon: Scale, title: "Content Policy Enforcement", desc: "Cross-references admin-defined content policies to enforce topic limits and compliance", color: "#38bdf8" },
  { icon: BarChart3, title: "Full Audit Trail", desc: "Every decision from input to output is logged with timing, I/O data, and step-level details", color: "#10b981" },
  { icon: RefreshCw, title: "Self-Healing Pipeline", desc: "Failed validations trigger automatic retries with corrective prompts before final verdict", color: "#8b5cf6" },
];

const PIPELINE_STEPS = [
  { step: "01", label: "Injection Check", desc: "Regex + AI judge scan user input", color: "#ef4444" },
  { step: "02", label: "PII Redaction", desc: "Detect & mask sensitive data", color: "#f59e0b" },
  { step: "03", label: "LLM Analysis", desc: "AI generates secured response", color: "#6366f1" },
  { step: "04", label: "Output Safety", desc: "Content safety scan", color: "#38bdf8" },
  { step: "05", label: "Content Rules", desc: "Admin policy check", color: "#10b981" },
  { step: "06", label: "Decision", desc: "PASS / FAIL / REVIEW", color: "#8b5cf6" },
];

export default function LandingPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#050810", color: "#e2e8f0", overflow: "auto" }}>
      {/* Ambient glows */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <div style={{ position: "absolute", top: "-15%", left: "30%", width: "600px", height: "600px", background: "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)", borderRadius: "50%" }} />
        <div style={{ position: "absolute", top: "50%", right: "10%", width: "500px", height: "500px", background: "radial-gradient(circle, rgba(56,189,248,0.08) 0%, transparent 70%)", borderRadius: "50%" }} />
        <div style={{ position: "absolute", bottom: "-10%", left: "10%", width: "400px", height: "400px", background: "radial-gradient(circle, rgba(139,92,246,0.07) 0%, transparent 70%)", borderRadius: "50%" }} />
      </div>

      {/* Header */}
      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 2.5rem", height: "60px",
        background: "rgba(5,8,16,0.6)", backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.05)", position: "sticky", top: 0, zIndex: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: "linear-gradient(135deg,#6366f1,#38bdf8)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Shield style={{ width: 16, height: 16, color: "white" }} />
          </div>
          <span style={{ fontSize: "1.2rem", fontWeight: 700, background: "linear-gradient(135deg,#a5b4fc,#38bdf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>AvanGuard</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
          <Link to="/chat" style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.45)", textDecoration: "none", fontWeight: 500 }}>Start Chat</Link>
          <Link to="/admin/login" style={{
            fontSize: "0.85rem", padding: "0.4rem 1rem", borderRadius: "8px",
            background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)",
            color: "#a5b4fc", textDecoration: "none", fontWeight: 600,
          }}>Admin Login</Link>
        </div>
      </header>

      {/* Hero */}
      <section style={{ position: "relative", zIndex: 1, maxWidth: "900px", margin: "0 auto", padding: "6rem 2rem 4rem", textAlign: "center" }}>
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0.3rem 1rem",
            borderRadius: "99px", background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)",
            fontSize: "0.75rem", fontWeight: 600, color: "#a5b4fc", marginBottom: "1.5rem",
          }}>
            <Lock style={{ width: 12, height: 12 }} /> AI Security & Governance Middleware
          </div>
          <h1 style={{
            fontSize: "3.2rem", fontWeight: 800, lineHeight: 1.15, marginBottom: "1.25rem",
            background: "linear-gradient(135deg, #ffffff, #a5b4fc 50%, #38bdf8)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>
            Don't Trust the AI.<br />Verify It.
          </h1>
          <p style={{ fontSize: "1.1rem", color: "rgba(255,255,255,0.4)", maxWidth: "600px", margin: "0 auto 2.5rem", lineHeight: 1.6 }}>
            AvanGuard sits between your users and your LLM. It validates inputs, reasons about decisions, enforces policy, and logs everything — before responses reach end users.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: "1rem" }}>
            <Link to="/chat" style={{
              display: "inline-flex", alignItems: "center", gap: "0.5rem",
              padding: "1rem 2rem", borderRadius: "50px", textDecoration: "none",
              background: "linear-gradient(135deg, #6366f1, #4f46e5)",
              color: "white", fontWeight: 700, fontSize: "1rem",
              boxShadow: "0 0 40px rgba(99,102,241,0.4)",
            }}>
              Start Chatting Securely <ArrowRight style={{ width: 18, height: 18 }} />
            </Link>
            <Link to="/admin/login" style={{
              display: "inline-flex", alignItems: "center", gap: "0.5rem",
              padding: "0.75rem 1.75rem", borderRadius: "10px", textDecoration: "none",
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)",
              color: "rgba(255,255,255,0.7)", fontWeight: 600, fontSize: "0.95rem", fontFamily: "inherit",
            }}>
              Admin Dashboard
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Pipeline visualization */}
      <section style={{ position: "relative", zIndex: 1, maxWidth: "900px", margin: "0 auto", padding: "2rem 2rem 4rem" }}>
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 700, color: "rgba(255,255,255,0.85)", marginBottom: "0.5rem" }}>6-Step Validation Pipeline</h2>
            <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.35)" }}>Every request passes through six verification stages before reaching the end user</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "0.5rem" }}>
            {PIPELINE_STEPS.map((s, i) => (
              <motion.div
                key={s.step}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                style={{
                  padding: "1rem 0.75rem", borderRadius: "12px", textAlign: "center",
                  background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
                  position: "relative",
                }}
              >
                <div style={{ fontSize: "0.65rem", fontWeight: 700, color: s.color, letterSpacing: "0.1em", marginBottom: "0.4rem" }}>{s.step}</div>
                <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "rgba(255,255,255,0.7)", marginBottom: "0.3rem" }}>{s.label}</div>
                <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.3)" }}>{s.desc}</div>
                <div style={{ position: "absolute", top: "50%", right: "-8px", width: "12px", height: "2px", background: "rgba(255,255,255,0.1)", display: i < 5 ? "block" : "none" }} />
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section style={{ position: "relative", zIndex: 1, maxWidth: "900px", margin: "0 auto", padding: "2rem 2rem 5rem" }}>
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 700, color: "rgba(255,255,255,0.85)", marginBottom: "0.5rem" }}>Why AvanGuard</h2>
            <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.35)" }}>Enterprise-grade security for LLM-powered applications</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  style={{
                    padding: "1.5rem", borderRadius: "14px",
                    background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
                    transition: "border-color 0.2s",
                  }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: `${f.color}15`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "0.875rem" }}>
                    <Icon style={{ width: 18, height: 18, color: f.color }} />
                  </div>
                  <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "rgba(255,255,255,0.8)", marginBottom: "0.4rem" }}>{f.title}</div>
                  <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.35)", lineHeight: 1.5 }}>{f.desc}</div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer style={{
        padding: "1.5rem 2rem", borderTop: "1px solid rgba(255,255,255,0.05)",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        position: "relative", zIndex: 1, maxWidth: "900px", margin: "0 auto",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.75rem", color: "rgba(255,255,255,0.25)" }}>
          <Shield style={{ width: 12, height: 12 }} /> AvanGuard × AvanSaber
        </div>
        <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.15)" }}>AI Security Middleware — Student Prototype</div>
      </footer>
    </div>
  );
}
