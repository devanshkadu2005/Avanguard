import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldAlert, Database, ArrowLeft, Plus, X, Save, Trash2 } from "lucide-react";
import { getAdminRules, createAdminRule, deleteAdminRule, updateAdminRule, getAdminInjectionRules, Rule, InjectionRule } from "@/lib/api";

export default function AdminRules() {
  const [activeTab, setActiveTab] = useState<"content" | "injection">("content");
  const [contentRules, setContentRules] = useState<Rule[]>([]);
  const [injectionRules, setInjectionRules] = useState<InjectionRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newRule, setNewRule] = useState({ rule_name: "", value: "", description: "" });
  const nav = useNavigate();

  const loadData = async () => {
    try {
      const [c, i] = await Promise.all([getAdminRules(), getAdminInjectionRules()]);
      setContentRules(c);
      setInjectionRules(i);
    } catch {
      nav("/admin/login");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [nav]);

  const handleUpdateContentRule = async (name: string, val: string) => {
    await updateAdminRule(name, val);
    loadData();
  };

  const handleAddRule = async () => {
    if (!newRule.rule_name || !newRule.value) return;
    await createAdminRule(newRule.rule_name, newRule.value, newRule.description);
    setNewRule({ rule_name: "", value: "", description: "" });
    setShowAdd(false);
    loadData();
  };

  const handleDeleteRule = async (name: string) => {
    if (!confirm(`Delete rule ${name}?`)) return;
    await deleteAdminRule(name);
    loadData();
  };

  if (loading) return <div style={{ minHeight: "100vh", background: "#050810", color: "white", display: "flex", alignItems: "center", justifyContent: "center" }}>Loading...</div>;

  const TAB_STYLE = (active: boolean): React.CSSProperties => ({
    padding: "0.75rem 1.5rem", background: active ? "rgba(99,102,241,0.1)" : "transparent",
    borderBottom: active ? "2px solid #6366f1" : "2px solid transparent",
    color: active ? "white" : "rgba(255,255,255,0.5)", fontWeight: 600, cursor: "pointer",
    display: "flex", alignItems: "center", gap: "0.5rem", transition: "all 0.2s"
  });

  return (
    <div style={{ minHeight: "100vh", background: "#050810", color: "white", padding: "2rem" }}>
      <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
        <button onClick={() => nav("/admin/dashboard")} style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "2rem" }}>
          <ArrowLeft size={16} /> Back to Dashboard
        </button>

        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "2rem" }}>System Rules & Policies</h1>

        <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.1)", marginBottom: "2rem" }}>
          <button style={TAB_STYLE(activeTab === "content")} onClick={() => setActiveTab("content")}>
            <Database size={16} /> Content Rules
          </button>
          <button style={TAB_STYLE(activeTab === "injection")} onClick={() => setActiveTab("injection")}>
            <ShieldAlert size={16} /> Injection Patterns
          </button>
        </div>

        {activeTab === "content" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h2 style={{ fontSize: "1.2rem", fontWeight: 600 }}>Content Policies</h2>
              <button onClick={() => setShowAdd(true)} style={{ padding: "0.5rem 1rem", borderRadius: "8px", background: "#6366f1", color: "white", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Plus size={16} /> Add Rule
              </button>
            </div>

            {showAdd && (
              <div style={{ padding: "1.5rem", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(99,102,241,0.3)", borderRadius: "12px", marginBottom: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <h3 style={{ margin: 0, fontSize: "1rem" }}>New Content Rule</h3>
                  <button onClick={() => setShowAdd(false)} style={{ background: "transparent", border: "none", color: "white", cursor: "pointer" }}><X size={16}/></button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "1rem" }}>
                  <input placeholder="Rule Name (e.g. block:competitors)" value={newRule.rule_name} onChange={e => setNewRule({...newRule, rule_name: e.target.value})} style={{ padding: "0.75rem", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", color: "white", borderRadius: "8px" }} />
                  <input placeholder="Description" value={newRule.description} onChange={e => setNewRule({...newRule, description: e.target.value})} style={{ padding: "0.75rem", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", color: "white", borderRadius: "8px" }} />
                </div>
                <textarea placeholder="Value (e.g. comma separated list of words, or number)" value={newRule.value} onChange={e => setNewRule({...newRule, value: e.target.value})} rows={3} style={{ padding: "0.75rem", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", color: "white", borderRadius: "8px", fontFamily: "JetBrains Mono", resize: "vertical" }} />
                <button onClick={handleAddRule} style={{ padding: "0.75rem", background: "#6366f1", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: 600, width: "120px" }}>Save Rule</button>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {contentRules.map(r => (
                <div key={r.id} style={{ padding: "1.5rem", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "1.1rem", marginBottom: "0.2rem", color: "#38bdf8" }}>{r.rule_name}</div>
                      <div style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.5)" }}>{r.description}</div>
                    </div>
                    <button onClick={() => handleDeleteRule(r.rule_name)} style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", padding: "0.5rem", borderRadius: "8px", cursor: "pointer", height: "fit-content" }}><Trash2 size={16} /></button>
                  </div>
                  <div style={{ display: "flex", gap: "1rem" }}>
                    <textarea 
                      defaultValue={r.value}
                      onBlur={(e) => { if(e.target.value !== r.value) handleUpdateContentRule(r.rule_name, e.target.value); }}
                      style={{ flex: 1, padding: "0.75rem", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", color: "white", borderRadius: "8px", fontFamily: "JetBrains Mono", resize: "vertical", minHeight: "60px" }}
                    />
                    <div style={{ display: "flex", alignItems: "center", color: "rgba(255,255,255,0.3)", fontSize: "0.8rem" }}>
                      <Save size={14} style={{ marginRight: "0.3rem" }} /> Auto-saves on blur
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "injection" && (
          <div>
            <h2 style={{ fontSize: "1.2rem", fontWeight: 600, marginBottom: "1rem" }}>Known Injection Patterns</h2>
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "12px", overflow: "hidden" }}>
              {injectionRules.map((r, i) => (
                <div key={r.id} style={{ padding: "1rem 1.5rem", borderBottom: i === injectionRules.length-1 ? "none" : "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <code style={{ color: "#ef4444", fontSize: "0.85rem" }}>{r.pattern}</code>
                  <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.3)", textTransform: "uppercase" }}>{r.source}</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
