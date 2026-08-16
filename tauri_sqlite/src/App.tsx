import { useEffect, useState } from "react";
import Database from "@tauri-apps/plugin-sql";
import ChatAgentCollector from "./ChatAgentCollector";

const DB_PATHS = {
    chunks: "sqlite:C:/Users/marc/Documents/repos/trivia/data/chunks.db",
    presidents: "sqlite:C:/Users/marc/Documents/repos/trivia/data/presidents_questions_and_answers.db"
};

type QA = {
    id: number;
    category: string;
    question: string;
    short_answer_choice: string;
    long_deepseek: string | null;
    long_openai: string | null;
    long_claude: string | null;
    long_gemini: string | null;
    long_metaai: string | null;
    long_copilot: string | null;
    fakes: string[]; // 10
    allChoices: string[]; // 11 shuffled
};

function App() {
    const [subApp, setSubApp] = useState<"quiz" | "collector">("quiz");
    const [db, setDb] = useState<Database | null>(null);
    const [qas, setQas] = useState<QA[]>([]);
    const [idx, setIdx] = useState(0);
    const [revealed, setRevealed] = useState(false);
    const [selected, setSelected] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            const database = await Database.load(DB_PATHS.presidents);
            setDb(database);
            // Build the real 1 -> N view
            const rows = await database.select<any[]>(`
        SELECT 
          q.id, q.category, q.question,
          qa.short_answer_choice,
          qa.long_descriptive_answer_deepseek,
          qa.long_descriptive_answer_openai,
          qa.long_descriptive_answer_claude,
          qa.long_descriptive_answer_gemini,
          qa.long_descriptive_answer_metaai,
          qa.long_descriptive_answer_copilot
        FROM questions q
        LEFT JOIN questions_and_answers qa ON qa.question_id = q.id
        ORDER BY q.id
      `);

            const enriched: QA[] = [];
            for (const r of rows) {
                const fakes = await database.select<{choice_text: string}[]>(
                    `SELECT choice_text FROM fake_answer_choices WHERE question_id = $1 ORDER BY position`, [r.id]
                );
                const fakeTexts = fakes.map(f => f.choice_text);
                const all = [...fakeTexts, r.short_answer_choice].sort(() => Math.random() - 0.5);
                enriched.push({
                    id: r.id,
                    category: r.category,
                    question: r.question,
                    short_answer_choice: r.short_answer_choice,
                    long_deepseek: r.long_descriptive_answer_deepseek,
                    long_openai: r.long_descriptive_answer_openai,
                    long_claude: r.long_descriptive_answer_claude,
                    long_gemini: r.long_descriptive_answer_gemini,
                    long_metaai: r.long_descriptive_answer_metaai,
                    long_copilot: r.long_descriptive_answer_copilot,
                    fakes: fakeTexts,
                    allChoices: all
                });
            }
            setQas(enriched);
        })();
    }, []);

    const current = qas[idx];
    const isCorrect = current ? selected === current.short_answer_choice : false;

    return (
        <div style={{fontFamily:"Segoe UI", background:"#0e0e10", color:"#eee", minHeight:"100vh", display: "flex", flexDirection: "column"}}>
            {/* Top Sub-App Selector */}
            <div style={{
                display: "flex", 
                alignItems: "center", 
                justifyContent: "space-between",
                background: "#16161a", 
                borderBottom: "1px solid #2d2d34", 
                padding: "12px 24px"
            }}>
                <div style={{display: "flex", alignItems: "center", gap: 10}}>
                    <span style={{fontSize: 22}}>🇺🇸</span>
                    <span style={{fontWeight: 700, fontSize: 16, color: "#fff", letterSpacing: "0.5px"}}>PRESIDENTS TRIVIA</span>
                </div>
                <div style={{display: "flex", gap: 12}}>
                    <button 
                        onClick={() => setSubApp("quiz")}
                        style={{
                            padding: "8px 16px",
                            background: subApp === "quiz" ? "#3b82f6" : "#222",
                            color: "#fff",
                            border: subApp === "quiz" ? "1px solid #3b82f6" : "1px solid #333",
                            borderRadius: 8,
                            cursor: "pointer",
                            fontSize: 13,
                            fontWeight: 600,
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            transition: "all 0.2s"
                        }}
                    >
                        🎮 Trivia Quiz
                    </button>
                    <button 
                        onClick={() => setSubApp("collector")}
                        style={{
                            padding: "8px 16px",
                            background: subApp === "collector" ? "#3b82f6" : "#222",
                            color: "#fff",
                            border: subApp === "collector" ? "1px solid #3b82f6" : "1px solid #333",
                            borderRadius: 8,
                            cursor: "pointer",
                            fontSize: 13,
                            fontWeight: 600,
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            transition: "all 0.2s"
                        }}
                    >
                        🤖 Q&A AI Collector
                    </button>
                </div>
            </div>

            <div style={{flexGrow: 1, overflow: "auto"}}>
                {subApp === "collector" ? (
                    <ChatAgentCollector db={db} />
                ) : (
                    <div style={{padding: 24}}>
                        {!current ? (
                            <div style={{padding:20, fontSize: 16, textAlign: "center", color: "#888"}}>
                                Loading {qas.length} questions...
                            </div>
                        ) : (
                            <>
                                <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
                                    <h2 style={{margin: 0, fontSize: 20}}>Presidents Trivia - {qas.length} questions | {current.category}</h2>
                                    <div>
                                        <button onClick={()=>{setIdx(i=>Math.max(0,i-1)); setRevealed(false); setSelected(null)}} style={{padding: "6px 12px", background: "#222", color: "#fff", border: "1px solid #444", borderRadius: 6}}>Prev</button>
                                        <button onClick={()=>{setIdx(i=>Math.min(qas.length-1,i+1)); setRevealed(false); setSelected(null)}} style={{marginLeft:8, padding: "6px 12px", background: "#222", color: "#fff", border: "1px solid #444", borderRadius: 6}}>Next</button>
                                    </div>
                                </div>

                                <div style={{background:"#1a1a1f", padding:24, borderRadius:12, marginTop:20, border: "1px solid #2d2d34"}}>
                                    <h3 style={{margin:0, fontSize:22}}>{idx+1}. {current.question}</h3>
                                    <div style={{marginTop:20, display:"grid", gridTemplateColumns:"1fr 1fr", gap:12}}>
                                        {current.allChoices.map(choice => {
                                            const correct = choice === current.short_answer_choice;
                                            const sel = choice === selected;
                                            let bg = "#2a2a30";
                                            if (revealed) {
                                                if (correct) bg = "#1a5c2a";
                                                else if (sel && !correct) bg = "#7a1a1a";
                                            } else if (sel) bg = "#3a3a60";
                                            return (
                                                <button
                                                    key={choice}
                                                    onClick={()=>{setSelected(choice); setRevealed(true)}}
                                                    style={{padding:16, background:bg, color:"#fff", border:"1px solid #444", borderRadius:8, textAlign:"left", cursor:"pointer", transition: "all 0.15s"}}
                                                >
                                                    {choice} {revealed && correct && "✓"}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {revealed && (
                                        <div style={{marginTop:16, padding:14, background: isCorrect?"#122d18":"#2d1212", borderRadius:8, border: isCorrect ? "1px solid #14532d" : "1px solid #7f1d1d", color: isCorrect ? "#a7f3d0" : "#fca5a5"}}>
                                            {isCorrect ? "Correct!" : `Wrong - Answer is ${current.short_answer_choice}`}
                                        </div>
                                    )}
                                </div>

                                {revealed && (
                                    <div style={{marginTop:20, display:"grid", gridTemplateColumns:"1fr 1fr", gap:12}}>
                                        {[
                                            ["DeepSeek", current.long_deepseek],
                                            ["OpenAI", current.long_openai],
                                            ["Claude", current.long_claude],
                                            ["Gemini", current.long_gemini],
                                            ["MetaAI", current.long_metaai],
                                            ["Copilot", current.long_copilot],
                                        ].map(([label, text]) => text && (
                                            <div key={label as string} style={{background:"#1e1e22", padding:16, borderRadius:8, border: "1px solid #2d2d34"}}>
                                                <b style={{color: "#3b82f6"}}>{label}</b>
                                                <p style={{fontSize:13, opacity:0.9, lineHeight:1.5, margin: "8px 0 0 0"}}>{text as string}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div style={{marginTop:24, fontSize:12, opacity:0.6, borderTop: "1px solid #222", paddingTop:12}}>
                                    <b>Schema insight:</b> questions (1) → questions_and_answers (1-to-1, extends with long answers) → fake_answer_choices (1-to-many, 10 distractors). Chunks.db has 24k url+chunk_index rows for RAG.
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default App;