/**
 * Queries Pinecone index with an embedding from OpenAI for the given question.
 * @param question The question to embed and search for
 * @param model The OpenAI embedding model
 * @param index Pinecone Index instance
 * @returns Query result or null if no matches
 */
import type {QueryResponse, RecordMetadata} from "@pinecone-database/pinecone";
import {getOpenAIEmbedding, getOpenAIClient} from "@/lib/openai";

import {getPineconeIndex} from "@/lib/pinecone";
import {
  DEBUG,
  CHAT_MODEL,
  DEFAULT_THRESHOLD} from "@/config/env";

// Diagnostic guards to help tests debug module load / mock ordering issues
try {
  // Log imported symbols' types so we can see if imports were mocked/undefined
  // eslint-disable-next-line no-console
  console.log('OA: init - imported types', {
    getOpenAIEmbedding: typeof getOpenAIEmbedding,
    getOpenAIClient: typeof getOpenAIClient,
    getPineconeIndex: typeof getPineconeIndex,
    DEBUG: typeof DEBUG
  });
} catch (err) {
  // eslint-disable-next-line no-console
  console.error('OA: init - import introspect failed', err);
}

// ----- Helper utilities (restored) -----
export function parseAnswer(answer: string | null | undefined): any | null {
  if (!answer || typeof answer !== 'string') return null;
  try {
    return JSON.parse(answer);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to parse answer:', err);
    return null;
  }
}

export function extractTextFromAnswer(answer: any): string {
  if (!answer) return '';
  if (typeof answer === 'string') return answer;
  if (typeof answer.text === 'string' && answer.text.trim() !== '') return answer.text;
  if (answer.content && typeof answer.content.text === 'string') return answer.content.text;
  return '';
}

export function isValidAnswer(answer: any): boolean {
  const text = extractTextFromAnswer(answer);
  return typeof text === 'string' && text.trim().length > 0;
}

export function formatAnswerForDisplay(answer: any, opts?: { separator?: string }): any {
  if (!answer) return '';
  let text = extractTextFromAnswer(answer);
  if (!text) return '';
  // collapse whitespace
  text = text.replace(/\s+/g, ' ').trim();
  // basic HTML escape
  text = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return text;
}

export function extractMetadata(answer: any, fields?: string[]): any {
  const out: any = {};
  if (!answer || typeof answer !== 'object') return out;
  const candidates = {
    confidence: answer.confidence,
    model: answer.model,
    tokens: answer.tokens,
    temperature: answer.temperature,
    max_tokens: answer.max_tokens,
    ...(answer.metadata || {})
  };
  if (Array.isArray(fields) && fields.length > 0) {
    for (const k of fields) {
      if (k in candidates) out[k] = candidates[k];
    }
    return out;
  }
  // default: include known keys
  for (const k of Object.keys(candidates)) {
    if (candidates[k] !== undefined) out[k] = candidates[k];
  }
  return out;
}

export function mergeAnswers(answers: any[], opts?: { separator?: string, strategy?: Function, deduplicate?: boolean }): any {
  const validItems = answers.filter(a => isValidAnswer(a));
  if (validItems.length === 0) return null;

  // Strategy override
  if (opts?.strategy && typeof opts.strategy === 'function' && answers.length >= 2) {
    return opts.strategy(answers[0], answers[1]);
  }

  // If only one valid and it's an object, return it as-is
  if (validItems.length === 1 && typeof validItems[0] === 'object') {
    return validItems[0];
  }

  const areAllStrings = validItems.every(a => typeof a === 'string');
  const joinSep = areAllStrings ? (opts?.separator ?? ' ') : (opts?.separator ?? '\n---\n');
  const valid = validItems.map(a => (typeof a === 'string' ? a : extractTextFromAnswer(a)));
  let combined = valid.join(joinSep);
  if (opts?.deduplicate) {
    const seen = new Set<string>();
    const parts: string[] = [];
    for (const p of combined.split(joinSep)) {
      if (!seen.has(p)) { seen.add(p); parts.push(p); }
    }
    combined = parts.join(joinSep);
  }
  const metadata: any = {};
  // compute simple average confidence if objects provided
  const confidences = answers.map(a => (a && typeof a === 'object' && a.confidence) ? a.confidence : null).filter((c: any) => typeof c === 'number') as number[];
  if (confidences.length) {
    const avg = confidences.reduce((s, v) => s + v, 0) / confidences.length;
    metadata.average_confidence = Math.round(avg * 100) / 100;
  }
  return { text: combined, metadata };
}


// Diagnostic: mark before defining exported functions
// eslint-disable-next-line no-console
console.log('OA: defining queryPinecone');

