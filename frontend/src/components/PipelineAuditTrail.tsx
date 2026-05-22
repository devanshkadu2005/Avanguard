import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert, EyeOff, Brain, FileCheck2, Scale, Gavel, ChevronDown, ChevronRight, RotateCcw } from "lucide-react";
import type { PipelineLog } from "@/lib/api";

const STEP_ICONS: Record<string, React.ReactNode> = {
  injection: <ShieldAlert style={{ width: 14, height: 14 }} />,
  pii: <EyeOff style={{ width: 14, height: 14 }} />,
  llm: <Brain style={{ width: 14, height: 14 }} />,
  retry_llm: <RotateCcw style={{ width: 14, height: 14 }} />,
  schema: <FileCheck2 style={{ width: 14, height: 14 }} />,
  rules: <Scale style={{ width: 14, height: 14 }} />,
  content_safety: <FileCheck2 style={{ width: 14, height: 14 }} />,
  content_rules: <Scale style={{ width: 14, height: 14 }} />,
  decision: <Gavel style={{ width: 14, height: 14 }} />,
};

const STEP_LABELS: Record<string, string> = {
  injection: "Injection Check",
  pii: "PII Redaction",
  llm: "LLM Analysis",
  retry_llm: "LLM Retry",
  schema: "Output Safety",
  rules: "Content Rules",
  content_safety: "Output Safety",
  content_rules: "Content Rules",
  decision: "Final Decision",
};

const STATUS_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  pass: { bg: "rgba(16,185,129,0.12)", color: "#10b981", border: "rgba(16,185,129,0.3)" },
  fail: { bg: "rgba(239,68,68,0.12)", color: "#ef4444", border: "rgba(239,68,68,0.3)" },
  flag: { bg: "rgba(245,158,11,0.12)", color: "#f59e0b", border: "rgba(245,158,11,0.3)" },
  skip: { bg: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.3)", border: "rgba(255,255,255,0.08)" },
  retry: { bg: "rgba(245,158,11,0.12)", color: "#f59e0b", border: "rgba(245,158,11,0.3)" },
  review: { bg: "rgba(245,158,11,0.12)", color: "#f59e0b", border: "rgba(245,158,11,0.3)" },
  warning: { bg: "rgba(245,158,11,0.12)", color: "#f59e0b", border: "rgba(245,158,11,0.3)" },
};

function StepRow({ log }: { log: PipelineLog }) {
  const [expanded, setExpanded] = useState(false);
  const sc = STATUS_COLORS[log.status] ?? STATUS_COLORS.skip;
  const icon = STEP_ICONS[log.step_name] ?? <Gavel style={{ width: 14, height: 14 }} />;
  const label = STEP_LABELS[log.step_name] ?? log.step_name;

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: "0.75rem",
          padding: "0.65rem 0.875rem", background: "transparent", border: "none",
          cursor: "pointer", textAlign: "left", color: "rgba(255,255,255,0.6)",
          fontSize: "0.8rem", transition: "background 0.15s",
          borderBottom: "1px solid rgba(255,255,255,0.04)",
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}
        onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
      >
        {/* Timeline dot */}
        <div style={{
          width: "8px", height: "8px", borderRadius: "50%",
          background: sc.color, flexShrink: 0,
          boxShadow: `0 0 6px ${sc.color}`,
        }} />
        <span style={{ color: "rgba(255,255,255,0.4)" }}>{icon}</span>
        <span style={{ fontWeight: 600, color: "rgba(255,255,255,0.7)", minWidth: "120px" }}>{label}</span>
        <span style={{
          padding: "0.15rem 0.5rem", borderRadius: "4px", fontSize: "0.68rem",
          fontWeight: 700, textTransform: "uppercase",
          background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`,
        }}>
          {log.status}
        </span>
        {log.duration_ms > 0 && (
          <span style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.25)", fontFamily: "'JetBrains Mono', monospace" }}>
            {log.duration_ms}ms
          </span>
        )}
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "rgba(255,255,255,0.35)", fontSize: "0.75rem" }}>
          {log.output_text?.slice(0, 60)}
        </span>
        <span style={{ color: "rgba(255,255,255,0.25)", flexShrink: 0 }}>
          {expanded ? <ChevronDown style={{ width: 12, height: 12 }} /> : <ChevronRight style={{ width: 12, height: 12 }} />}
        </span>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ overflow: "hidden", background: "rgba(255,255,255,0.015)", padding: "0 0.875rem" }}
          >
            <div style={{ padding: "0.75rem 0 0.75rem 2rem", fontSize: "0.75rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {log.input_text && (
                <div>
                  <span style={{ color: "rgba(255,255,255,0.3)", fontWeight: 600 }}>Input: </span>
                  <span style={{ color: "rgba(255,255,255,0.5)", fontFamily: "'JetBrains Mono', monospace", fontSize: "0.7rem" }}>
                    {log.input_text.slice(0, 300)}{log.input_text.length > 300 ? "…" : ""}
                  </span>
                </div>
              )}
              {log.output_text && (
                <div>
                  <span style={{ color: "rgba(255,255,255,0.3)", fontWeight: 600 }}>Output: </span>
                  <span style={{ color: "rgba(255,255,255,0.5)", fontFamily: "'JetBrains Mono', monospace", fontSize: "0.7rem" }}>
                    {log.output_text.slice(0, 300)}{log.output_text.length > 300 ? "…" : ""}
                  </span>
                </div>
              )}
              {log.details && Object.keys(log.details).length > 0 && (
                <div>
                  <span style={{ color: "rgba(255,255,255,0.3)", fontWeight: 600 }}>Details: </span>
                  <span style={{ color: "rgba(255,255,255,0.4)", fontFamily: "'JetBrains Mono', monospace", fontSize: "0.68rem" }}>
                    {JSON.stringify(log.details, null, 2)}
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function PipelineAuditTrail({ logs }: { logs: PipelineLog[] }) {
  if (!logs || logs.length === 0) return <div style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.8rem", padding: "1rem" }}>No pipeline data.</div>;

  return (
    <div style={{
      borderRadius: "12px", overflow: "hidden",
      border: "1px solid rgba(99,102,241,0.15)",
      background: "linear-gradient(180deg, rgba(99,102,241,0.04), rgba(56,189,248,0.02))",
    }}>
      <div style={{
        padding: "0.65rem 0.875rem", fontSize: "0.7rem", fontWeight: 700,
        letterSpacing: "0.1em", textTransform: "uppercase",
        color: "rgba(99,102,241,0.7)", borderBottom: "1px solid rgba(99,102,241,0.1)",
        display: "flex", alignItems: "center", gap: "0.5rem",
      }}>
        <Gavel style={{ width: 12, height: 12 }} /> Pipeline Audit Trail
      </div>
      {logs.map((log, i) => (
        <motion.div
          key={log.id || i}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
        >
          <StepRow log={log} />
        </motion.div>
      ))}
    </div>
  );
}
