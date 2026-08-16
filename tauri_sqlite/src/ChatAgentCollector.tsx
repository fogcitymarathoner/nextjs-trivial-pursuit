import { useState, useEffect } from "react";
import Database from "@tauri-apps/plugin-sql";

interface ChatAgentCollectorProps {
  db: Database | null;
}

const CHAT_AGENTS = [
  { id: "copilot", label: "Copilot" },
  { id: "openai", label: "OpenAI" },
  { id: "claude", label: "Claude" },
  { id: "gemini", label: "Gemini" },
  { id: "metaai", label: "MetaAI" },
];

interface QuestionItem {
  id: number;
  question: string;
}

interface AgentStats {
  total: number;
  answered: number;
}

export default function ChatAgentCollector({ db }: ChatAgentCollectorProps) {
  const [activeAgent, setActiveAgent] = useState<string>("copilot");
  const [stats, setStats] = useState<Record<string, AgentStats>>({});
  const [nextQuestions, setNextQuestions] = useState<QuestionItem[]>([]);
  const [promptText, setPromptText] = useState<string>("");
  const [pastedText, setPastedText] = useState<string>("");
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Load stats for all agents
  const loadAllStats = async () => {
    if (!db) return;
    try {
      const statsMap: Record<string, AgentStats> = {};
      for (const agent of CHAT_AGENTS) {
        const rows = await db.select<{ total: number; answered: number }[]>(`
          SELECT 
            (SELECT COUNT(*) FROM questions) as total,
            (SELECT COUNT(*) FROM questions q 
             LEFT JOIN questions_and_answers qa ON qa.question_id = q.id 
             WHERE qa.long_descriptive_answer_${agent.id} IS NOT NULL 
               AND qa.long_descriptive_answer_${agent.id} != '') as answered
        `);
        if (rows && rows[0]) {
          statsMap[agent.id] = {
            total: rows[0].total,
            answered: rows[0].answered,
          };
        }
      }
      setStats(statsMap);
    } catch (err) {
      console.error("Error loading stats:", err);
    }
  };

  // Load the next 5 questions for the current active agent
  const loadNextBatch = async () => {
    if (!db) return;
    setLoading(true);
    setStatusMessage(null);
    try {
      const qColumn = `long_descriptive_answer_${activeAgent}`;
      const rows = await db.select<QuestionItem[]>(`
        SELECT 
          q.id,
          q.question
        FROM questions q
        LEFT JOIN questions_and_answers qa ON qa.question_id = q.id
        WHERE qa.${qColumn} IS NULL OR qa.${qColumn} = ''
        ORDER BY q.id
        LIMIT 5
      `);

      setNextQuestions(rows);

      if (rows.length > 0) {
        // Construct JSON template
        const templateArray = rows.map((q) => ({
          id: q.id,
          question: q.question,
          [`long_descriptive_answer_${activeAgent}`]: "",
        }));

        const jsonString = JSON.stringify(templateArray, null, 2);
        const prompt = `Please read the following ${rows.length} questions about US Presidents and provide a detailed, high-quality, long descriptive answer for each (around 2-3 sentences).
Return the answers as a valid JSON array of objects using the exact keys provided, specifically filling in the "long_descriptive_answer_${activeAgent}" field.
Do not modify the ID or question text. Return ONLY the raw JSON block. No explanation, no conversational text before or after the JSON.

${jsonString}`;

        setPromptText(prompt);
      } else {
        setPromptText("");
      }
    } catch (err: any) {
      console.error("Error loading next batch:", err);
      setStatusMessage({ type: "error", text: `Error loading next batch: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  // Reload everything when active agent or DB changes
  useEffect(() => {
    if (db) {
      loadAllStats();
      loadNextBatch();
    }
  }, [db, activeAgent]);

  // Handle copying prompt to clipboard
  const handleCopy = async () => {
    if (!promptText) return;
    try {
      await navigator.clipboard.writeText(promptText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      setStatusMessage({ type: "error", text: "Failed to copy to clipboard." });
    }
  };

  // Clean and parse pasted JSON text
  const extractJson = (text: string): string => {
    let cleaned = text.trim();
    if (cleaned.startsWith("```json")) {
      cleaned = cleaned.substring(7);
    } else if (cleaned.startsWith("```")) {
      cleaned = cleaned.substring(3);
    }
    if (cleaned.endsWith("```")) {
      cleaned = cleaned.substring(0, cleaned.length - 3);
    }
    return cleaned.trim();
  };

  // Handle submitting AI response JSON back to database
  const handleSubmit = async () => {
    if (!db || !pastedText.trim()) return;
    setStatusMessage(null);
    setLoading(true);

    try {
      const cleaned = extractJson(pastedText);
      let parsed: any;
      try {
        parsed = JSON.parse(cleaned);
      } catch (parseErr: any) {
        throw new Error(`JSON parsing failed: ${parseErr.message}. Make sure you copied the valid JSON block from the assistant.`);
      }

      if (!Array.isArray(parsed)) {
        throw new Error("Parsed JSON must be an array of question objects.");
      }

      const keyName = `long_descriptive_answer_${activeAgent}`;
      let updatedCount = 0;

      for (const item of parsed) {
        if (!item.id) {
          throw new Error("One or more questions are missing the 'id' field.");
        }
        const answer = item[keyName];
        if (answer === undefined || answer === null) {
          throw new Error(`Missing expected field '${keyName}' on question with ID ${item.id}.`);
        }

        const answerStr = String(answer).trim();
        if (!answerStr) {
          // If answer is empty, we don't save it as completed
          continue;
        }

        // Check if row already exists in questions_and_answers
        const existing = await db.select<{ question_id: number }[]>(
          "SELECT question_id FROM questions_and_answers WHERE question_id = $1",
          [item.id]
        );

        if (existing.length > 0) {
          await db.execute(
            `UPDATE questions_and_answers SET ${keyName} = $1 WHERE question_id = $2`,
            [answerStr, item.id]
          );
        } else {
          await db.execute(
            `INSERT INTO questions_and_answers (question_id, short_answer_choice, ${keyName}) VALUES ($1, $2, $3)`,
            [item.id, "", answerStr]
          );
        }
        updatedCount++;
      }

      setStatusMessage({
        type: "success",
        text: `Successfully saved ${updatedCount} long answers for ${CHAT_AGENTS.find((a) => a.id === activeAgent)?.label}!`,
      });
      setPastedText("");
      await loadAllStats();
      await loadNextBatch();
    } catch (err: any) {
      console.error(err);
      setStatusMessage({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const activeAgentStats = stats[activeAgent] || { total: 0, answered: 0 };
  const activeAgentRemaining = activeAgentStats.total - activeAgentStats.answered;

  return (
    <div style={{ fontFamily: "Segoe UI, sans-serif", color: "#eee", background: "#0e0e10", minHeight: "100%", padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, borderBottom: "1px solid #222", paddingBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 600 }}>🤖 AI Q&A Data Collector</h2>
        <div style={{ fontSize: 13, color: "#888" }}>
          Connected to: <span style={{ fontFamily: "monospace", color: "#00b4d8" }}>presidents_questions_and_answers.db</span>
        </div>
      </div>

      {/* Agent Selection Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 24 }}>
        {CHAT_AGENTS.map((agent) => {
          const agentStat = stats[agent.id] || { total: 0, answered: 0 };
          const remaining = agentStat.total - agentStat.answered;
          const percent = agentStat.total > 0 ? Math.round((agentStat.answered / agentStat.total) * 100) : 0;
          const isSelected = activeAgent === agent.id;

          return (
            <button
              key={agent.id}
              onClick={() => setActiveAgent(agent.id)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "stretch",
                padding: "12px 16px",
                background: isSelected ? "#1e293b" : "#1a1a1f",
                border: isSelected ? "1px solid #3b82f6" : "1px solid #2d2d34",
                borderRadius: 10,
                color: "#fff",
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.2s ease",
                boxShadow: isSelected ? "0 0 10px rgba(59, 130, 246, 0.2)" : "none",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontWeight: 600, fontSize: 16 }}>{agent.label}</span>
                {remaining === 0 && agentStat.total > 0 ? (
                  <span style={{ color: "#10b981", fontSize: 12 }}>✓ Done</span>
                ) : null}
              </div>
              <div style={{ fontSize: 12, color: "#94a3b8" }}>
                Progress: {agentStat.answered} / {agentStat.total}
              </div>
              <div style={{ width: "100%", background: "#2d2d34", height: 4, borderRadius: 2, marginTop: 8, overflow: "hidden" }}>
                <div
                  style={{
                    width: `${percent}%`,
                    height: "100%",
                    background: percent === 100 ? "#10b981" : "#3b82f6",
                    transition: "width 0.3s ease",
                  }}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#64748b", marginTop: 4 }}>
                <span>{percent}%</span>
                <span>{remaining} left</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Workspace Area */}
      <div style={{ background: "#1a1a1f", border: "1px solid #2d2d34", borderRadius: 12, padding: 20 }}>
        {/* Active Status Banner */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#1e1e24", padding: "12px 18px", borderRadius: 8, marginBottom: 20 }}>
          <div>
            <span style={{ color: "#94a3b8", fontSize: 14 }}>Active Channel:</span>
            <strong style={{ marginLeft: 8, fontSize: 16, color: "#3b82f6" }}>{CHAT_AGENTS.find((a) => a.id === activeAgent)?.label}</strong>
          </div>
          <div style={{ fontSize: 14 }}>
            {activeAgentRemaining === 0 ? (
              <span style={{ color: "#10b981", fontWeight: 600 }}>🎉 All questions completed!</span>
            ) : (
              <span>
                Next Question starts at ID: <strong style={{ color: "#f59e0b" }}>{nextQuestions[0]?.id || "N/A"}</strong>
              </span>
            )}
          </div>
        </div>

        {/* Status Alerts */}
        {statusMessage && (
          <div
            style={{
              padding: "12px 16px",
              borderRadius: 8,
              marginBottom: 20,
              fontSize: 14,
              border: statusMessage.type === "success" ? "1px solid #065f46" : "1px solid #991b1b",
              background: statusMessage.type === "success" ? "#064e3b" : "#7f1d1d",
              color: statusMessage.type === "success" ? "#a7f3d0" : "#fca5a5",
            }}
          >
            {statusMessage.text}
          </div>
        )}

        {activeAgentRemaining === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 20px" }}>
            <span style={{ fontSize: 60 }}>🎉</span>
            <h3 style={{ margin: "16px 0 8px 0", color: "#10b981", fontSize: 20 }}>Work Complete!</h3>
            <p style={{ color: "#94a3b8", maxWidth: 500, margin: "0 auto", fontSize: 14, lineHeight: 1.5 }}>
              You have successfully collected all long descriptive answers for this agent in your SQLite database. You can select another agent from the top bar to continue.
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            {/* Left Column: Prompt Generation & Copy */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <h4 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "#94a3b8" }}>Step 1: Copy Prompt & Questions</h4>
                <button
                  onClick={handleCopy}
                  disabled={!promptText || loading}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 12px",
                    background: isCopied ? "#10b981" : "#2563eb",
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 600,
                    transition: "background 0.2s ease",
                  }}
                >
                  {isCopied ? "✓ Copied!" : "📋 Copy Prompt"}
                </button>
              </div>

              <textarea
                readOnly
                value={promptText}
                placeholder="Generating prompt..."
                style={{
                  flexGrow: 1,
                  minHeight: 350,
                  background: "#0e0e10",
                  border: "1px solid #2d2d34",
                  borderRadius: 8,
                  padding: 12,
                  color: "#a7f3d0",
                  fontFamily: "Fira Code, Consolas, Monaco, monospace",
                  fontSize: 12,
                  lineHeight: 1.5,
                  resize: "none",
                  outline: "none",
                }}
              />
              <p style={{ fontSize: 11, color: "#64748b", marginTop: 6, margin: 0 }}>
                Click "Copy Prompt" and paste directly into your active chat with {CHAT_AGENTS.find((a) => a.id === activeAgent)?.label}.
              </p>
            </div>

            {/* Right Column: Paste & Submit Answers */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <h4 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "#94a3b8" }}>Step 2: Paste AI Response & Submit</h4>
                <button
                  onClick={handleSubmit}
                  disabled={!pastedText.trim() || loading}
                  style={{
                    padding: "6px 14px",
                    background: !pastedText.trim() ? "#1e293b" : "#10b981",
                    color: !pastedText.trim() ? "#64748b" : "#fff",
                    border: "none",
                    borderRadius: 6,
                    cursor: !pastedText.trim() ? "not-allowed" : "pointer",
                    fontSize: 12,
                    fontWeight: 600,
                    transition: "background 0.2s ease",
                  }}
                >
                  {loading ? "Saving..." : "💾 Submit Answers"}
                </button>
              </div>

              <textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder={`Paste the entire JSON response from ${CHAT_AGENTS.find((a) => a.id === activeAgent)?.label} here...`}
                style={{
                  flexGrow: 1,
                  minHeight: 350,
                  background: "#0e0e10",
                  border: "1px solid #2d2d34",
                  borderRadius: 8,
                  padding: 12,
                  color: "#fff",
                  fontFamily: "Fira Code, Consolas, Monaco, monospace",
                  fontSize: 12,
                  lineHeight: 1.5,
                  resize: "none",
                  outline: "none",
                }}
              />
              <p style={{ fontSize: 11, color: "#64748b", marginTop: 6, margin: 0 }}>
                Paste the response and click "Submit Answers" to update the SQLite database.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Preview questions being loaded */}
      {nextQuestions.length > 0 && activeAgentRemaining > 0 && (
        <div style={{ marginTop: 20, background: "#1a1a1f", border: "1px solid #2d2d34", borderRadius: 12, padding: 16 }}>
          <h4 style={{ margin: "0 0 12px 0", fontSize: 14, color: "#94a3b8" }}>Questions in this batch:</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {nextQuestions.map((q) => (
              <div key={q.id} style={{ display: "flex", gap: 10, background: "#0e0e10", padding: "8px 12px", borderRadius: 6, fontSize: 13 }}>
                <span style={{ color: "#3b82f6", fontWeight: 600 }}>#{q.id}</span>
                <span>{q.question}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
