import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Plus, MessageSquare, Loader2, Menu, LogIn, LayoutDashboard } from "lucide-react";
import { PromptInputBox } from "@/components/ui/ai-prompt-box";
import PipelineAuditTrail from "@/components/PipelineAuditTrail";
import { sendMessage, getConversations, getConversation, createConversation, Conversation, Message, PipelineLog } from "@/lib/api";

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [logs, setLogs] = useState<Record<string, PipelineLog[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedAudit, setExpandedAudit] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const nav = useNavigate();

  const loadConversations = async () => {
    try {
      const convs = await getConversations();
      setConversations(convs);
      if (convs.length > 0 && !activeConvId) {
        // Option to load first conv, but typically better to start fresh
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (activeConvId) {
      loadConversationData(activeConvId);
    } else {
      setMessages([]);
      setLogs({});
    }
  }, [activeConvId]);

  const loadConversationData = async (id: string) => {
    setIsLoading(true);
    try {
      const data = await getConversation(id);
      setMessages(data.messages);
      
      const newLogs: Record<string, PipelineLog[]> = {};
      data.pipeline_logs.forEach(log => {
        if (!newLogs[log.message_id]) newLogs[log.message_id] = [];
        newLogs[log.message_id].push(log);
      });
      setLogs(newLogs);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
      scrollToBottom();
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleNewChat = () => {
    setActiveConvId(null);
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim() && text.indexOf("[Search:") === -1 && text.indexOf("[Think:") === -1 && text.indexOf("[Canvas:") === -1) return;
    
    setIsLoading(true);
    const tempId = `temp-${Date.now()}`;
    const newMsg: Message = {
      id: tempId,
      conversation_id: activeConvId || "",
      role: "user",
      content: text,
      created_at: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, newMsg]);
    scrollToBottom();

    try {
      const res = await sendMessage(text, activeConvId || undefined);
      
      if (!activeConvId) {
        setActiveConvId(res.conversation_id);
        loadConversations();
      }

      setMessages(prev => {
        const withoutTemp = prev.filter(m => m.id !== tempId);
        // In a real app we'd fetch the exact user message from DB or use the one returned
        return [...withoutTemp, 
          {...newMsg, id: `user-${res.message_id}`, conversation_id: res.conversation_id},
          {
            id: res.message_id,
            conversation_id: res.conversation_id,
            role: "assistant",
            content: res.response,
            verdict: res.verdict,
            pipeline_steps: res.steps,
            token_count: res.token_count,
            created_at: new Date().toISOString()
          }
        ];
      });

      setLogs(prev => ({
        ...prev,
        [res.message_id]: res.pipeline_logs
      }));

    } catch (e) {
      console.error(e);
      setMessages(prev => [...prev, {
        id: `err-${Date.now()}`,
        conversation_id: activeConvId || "",
        role: "assistant",
        content: "Sorry, I encountered an error connecting to the server.",
        created_at: new Date().toISOString(),
        verdict: "FAIL"
      }]);
    } finally {
      setIsLoading(false);
      scrollToBottom();
    }
  };

  const toggleAudit = (msgId: string) => {
    setExpandedAudit(prev => {
      const next = new Set(prev);
      if (next.has(msgId)) next.delete(msgId);
      else next.add(msgId);
      return next;
    });
  };

  const getVerdictStyle = (verdict?: string) => {
    switch(verdict) {
      case "PASS": return { color: "#10b981", bg: "rgba(16,185,129,0.15)", border: "rgba(16,185,129,0.3)" };
      case "FAIL": return { color: "#ef4444", bg: "rgba(239,68,68,0.15)", border: "rgba(239,68,68,0.3)" };
      case "REVIEW":
      case "WARNING": return { color: "#f59e0b", bg: "rgba(245,158,11,0.15)", border: "rgba(245,158,11,0.3)" };
      default: return { color: "rgba(255,255,255,0.4)", bg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.1)" };
    }
  };

  return (
    <div style={{ display: "flex", height: "100vh", background: "#050810", color: "white", overflow: "hidden", fontFamily: "'Inter', sans-serif" }}>
      
      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            style={{ 
              background: "rgba(255,255,255,0.02)", borderRight: "1px solid rgba(255,255,255,0.05)",
              display: "flex", flexDirection: "column", zIndex: 10
            }}
          >
            <div style={{ padding: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg,#6366f1,#38bdf8)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Shield size={16} color="white" />
              </div>
              <span style={{ fontWeight: 700, fontSize: "1.2rem", letterSpacing: "-0.5px" }}>AvanGuard</span>
            </div>

            <div style={{ padding: "0 1rem" }}>
              <button 
                onClick={handleNewChat}
                style={{ 
                  width: "100%", padding: "0.75rem", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.05)", color: "white", display: "flex", alignItems: "center", gap: "0.5rem",
                  cursor: "pointer", transition: "all 0.2s", fontWeight: 600, fontSize: "0.9rem"
                }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
                onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
              >
                <Plus size={18} /> New Chat
              </button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }} className="scrollbar-thin">
              <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 700, paddingLeft: "0.5rem", marginBottom: "0.5rem" }}>Recent</div>
              
              {conversations.map(c => (
                <button
                  key={c.id}
                  onClick={() => { setActiveConvId(c.id); if(window.innerWidth < 768) setSidebarOpen(false); }}
                  style={{
                    width: "100%", textAlign: "left", padding: "0.75rem 1rem", borderRadius: "8px", border: "none",
                    background: activeConvId === c.id ? "rgba(99,102,241,0.15)" : "transparent",
                    color: activeConvId === c.id ? "#fff" : "rgba(255,255,255,0.7)",
                    cursor: "pointer", display: "flex", alignItems: "center", gap: "0.75rem",
                    transition: "all 0.2s"
                  }}
                  onMouseEnter={e => { if(activeConvId !== c.id) e.currentTarget.style.background = "rgba(255,255,255,0.05)" }}
                  onMouseLeave={e => { if(activeConvId !== c.id) e.currentTarget.style.background = "transparent" }}
                >
                  <MessageSquare size={16} style={{ color: activeConvId === c.id ? "#6366f1" : "inherit" }} />
                  <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontSize: "0.85rem", fontWeight: activeConvId === c.id ? 600 : 400 }}>
                    {c.title || "New Chat"}
                  </span>
                </button>
              ))}
            </div>

            <div style={{ padding: "1rem", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
              <Link to="/admin/login" style={{ textDecoration: "none", color: "rgba(255,255,255,0.5)", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem" }}>
                <LayoutDashboard size={14} /> Admin Dashboard
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative" }}>
        
        {/* Header */}
        <header style={{ padding: "1rem", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", gap: "1rem", background: "rgba(5,8,16,0.8)", backdropFilter: "blur(12px)", position: "sticky", top: 0, zIndex: 5 }}>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: "transparent", border: "none", color: "white", cursor: "pointer", padding: "0.5rem" }}>
            <Menu size={20} />
          </button>
          {!sidebarOpen && (
            <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>AvanGuard</div>
          )}
        </header>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "2rem 1rem" }} className="scrollbar-thin">
          <div style={{ maxWidth: "800px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            
            {!activeConvId && messages.length === 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: "center", marginTop: "10vh" }}>
                <div style={{ width: 64, height: 64, borderRadius: 16, background: "linear-gradient(135deg,#6366f1,#38bdf8)", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: "1.5rem", boxShadow: "0 8px 32px rgba(99,102,241,0.3)" }}>
                  <Shield size={32} color="white" />
                </div>
                <h2 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "0.5rem" }}>How can I help you today?</h2>
                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "1rem" }}>Your messages are protected by AvanGuard's 6-step security pipeline.</p>
              </motion.div>
            )}

            {messages.map((msg, i) => (
              <motion.div key={msg.id || i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                {msg.role === "user" ? (
                  <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "0.5rem" }}>
                    <div style={{ 
                      background: "linear-gradient(135deg, #4f46e5, #6366f1)", padding: "1rem 1.2rem",
                      borderRadius: "20px 20px 4px 20px", maxWidth: "80%", fontSize: "0.95rem", lineHeight: 1.5,
                      boxShadow: "0 4px 20px rgba(99,102,241,0.2)"
                    }}>
                      {msg.content}
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem", maxWidth: "90%" }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "0.2rem" }}>
                      <Shield size={16} color="white" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ 
                        background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)",
                        padding: "1.2rem", borderRadius: "8px 20px 20px 20px", fontSize: "0.95rem", lineHeight: 1.6,
                        color: "rgba(255,255,255,0.9)", marginBottom: "0.5rem"
                      }}>
                        {msg.content}
                      </div>

                      {/* Security Badge */}
                      {msg.verdict && (
                        <div>
                          <button 
                            onClick={() => toggleAudit(msg.id)}
                            style={{ 
                              background: getVerdictStyle(msg.verdict).bg,
                              border: `1px solid ${getVerdictStyle(msg.verdict).border}`,
                              color: getVerdictStyle(msg.verdict).color,
                              padding: "0.25rem 0.75rem", borderRadius: "16px",
                              fontSize: "0.75rem", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "0.4rem",
                              cursor: "pointer", transition: "all 0.2s"
                            }}
                          >
                            <Shield size={12} />
                            {msg.verdict} CHECK
                          </button>
                          
                          {/* Pipeline Audit Expandable */}
                          <AnimatePresence>
                            {expandedAudit.has(msg.id) && logs[msg.id] && (
                              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} style={{ overflow: "hidden", marginTop: "0.5rem" }}>
                                <PipelineAuditTrail logs={logs[msg.id]} />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            ))}

            {isLoading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", gap: "1rem", maxWidth: "90%" }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Shield size={16} color="white" />
                </div>
                <div style={{ 
                  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)",
                  padding: "1rem 1.2rem", borderRadius: "8px 20px 20px 20px",
                  display: "flex", alignItems: "center", gap: "4px"
                }}>
                  <div className="typing-dot" style={{ width: 6, height: 6, borderRadius: "50%", background: "white" }} />
                  <div className="typing-dot" style={{ width: 6, height: 6, borderRadius: "50%", background: "white" }} />
                  <div className="typing-dot" style={{ width: 6, height: 6, borderRadius: "50%", background: "white" }} />
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div style={{ padding: "0 1rem 2rem 1rem", background: "linear-gradient(to top, #050810 80%, transparent)" }}>
          <div style={{ maxWidth: "800px", margin: "0 auto" }}>
            <PromptInputBox 
              onSend={(msg) => handleSendMessage(msg)}
              isLoading={isLoading}
              placeholder="Message AvanGuard..."
            />
            <div style={{ textAlign: "center", marginTop: "0.75rem", fontSize: "0.7rem", color: "rgba(255,255,255,0.3)" }}>
              Secured by AvanGuard Enterprise AI Security Pipeline.
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
