// scripts/inspectSchema.ts
// run: npx tsx scripts/inspectSchema.ts
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATHS = [
    path.resolve(process.cwd(), 'data/chunks.db'),
    path.resolve(process.cwd(), 'data/presidents_questions_and_answers.db'),
    // also check without .db extension if you named it like that
    path.resolve(process.cwd(), 'data/presidents_questions_and_answers'),
].filter(p => fs.existsSync(p));

if (DB_PATHS.length === 0) {
    console.error('No DBs found in data/');
    process.exit(1);
}

function inspectDb(dbPath: string) {
    const db = new Database(dbPath, { readonly: true });

    console.log(`\n${'='.repeat(80)}`);
    console.log(`📂 DB: ${dbPath}`);
    console.log(`${'='.repeat(80)}\n`);

    // 1. All tables + sql
    const tables = db.prepare(`
        SELECT name, sql FROM sqlite_master
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
        ORDER BY name
    `).all() as { name: string, sql: string }[];

    console.log(`=== TABLES (${tables.length}) ===`);
    for (const t of tables) {
        console.log(`\n-- ${t.name} --`);
        console.log(t.sql);

        // columns
        const cols = db.prepare(`PRAGMA table_info(${t.name})`).all() as any[];
        console.table(cols.map(c => ({
            cid: c.cid,
            name: c.name,
            type: c.type,
            notnull: c.notnull,
            pk: c.pk,
            dflt: c.dflt_value
        })));

        // row count
        const count = db.prepare(`SELECT COUNT(*) as c FROM ${t.name}`).get() as { c: number };
        console.log(`Rows: ${count.c}`);

        // indexes
        const indexes = db.prepare(`PRAGMA index_list(${t.name})`).all() as any[];
        if (indexes.length) {
            console.log(`Indexes:`);
            for (const idx of indexes) {
                const idxInfo = db.prepare(`PRAGMA index_info(${idx.name})`).all() as any[];
                console.log(`  - ${idx.name} (unique=${idx.unique}) -> ${idxInfo.map(i => i.name).join(', ')}`);
            }
        }
    }

    // 2. All indexes raw SQL
    const allIndexes = db.prepare(`
        SELECT name, tbl_name, sql FROM sqlite_master
        WHERE type='index' ORDER BY tbl_name
    `).all() as any[];

    console.log(`\n=== ALL INDEXES (${allIndexes.length}) ===`);
    for (const i of allIndexes) {
        console.log(`${i.tbl_name}.${i.name}: ${i.sql || '(auto)'}`);
    }

    // 3. Sample data
    console.log(`\n=== SAMPLE DATA (first 5 per table) ===`);
    for (const t of tables) {
        const sample = db.prepare(`SELECT * FROM ${t.name} LIMIT 5`).all();
        console.log(`\n${t.name}:`);
        console.table(sample);
    }

    db.close();
}

function main() {
    for (const dbPath of DB_PATHS) {
        inspectDb(dbPath);
    }
}

main();