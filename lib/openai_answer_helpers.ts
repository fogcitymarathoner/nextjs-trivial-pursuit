/**
 * Queries Pinecone index with an embedding from OpenAI for the given question.
 * @param question The question to embed and search for
 * @param model The OpenAI embedding model
 * @param index Pinecone Index instance
 * @returns Query result or null if no matches
 */
import type {QueryResponse, RecordMetadata} from "@pinecone-database/pinecone";
import OpenAIClientManager from "@/lib/OpenAIClientManager";

import PineconeManager from "@/lib/PineconeManager";
import {
  DEBUG,
  CHAT_MODEL,
  DEFAULT_THRESHOLD} from "@/config/env.server";
import {PINECONE_INDEXES, getIndexNameByLabel} from "@/config/pinecone/pinecone_indexes";

// runtime debug check (allow overriding via process.env.DEBUG in tests)
function isDebug(): boolean {
  try {
    return process.env.DEBUG === 'true' || DEBUG === 'true';
  } catch (err) {
    return DEBUG === 'true';
  }
}

// Define types for answer objects
type AnswerObject = {
  text?: string;
  content?: {
    text?: string;
  };
  confidence?: number;
  model?: string;
  tokens?: number;
  temperature?: number;
  max_tokens?: number;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
};

type ParsedAnswer = AnswerObject | null;
type MetadataOutput = Record<string, unknown>;

// Diagnostic guards to help tests debug module load / mock ordering issues
try {
  // Log imported symbols' types so we can see if imports were mocked/undefined
  // eslint-disable-next-line no-console
  console.log('OA: init - imported types', {
    getOpenAIEmbedding: typeof OpenAIClientManager.getEmbedding,
    getOpenAIClient: typeof OpenAIClientManager.getClient,
    pineconeManagerGetIndex: typeof PineconeManager.getIndex,
    DEBUG: typeof DEBUG
  });
} catch (err) {
  // eslint-disable-next-line no-console
  console.error('OA: init - import introspect failed', err);
}

// ----- Helper utilities (restored) -----
export function parseAnswer(answer: string | null | undefined): ParsedAnswer {
  if (!answer || typeof answer !== 'string') return null;
  try {
    return JSON.parse(answer) as AnswerObject;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to parse answer:', err);
    return null;
  }
}

export function extractTextFromAnswer(answer: AnswerObject | string | null | undefined): string {
  if (!answer) return '';
  if (typeof answer === 'string') return answer;
  if (typeof answer.text === 'string' && answer.text.trim() !== '') return answer.text;
  if (answer.content && typeof answer.content.text === 'string') return answer.content.text;
  return '';
}

export function isValidAnswer(answer: AnswerObject | string | null | undefined): boolean {
  const text = extractTextFromAnswer(answer);
  return text.trim().length > 0;
}

export function formatAnswerForDisplay(answer: AnswerObject | string | null | undefined): string {
  if (!answer) return '';
  let text = extractTextFromAnswer(answer);
  if (!text) return '';
  // collapse whitespace
  text = text.replace(/\s+/g, ' ').trim();
  // basic HTML escape
  text = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return text;
}

export function extractMetadata(answer: AnswerObject | null | undefined, fields?: string[]): MetadataOutput {
  const out: MetadataOutput = {};
  if (!answer || typeof answer !== 'object') return out;

  const candidates: Record<string, unknown> = {
    confidence: answer.confidence,
    model: answer.model,
    tokens: answer.tokens,
    temperature: answer.temperature,
    max_tokens: answer.max_tokens,
    ...(answer.metadata || {})
  };

  if (Array.isArray(fields) && fields.length > 0) {
    for (const k of fields) {
      // include only defined, non-null values
      if (k in candidates && candidates[k] != null) out[k] = candidates[k];
    }
    return out;
  }

  // default: include known keys
  for (const k of Object.keys(candidates)) {
    // skip undefined and null values
    if (candidates[k] != null) out[k] = candidates[k];
  }
  return out;
}

type MergedAnswer = {
  text: string;
  metadata: MetadataOutput;
} | null;

