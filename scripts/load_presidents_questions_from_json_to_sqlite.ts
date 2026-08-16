//
// run: npx tsx scripts/load_presidents_questions_from_json_to_sqlite.ts

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const ROOT = path.resolve(__dirname, '..'); // C:\Users\marc\Documents\repos\trivia
const DB_PATH = path.resolve(ROOT, 'data/presidents_questions_and_answers.db');
const QUESTIONS_ONLY_PATH = path.resolve(ROOT, 'data/presidents_questions.ts');
const QUESTIONS_AND_ANSWERS_PATH = path.resolve(ROOT, 'data/presidents_questions_and_answers.ts');

async function loadModules() {
    const mod1 = await import(`file://${QUESTIONS_ONLY_PATH}`);
    const mod2 = await import(`file://${QUESTIONS_AND_ANSWERS_PATH}`);
    return {
        questionsOnly: mod1.questions as any[],
        questionsWithAnswers: mod2.questions as any[],
    };
}

async function main() {
    const { questionsOnly, questionsWithAnswers } = await loadModules();
    console.log(`Loaded ${questionsOnly.length} from presidents_questions.ts`);
    console.log(`Loaded ${questionsWithAnswers.length} from presidents_questions_and_answers.ts`);

    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    if (fs.existsSync(DB_PATH)) {
        fs.unlinkSync(DB_PATH);
        console.log(`Deleted old DB: ${DB_PATH}`);
    }

    const db = new Database(DB_PATH);
    db.pragma('foreign_keys = ON');
    db.pragma('journal_mode = WAL');

    db.exec(`
    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY,
      category TEXT NOT NULL,
      question TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS questions_and_answers (
      id INTEGER PRIMARY KEY,
      question_id INTEGER NOT NULL,
      short_answer_choice TEXT NOT NULL,
      long_descriptive_answer_deepseek TEXT,
      long_descriptive_answer_copilot TEXT,
      long_descriptive_answer_openai TEXT,
      long_descriptive_answer_claude TEXT,
      long_descriptive_answer_gemini TEXT,
      long_descriptive_answer_metaai TEXT,
      FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS fake_answer_choices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question_id INTEGER NOT NULL,
      choice_text TEXT NOT NULL,
      position INTEGER NOT NULL,
      FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
      UNIQUE(question_id, choice_text)
    );

    CREATE INDEX IF NOT EXISTS idx_qa_qid ON questions_and_answers(question_id);
    CREATE INDEX IF NOT EXISTS idx_fake_qid ON fake_answer_choices(question_id);
  `);

    const insertQuestion = db.prepare(`
    INSERT INTO questions (id, category, question) VALUES (@id, @category, @question)
    ON CONFLICT(id) DO UPDATE SET category=excluded.category, question=excluded.question
  `);

    const insertQA = db.prepare(`
    INSERT INTO questions_and_answers (
      id, question_id, short_answer_choice,
      long_descriptive_answer_deepseek,
      long_descriptive_answer_copilot,
      long_descriptive_answer_openai,
      long_descriptive_answer_claude,
      long_descriptive_answer_gemini,
      long_descriptive_answer_metaai
    ) VALUES (
      @id, @question_id, @short_answer_choice,
      @long_descriptive_answer_deepseek,
      @long_descriptive_answer_copilot,
      @long_descriptive_answer_openai,
      @long_descriptive_answer_claude,
      @long_descriptive_answer_gemini,
      @long_descriptive_answer_metaai
    )
    ON CONFLICT(id) DO UPDATE SET
      short_answer_choice=excluded.short_answer_choice,
      long_descriptive_answer_deepseek=excluded.long_descriptive_answer_deepseek,
      long_descriptive_answer_copilot=excluded.long_descriptive_answer_copilot,
      long_descriptive_answer_openai=excluded.long_descriptive_answer_openai,
      long_descriptive_answer_claude=excluded.long_descriptive_answer_claude,
      long_descriptive_answer_gemini=excluded.long_descriptive_answer_gemini,
      long_descriptive_answer_metaai=excluded.long_descriptive_answer_metaai
  `);

    const insertFake = db.prepare(`
    INSERT INTO fake_answer_choices (question_id, choice_text, position)
    VALUES (@question_id, @choice_text, @position)
    ON CONFLICT(question_id, choice_text) DO NOTHING
  `);

    const tx = db.transaction(() => {
        for (const q of questionsOnly) {
            insertQuestion.run({ id: q.id, category: q.category, question: q.question });
        }
        for (const q of questionsWithAnswers) {
            // if id exists only in answers file but not in questionsOnly, insert it
            if (!questionsOnly.find(x => x.id === q.id)) {
                insertQuestion.run({ id: q.id, category: q.category, question: q.question });
            }
            insertQA.run({
                id: q.id,
                question_id: q.id,
                short_answer_choice: q.short_answer_choice,
                long_descriptive_answer_deepseek: q.long_descriptive_answer_deepseek || null,
                long_descriptive_answer_copilot: (q as any).long_descriptive_answer_copilot || null,
                long_descriptive_answer_openai: (q as any).long_descriptive_answer_openai || null,
                long_descriptive_answer_claude: (q as any).long_descriptive_answer_claude || null,
                long_descriptive_answer_gemini: (q as any).long_descriptive_answer_gemini || null,
                long_descriptive_answer_metaai: (q as any).long_descriptive_answer_metaai || null,
            });
            q.fake_answer_choices?.forEach((c: string, i: number) => {
                insertFake.run({ question_id: q.id, choice_text: c, position: i });
            });
        }
    });

    tx();

    console.log(`✅ DB created: ${DB_PATH}`);
    console.log(`questions: ${(db.prepare('SELECT COUNT(*) as c FROM questions').get() as any).c}`);
    console.log(`questions_and_answers: ${(db.prepare('SELECT COUNT(*) as c FROM questions_and_answers').get() as any).c}`);
    console.log(`fake_answer_choices: ${(db.prepare('SELECT COUNT(*) as c FROM fake_answer_choices').get() as any).c}`);

    // Test LEFT JOIN
    const sample = db.prepare(`
    SELECT q.id, q.question, qa.short_answer_choice, qa.long_descriptive_answer_deepseek
    FROM questions q
    LEFT JOIN questions_and_answers qa ON qa.question_id = q.id
    LIMIT 1
  `).get();
    console.log('\nSample LEFT JOIN:', sample);

    db.close();
}

main().catch(e => { console.error(e); process.exit(1); });