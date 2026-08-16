// scripts/splitQuestions.ts
// To run - npx tsx scripts/splitQuestions.ts
import * as fs from 'fs';
import * as path from 'path';
import { questions, Question } from '@/data/presidents_questions_and_answers';

// Directory where split files will be saved
const OUTPUT_DIR = path.join(__dirname, '../data/presidents_questions_and_answers');

// Ensure the output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Number of questions per file
const QUESTIONS_PER_FILE = 5;

// Calculate the number of files needed
const totalQuestions = questions.length;
const numFiles = Math.ceil(totalQuestions / QUESTIONS_PER_FILE);

// Template for each file
function generateFileContent(fileQuestions: Question[], fileIndex: number): string {
    const fileNumber = fileIndex + 1;
    const fileNumberStr = String(fileNumber).padStart(2, '0'); // 01, 02, 03, etc.
    const filepath = `data/presidents_questions_and_answers/presidents_questions_answers_${fileNumberStr}.ts`;

    // Generate the questions array content
    const questionsString = fileQuestions.map(q => {
        // Escape any double quotes in the long descriptive answer
        const escapedAnswer = q.long_descriptive_answer_deepseek.replace(/"/g, '\\"');

        return `    {
        id: ${q.id},
        category: "${q.category}",
        question: "${q.question}",
        short_answer_choice: "${q.short_answer_choice}",
        fake_answer_choices: [
            ${q.fake_answer_choices.map(choice => `"${choice}"`).join(',\n            ')}
        ],
        long_descriptive_answer_deepseek: "${escapedAnswer}"
    }`;
    }).join(',\n\n');

    return `// ${filepath}
import { Question } from '../../questions';

export const questions: Question[] = [
${questionsString}
];

// ${filepath}`;
}

// Split questions into groups of 5
for (let i = 0; i < numFiles; i++) {
    const start = i * QUESTIONS_PER_FILE;
    const end = Math.min(start + QUESTIONS_PER_FILE, totalQuestions);
    const chunk = questions.slice(start, end);

    const fileContent = generateFileContent(chunk, i);
    const fileNumber = String(i + 1).padStart(2, '0');
    const fileName = `presidents_questions_answers_${fileNumber}.ts`;
    const filePath = path.join(OUTPUT_DIR, fileName);

    fs.writeFileSync(filePath, fileContent, 'utf8');
    console.log(`Created: ${fileName} (questions ${start + 1}-${end})`);
}

// Create an index file that exports all the question arrays
function generateIndexFile(): string {
    const indexPath = 'data/presidents_questions_and_answers/index.ts';
    let indexContent = `// ${indexPath}
// Auto-generated index file that exports all question chunks

`;

    const totalFiles = numFiles;
    for (let i = 1; i <= totalFiles; i++) {
        const fileNumber = String(i).padStart(2, '0');
        const varName = `questions_${fileNumber}`;
        indexContent += `import { questions as ${varName} } from './presidents_questions_answers_${fileNumber}';\n`;
    }

    indexContent += `\nexport const allQuestionChunks = [\n`;
    for (let i = 1; i <= totalFiles; i++) {
        const fileNumber = String(i).padStart(2, '0');
        const varName = `questions_${fileNumber}`;
        indexContent += `    ${varName},\n`;
    }
    indexContent += `];\n\n// ${indexPath}`;

    return indexContent;
}

// Write the index file
const indexFilePath = path.join(OUTPUT_DIR, 'index.ts');
fs.writeFileSync(indexFilePath, generateIndexFile(), 'utf8');
console.log(`Created: index.ts`);

// Create a combined file that merges all questions
function generateCombinedFile(): string {
    const combinedPath = 'data/presidents_questions_and_answers/combined.ts';
    let combinedContent = `// ${combinedPath}
// Auto-generated combined file with all questions merged

import { Question } from '../../questions';

export const questions: Question[] = [
`;

    for (let i = 1; i <= numFiles; i++) {
        const fileNumber = String(i).padStart(2, '0');
        combinedContent += `    ...require('./presidents_questions_answers_${fileNumber}').questions,\n`;
    }

    combinedContent += `];\n\n// ${combinedPath}`;

    return combinedContent;
}

// Write the combined file
const combinedFilePath = path.join(OUTPUT_DIR, 'combined.ts');
fs.writeFileSync(combinedFilePath, generateCombinedFile(), 'utf8');
console.log(`Created: combined.ts`);

console.log(`\n✅ Successfully split ${totalQuestions} questions into ${numFiles} files of ${QUESTIONS_PER_FILE} questions each.`);