export function mergeAnswers(
  answers: Array<AnswerObject | string | null | undefined>,
  opts?: { separator?: string; strategy?: (a: unknown, b: unknown) => unknown; deduplicate?: boolean }
): MergedAnswer {
  const validItems = answers.filter(a => isValidAnswer(a));
  if (validItems.length === 0) return null;

  // Strategy override
  if (opts?.strategy && typeof opts.strategy === 'function' && answers.length >= 2) {
    const result = opts.strategy(answers[0], answers[1]);
    return result as MergedAnswer;
  }

  // If only one valid and it's an object, return it as-is
  if (validItems.length === 1 && typeof validItems[0] === 'object') {
    const singleResult = validItems[0] as AnswerObject;
    return { text: extractTextFromAnswer(singleResult), metadata: extractMetadata(singleResult) };
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

  const metadata: MetadataOutput = {};
  // compute simple average confidence if objects provided
  const confidences = answers
    .map(a => (a && typeof a === 'object' && 'confidence' in a && typeof a.confidence === 'number') ? a.confidence : null)
    .filter((c): c is number => c !== null);

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
  similarityThreshold: number = Number(DEFAULT_THRESHOLD),
  indexName?: string  // Add this parameter
): Promise<QueryResponse<RecordMetadata> | null> => {
  // eslint-disable-next-line no-console
  console.log('OA: entered queryPinecone');

  // Use provided index name or fall back to env var
  const indexToUse = indexName || process.env.PINECONE_INDEX_DEV;

  if (!indexToUse) {
    throw new Error('No Pinecone index specified. Either pass indexName or set PINECONE_INDEX_DEV in environment');
  }

  console.log(`OA: Using Pinecone index: ${indexToUse}`);

  const query_embedding = await OpenAIClientManager.getEmbedding(question);

  // Get the specific index instead of default
  const result = await PineconeManager.getIndex(indexToUse).query({
    vector: query_embedding,
    topK: 3,
    includeValues: false,
    includeMetadata: true,
  });

  if (!result || !result.matches || result.matches.length === 0) {
    console.log(`No matches found for '${question}' in index '${indexToUse}'`);
    return null;
  }

  if (result.matches && result.matches.length > 0) {
    // Filter matches by similarity threshold
    const filteredMatches = result.matches.filter((match: QueryResponse<RecordMetadata>['matches'][number]) =>
      (match.score || 0) >= similarityThreshold
    );

    if (isDebug()) {
      console.log(`Top matches for '${question}' (index: ${indexToUse}, threshold: ${similarityThreshold}):`);
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
    console.log(`No matches found for '${question}' in index '${indexToUse}'`);
    return null;
  }
};

// openai_answer_helpers.ts

/**
 * Queries Pinecone for relevant context matches
 * @param question The question to search for
 * @param similarityThreshold Minimum similarity score (0-1) for context matches
 * @param pineconeIndexName The actual Pinecone index name to query
 * @returns Promise<PineconeQueryResult | null> The query results or null if error
 */
export async function getResultsFromVectorDB(
  question: string,
  similarityThreshold: number,
  pineconeIndexName: string
): Promise<any | null> {
  try {
    console.log(`DB: Querying Pinecone index "${pineconeIndexName}" with threshold ${similarityThreshold}`);

    const queryResult = await queryPinecone(
      question,
      similarityThreshold,
      pineconeIndexName
    );

    if (!queryResult?.matches?.length) {
      console.log(`DB: No matches found in index "${pineconeIndexName}" at threshold ${similarityThreshold}`);
    } else {
      console.log(`DB: Found ${queryResult.matches.length} matches in index "${pineconeIndexName}"`);
    }

    return queryResult;
  } catch (error) {
    console.error(`DB: Error querying Pinecone index "${pineconeIndexName}":`, error);
    return null;
  }
}

/**
 * Builds context string from query results
 * @param queryResult The query results from Pinecone
 * @returns Object containing context string and chunk count
 */
export function buildContextFromResults(queryResult: any | null): { context: string; contextChunkCount: number } {
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

  return { context, contextChunkCount };
}

/**
 * Generates an answer to a question using context from Pinecone and OpenAI chat completion.
 * @param question The question to answer
 * @param similarityThreshold Minimum similarity score (0-1) for context matches. Defaults to 0.5.
 * @param fallbackToGeneralKnowledge Whether to use LLM's general knowledge when no context found. Defaults to true.
 * @param pineconeIndexLabel Optional human-readable name of the Pinecone index to query. Defaults to PINECONE_INDEX_DEV env var.
 * @param queryResult Optional pre-fetched query results from vector DB. If not provided, will query Pinecone internally.
 * @returns Promise<string> The generated answer
 */
export async function getAnswer(
  question: string,
  similarityThreshold: number = 0.5,
  fallbackToGeneralKnowledge: boolean = true,
  pineconeIndexLabel?: string,
  queryResult?: any | null  // New parameter for pre-fetched results
): Promise<string> {
  // eslint-disable-next-line no-console
  console.log('OA: entered getAnswer');

  // Determine which Pinecone index to use (if we need to query)
  let indexToUse: string | undefined;
  let actualQueryResult = queryResult;

  // If queryResult wasn't provided, we need to query Pinecone
  if (actualQueryResult === undefined) {
    if (pineconeIndexLabel) {
      // Lookup by index name from the configuration
      const pineconeIndexName = getIndexNameByLabel(pineconeIndexLabel);
      // For validating labels
      const VALID_LABELS = PINECONE_INDEXES.map(idx => idx.label);

      // Then in your validation:
      if (!VALID_LABELS.includes(pineconeIndexLabel)) {
        throw new Error(`No Pinecone index found with name: ${pineconeIndexLabel}. Available indexes: ${VALID_LABELS.join(', ')}`);
      }
      indexToUse = pineconeIndexName; // This is the actual Pinecone index name
      console.log(`OA: Using index "${pineconeIndexLabel}" -> Pinecone index: ${indexToUse}`);
    } else {
      // Fall back to env var
      indexToUse = process.env.PINECONE_INDEX_DEV;
      if (!indexToUse) {
        throw new Error('No Pinecone index specified. Either pass pineconeIndexName or set PINECONE_INDEX_DEV in environment');
      }
      console.log(`OA: Using default Pinecone index from env: ${indexToUse}`);
    }

    // Query Pinecone for relevant context with threshold and specified index
    actualQueryResult = await queryPinecone(
      question,
      similarityThreshold,
      indexToUse
    );
  } else {
    console.log('OA: Using pre-fetched query results');
    // If queryResult was provided but we need indexToUse for debug info
    if (pineconeIndexLabel) {
      indexToUse = getIndexNameByLabel(pineconeIndexLabel);
    } else {
      indexToUse = process.env.PINECONE_INDEX_DEV;
    }
  }

  // Build context from query results
  const { context, contextChunkCount } = buildContextFromResults(actualQueryResult);

  // Check if we found any context
  const hasContext = context !== "";

  // If no context and fallback is disabled, return early
  if (!hasContext && !fallbackToGeneralKnowledge) {
    if (isDebug()) {
      console.log("=== Debug Info ===");
      console.log(`Question: ${question}`);
      console.log(`Similarity Threshold: ${similarityThreshold}`);
      console.log(`Fallback to General Knowledge: ${fallbackToGeneralKnowledge}`);
      console.log(`Human-readable Index Name: ${pineconeIndexLabel || 'default'}`);
      console.log(`Actual Pinecone Index: ${indexToUse}`);
      console.log(`Context found: false`);
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

  if (isDebug()) {
    console.log("=== Debug Info ===");
    console.log(`Question: ${question}`);
    console.log(`Similarity Threshold: ${similarityThreshold}`);
    console.log(`Fallback to General Knowledge: ${fallbackToGeneralKnowledge}`);
    console.log(`Human-readable Index Name: ${pineconeIndexLabel || 'default'}`);
    console.log(`Actual Pinecone Index: ${indexToUse}`);
    console.log(`Context found: ${hasContext}`);
    if (hasContext) {
      console.log(`Context length: ${context.length}`);
      console.log(`Number of context chunks: ${contextChunkCount}`);
    }
    console.log("==================");
  }

  // Get answer from OpenAI
  const completion = await OpenAIClientManager.getClient().chat.completions.create({
    model: CHAT_MODEL!,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    temperature: 0.7,
    max_tokens: 500,
  });

  const answer = completion.choices[0]?.message?.content || "I couldn't generate an answer.";

  if (isDebug()) {
    console.log("Generated answer:", answer);
  }

  return answer;
}