export const queryPinecone = async (
  question: string,
  similarityThreshold: number = Number(DEFAULT_THRESHOLD)  // Add parameter with default 0.4
): Promise<QueryResponse<RecordMetadata> | null> => {
  // eslint-disable-next-line no-console
  console.log('OA: entered queryPinecone');
  const query_embedding = await getOpenAIEmbedding(question);
  const result = await getPineconeIndex().query({
    vector: query_embedding,
    topK: 3,
    includeValues: false,
    includeMetadata: true,
  });

  if (!result || !result.matches || result.matches.length === 0) {
    console.log(`No matches found for '${question}'`);
    return null;
  }

  if (result.matches && result.matches.length > 0) {
    // Filter matches by similarity threshold
    const filteredMatches = result.matches.filter(match =>
      (match.score || 0) >= similarityThreshold
    );

    if (DEBUG === 'true') {
      console.log(`Top matches for '${question}' (threshold: ${similarityThreshold}):`);
      console.log(`Original matches: ${result.matches.length}, Filtered: ${filteredMatches.length}`);

      for (const match of filteredMatches) {
        console.log(match);
        let text = match.metadata?.text;
        if (typeof text !== "string") text = String(text ?? "");
        console.log(
          `ID: ${match.id}\n` +
          `Score: ${match.score}\n` +
          `Page: ${match.metadata?.page}\n` +
          `Source: ${match.metadata?.source}\n` +
          `Text (truncated): ${text.slice(0, 200)}...`
        );
      }
    }

    // Return null if no matches meet threshold
    return filteredMatches.length > 0 ? { ...result, matches: filteredMatches } : null;
  } else {
    console.log(`No matches found for '${question}'`);
    return null;
  }
};


/**
 * Generates an answer to a question using context from Pinecone and OpenAI chat completion.
 * @param question The question to answer
 * @param similarityThreshold Minimum similarity score (0-1) for context matches. Defaults to 0.5.
 * @param fallbackToGeneralKnowledge Whether to use LLM's general knowledge when no context found. Defaults to true.
 * @returns Promise<string> The generated answer
 */
export async function getAnswer(
  question: string,
  similarityThreshold: number = 0.5,
  fallbackToGeneralKnowledge: boolean = true
): Promise<string> {
  // eslint-disable-next-line no-console
  console.log('OA: entered getAnswer');
  // Query Pinecone for relevant context with threshold
  const queryResult = await queryPinecone(
    question,
    similarityThreshold
  );

  // Build context from query results
  let context = "";
  let contextChunkCount = 0;

  if (queryResult?.matches?.length) {
    const contextParts: string[] = [];

    for (const match of queryResult.matches) {
      const text = match.metadata?.text;
      const source = match.metadata?.source;
      const page = match.metadata?.page;

      if (text) {
        contextParts.push(
          `Source: ${source || "Unknown"}` +
          (page ? `, Page: ${page}` : "") +
          `\nContent: ${text}\n`
        );
      }
    }

    context = contextParts.join("\n---\n");
    contextChunkCount = contextParts.length;
  }

  // Check if we found any context
  const hasContext = context !== "";

  // If no context and fallback is disabled, return early
  if (!hasContext && !fallbackToGeneralKnowledge) {
    if (DEBUG === 'true') {
      console.log("=== Debug Info ===");
      console.log("Question:", question);
      console.log("Similarity Threshold:", similarityThreshold);
      console.log("Fallback to General Knowledge:", fallbackToGeneralKnowledge);
      console.log("Context found:", false);
      console.log("==================");
    }

    return "I cannot answer this question because no relevant information was found in the knowledge base and fallback to general knowledge is disabled.";
  }

  // Create the prompt for chat completion
  const systemPrompt = "You are a helpful assistant that answers questions based on the provided context. " +
    "If the context doesn't contain enough information to answer the question, say so clearly.";

  let userPrompt: string;
  if (hasContext) {
    userPrompt = `Context:\n${context}\n\nQuestion: ${question}\n\nPlease answer the question based on the context provided above.`;
  } else {
    // No context found, but fallback is enabled
    userPrompt = `Question: ${question}\n\nI couldn't find any relevant context to answer this question. Please provide a general response based on your training knowledge.`;
  }

  if (DEBUG === 'true') {
    console.log("=== Debug Info ===");
    console.log("Question:", question);
    console.log("Similarity Threshold:", similarityThreshold);
    console.log("Fallback to General Knowledge:", fallbackToGeneralKnowledge);
    console.log("Context found:", hasContext);
    if (hasContext) {
      console.log("Context length:", context.length);
      console.log("Number of context chunks:", contextChunkCount);
    }
    console.log("==================");
  }

  // Get answer from OpenAI
  const completion = await getOpenAIClient().chat.completions.create({
    model: CHAT_MODEL!,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    temperature: 0.7,
    max_tokens: 500,
  });

  const answer = completion.choices[0]?.message?.content || "I couldn't generate an answer.";

  if (DEBUG === 'true') {
    console.log("Generated answer:", answer);
  }

  return answer;
}
