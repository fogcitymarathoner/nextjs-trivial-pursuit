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
  CHAT_MODEL} from "@/src/config/env";


export async function queryPinecone(
  question: string
): Promise<QueryResponse<RecordMetadata> | null> {
  const query_embedding = await getOpenAIEmbedding(question);
  const result = await getPineconeIndex().query({
    vector: query_embedding,
    topK: 3,
    includeValues: false,
    includeMetadata: true,
  });

  if (result.matches && result.matches.length > 0) {
    if (DEBUG === 'true') {
      console.log(`Top matches for '${question}':`);
      for (const match of result.matches) {
        console.log(match);
        // Ensure text is a string before slicing
        let text = match.metadata?.text;
        if (typeof text !== "string") text = String(text ?? "");
        if (DEBUG === 'true')
          console.log(
            `ID: ${match.id}\n` +
            `Score: ${match.score}\n` +
            `Page: ${match.metadata?.page}\n` +
            `Source: ${match.metadata?.source}\n` +
            `Text (truncated): ${text.slice(0, 200)}...`
          );
      }
    }
    return result;
  } else {
    console.log(`No matches found for '${question}'`);
    return null;
  }
}



/**
 * Generates an answer to a question using context from Pinecone and OpenAI chat completion.
 * @param question The question to answer
 * @param index Pinecone Index instance
 * @param embeddingModel The OpenAI embedding model to use for query
 * @param chatModel The OpenAI chat model to use for answer generation
 * @returns Promise<string> The generated answer
 */
export async function getAnswer(
  question: string
): Promise<string> {
  // Query Pinecone for relevant context
  const queryResult = await queryPinecone(
    question
  );

  // Build context from query results
  let context = "";
  if (queryResult && queryResult.matches) {
    const contextParts: string[] = [];
    
    for (const match of queryResult.matches) {
      const text = match.metadata?.text;
      const source = match.metadata?.source;
      const page = match.metadata?.page;
      
      if (text) {
        let contextPart = `Source: ${source || "Unknown"}`;
        if (page) {
          contextPart += `, Page: ${page}`;
        }
        contextPart += `\nContent: ${text}\n`;
        contextParts.push(contextPart);
      }
    }
    
    context = contextParts.join("\n---\n");
  }

  // Create the prompt for chat completion
  const systemPrompt = "You are a helpful assistant that answers questions based on the provided context. " +
    "If the context doesn't contain enough information to answer the question, say so clearly.";

  let userPrompt: string;
  if (context) {
    userPrompt = `Context:\n${context}\n\nQuestion: ${question}\n\nPlease answer the question based on the context provided above.`;
  } else {
    userPrompt = `Question: ${question}\n\nI couldn't find any relevant context to answer this question. Please provide a general response.`;
  }

  if (DEBUG === 'true') {
    console.log("=== Debug Info ===");
    console.log("Question:", question);
    console.log("Context found:", !!context);
    if (context) {
      console.log("Context length:", context.length);
    }
    console.log("==================");
  }

  // Get answer from OpenAI
  const completion = await getOpenAIClient().chat.completions.create({
    model: CHAT_MODEL! ,
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
