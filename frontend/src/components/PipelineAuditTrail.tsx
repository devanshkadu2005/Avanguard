import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, ChevronDown, ChevronRight, CheckCircle2, XCircle } from "lucide-react";
import type { PipelineLog } from "@/lib/api";

const STEP_LABELS: Record<string, string> = {
  injection: "Injection Check",
  pii: "PII Redaction",
  llm: "LLM Analysis",
  retry_llm: "LLM Retry",
  schema: "Output Safety",
  rules: "Content Rules",
  content_safety: "Output Safety",
  content_rules: "Content Policies",
  decision: "Final Decision",
};

export default function PipelineAuditTrail({ logs }: { logs: PipelineLog[] }) {
  if (!logs || logs.length === 0) return null;

  const passed = logs.filter(l => l.status === "pass").length;
  const failed = logs.filter(l => l.status === "fail" || l.status === "flag").length;
  
  // Overall status based on logs
  const isFailed = failed > 0;
  
  // Auto-expand if failed
  const [expanded, setExpanded] = useState(isFailed);

  return (
    <div style={{ marginBottom: "0.75rem", maxWidth: "400px" }}>
      <button 
        onClick={() => setExpanded(!expanded)}
        style={{
          display: "flex", alignItems: "center", gap: "0.5rem",
          background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
          padding: "0.4rem 0.75rem", borderRadius: "16px", cursor: "pointer",
          color: "rgba(255,255,255,0.7)", fontSize: "0.75rem", fontWeight: 600,
          transition: "background 0.2s"
        }}
        onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
        onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}
      >
        <Brain size={14} style={{ color: isFailed ? "#ef4444" : "#a5b4fc" }} />
        {isFailed ? "Security Checks Failed" : "AI Thinking Process"}
        <span style={{ color: "rgba(255,255,255,0.3)" }}>
          ({passed} passed{failed > 0 ? `, ${failed} failed` : ""})
        </span>
        {expanded ? <ChevronDown size={14} style={{ marginLeft: "auto" }} /> : <ChevronRight size={14} style={{ marginLeft: "auto" }} />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }} 
            animate={{ height: "auto", opacity: 1 }} 
            exit={{ height: 0, opacity: 0 }}
            style={{ overflow: "hidden" }}
          >
            <div style={{ 
              marginTop: "0.5rem", background: "rgba(0,0,0,0.2)", 
              border: "1px solid rgba(255,255,255,0.05)", borderRadius: "12px",
              padding: "0.5rem"
            }}>
              {logs.map((log, i) => (
                <div key={log.id || i} style={{ 
                  padding: "0.4rem 0.5rem", fontSize: "0.75rem",
                  borderBottom: i < logs.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    {log.status === "pass" ? (
                      <CheckCircle2 size={14} color="#10b981" style={{ flexShrink: 0 }} />
                    ) : log.status === "fail" || log.status === "flag" ? (
                      <XCircle size={14} color="#ef4444" style={{ flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.2)", flexShrink: 0 }} />
                    )}
                    
                    <span style={{ color: "rgba(255,255,255,0.8)", fontWeight: 500, width: "100px", flexShrink: 0 }}>
                      {STEP_LABELS[log.step_name] || log.step_name}
                    </span>
                    
                    <span style={{ color: "rgba(255,255,255,0.4)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                      {log.output_text || log.status.toUpperCase()}
                    </span>
                  </div>

                  {log.details?.thinking && (
                    <div style={{ 
                      marginTop: "0.4rem", marginLeft: "1.4rem", padding: "0.5rem 0.75rem", 
                      background: "rgba(255,255,255,0.02)", borderRadius: "6px", 
                      fontStyle: "italic", fontSize: "0.7rem", color: "rgba(255,255,255,0.5)",
                      borderLeft: "2px solid rgba(255,255,255,0.1)"
                    }}>
                      {log.details.thinking}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
