import { CheckCircle2, XCircle } from "lucide-react";
import type { PipelineLog } from "@/lib/api";

const STEP_LABELS: Record<string, string> = {
  injection: "Injection",
  pii: "PII",
  llm: "LLM",
  retry_llm: "Retry",
  schema: "Schema",
  rules: "Rules",
  content_safety: "Safety",
  content_rules: "Policies",
  decision: "Decision",
};

export default function PipelineAuditTrail({ logs }: { logs: PipelineLog[] }) {
  if (!logs || logs.length === 0) return null;

  const passed = logs.filter(l => l.status === "pass").map(l => STEP_LABELS[l.step_name] || l.step_name);
  const failed = logs.filter(l => l.status === "fail" || l.status === "flag").map(l => STEP_LABELS[l.step_name] || l.step_name);

  return (
    <div style={{
      fontSize: "0.75rem", color: "rgba(255,255,255,0.5)", marginTop: "0.5rem",
      display: "flex", gap: "1rem", flexWrap: "wrap",
      background: "rgba(255,255,255,0.02)", padding: "0.6rem 0.8rem", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.05)"
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
        <span style={{ fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>Security Checks:</span>
      </div>
      
      {passed.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", color: "#10b981" }}>
          <CheckCircle2 size={14} /> <span style={{ color: "rgba(255,255,255,0.5)" }}>Passed: {passed.join(", ")}</span>
        </div>
      )}
      
      {failed.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", color: "#ef4444" }}>
          <XCircle size={14} /> <span style={{ color: "rgba(255,255,255,0.8)", fontWeight: 500 }}>Failed: {failed.join(", ")}</span>
        </div>
      )}
    </div>
  );
}
