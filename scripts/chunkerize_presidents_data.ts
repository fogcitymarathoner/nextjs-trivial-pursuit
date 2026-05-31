// assumes data/presidents_clean_urls.json exists
// created by access_gdrive_by_service_account.ts

import {DEBUG, PINECONE_API_KEY} from "@/src/config/env";
import {RecursiveCharacterTextSplitter} from '@langchain/textsplitters';
import OpenAI from 'openai';
import {Pinecone} from '@pinecone-database/pinecone';

// Import helpers (you'll need to create these TypeScript versions)
import {embed, generateChunkId} from '../lib/chunk_helpers';
import {recreateIndex} from '../lib/pinecone_helpers';
import {getPresidentTitles} from '../lib/presidential_title_helpers';
import {getWikiPage} from '../lib/wiki_helpers';
import {PineconeRecord} from "@pinecone-database/pinecone/dist/data/vectors/types";

// Make sure the API key exists
const apiKey = PINECONE_API_KEY;

if (!apiKey) {
  throw new Error('Pinecone API key is missing. Set PINECONE_API_KEY in .env');
}
// Initialize clients
const pc = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!
});

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
});

const indexName = process.env.PINECONE_INDEX_DEV!;
const embeddingVectorDimensions = process.env.VECTOR_SIZE;


const index = pc.index(indexName);

async function ingestPresidentialContent(): Promise<void> {
  const presidentContentTitlesClean = await getPresidentTitles();

  for (const presidentContentTitle of presidentContentTitlesClean) {
    if (DEBUG === 'true')
      console.log("presidentContentTitle", presidentContentTitle);

    const page = await getWikiPage(presidentContentTitle);
    if (DEBUG === 'true') {
      console.log(page)
      console.log("Title:", page.title);
      console.log("Summary:", page.summary.substring(0, 500));
      console.log("Full text:", page.text.substring(0, 500));
    }
    const wikitext = page.text;

    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: parseInt(process.env.CHUNK_SIZE!),
      chunkOverlap: parseInt(process.env.CHUNK_OVERLAP!)
    });
    if (DEBUG === 'true')
      console.log(`DEBUG: Splitting text of length ${wikitext.length}`);
    const chunks = await textSplitter.splitText(wikitext);
    if (DEBUG === 'true')
      console.log(`DEBUG: Split text into ${chunks.length} chunks`);

    // Initialize OpenAI embeddings
    for (let idx = 0; idx < chunks.length; idx++) {
      const chunkText = chunks[idx];
      const pageUrl = presidentContentTitlesClean[0];
      const pineconeNamespace = "pinecode";
      const customerUid = "customer_uid";
      const scrapeVersion = "scrape_version";
      const chunkIndex = idx + 1;
      const links: string[] = [];

      const vector = await embed(chunkText);
      if (DEBUG === 'true')
        console.log(vector.length, chunkIndex);
      const newUpsert: PineconeRecord = {
        id: generateChunkId(chunkText),
        values: vector,
        metadata: {
          text: chunkText,
          source: "document_name.pdf", // optional extras
          page: 1 // optional extras
        }
      }
      if (DEBUG === 'true')
        console.log(newUpsert);
      await index.upsert({ records: [newUpsert] });
    }
  }
}

// Execute the function in an async IIFE for CommonJS compatibility
(async () => {
  try {
    // Delete and recreate index if needed
    if (true) {
      await recreateIndex(pc, indexName);;
    }
    await ingestPresidentialContent();
    console.log("Done!");
  } catch (error) {
    console.error("Error:", error);
  }
})();