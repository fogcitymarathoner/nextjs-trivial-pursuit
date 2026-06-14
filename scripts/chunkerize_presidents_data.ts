// assumes data/presidents_clean_urls.json exists

// To run - npx tsx scripts/chunkerize_presidents_data.ts
import { DEBUG, PINECONE_API_KEY, PINECONE_INDEX_DEV } from "@/config/env.server";
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { removeHtmlTagsCheerio } from '@/lib/html_tag_helpers';
import { Pinecone } from '@pinecone-database/pinecone';

// Import helpers (you'll need to create these TypeScript versions)
import { generateChunkId } from '@/lib/chunk_helpers';
import OpenAIClientManager from "@/lib/OpenAIClientManager"
import { getPresidentTitles } from '@/lib/presidential_title_helpers';
import { getWikiPage } from '@/lib/wiki_helpers';
import { PineconeRecord } from "@pinecone-database/pinecone/dist/data/vectors/types";

// Make sure the API key exists
const apiKey = PINECONE_API_KEY;

// Initialize clients
const pc = new Pinecone({
  apiKey: apiKey!
});

const indexName = PINECONE_INDEX_DEV!;
const index = pc.index(indexName);

const ingestPresidentialContent = async (): Promise<void> => {
  const presidentContentTitlesClean = await getPresidentTitles();
  let successCount = 0;
  let failureCount = 0;

  for (const presidentContentTitle of presidentContentTitlesClean) {
    try {
      if (DEBUG === 'true')
        console.log("presidentContentTitle", presidentContentTitle);

      const page = await getWikiPage(presidentContentTitle, true);
      const fullContentPlainText = removeHtmlTagsCheerio(page.fullContent);

      if (DEBUG === 'true') {
        console.log({
          title: page.title,
          summaryPreview: page.summary?.substring(0, 500),
          textPreview: page.text?.substring(0, 500),
          hasFullContent: !!page.fullContent,
          fullContentPreview: page.fullContent?.substring(0, 500),
          fullContentLength: page.fullContent?.length ?? 0,
          fullContentPlainText: fullContentPlainText?.substring(0, 500),
          fullContentPlainTextLength: fullContentPlainText?.length ?? 0
        });
      }

      const wikitext = fullContentPlainText ?? "";

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
        const pageUrl = presidentContentTitle;
        const pineconeNamespace = "pinecode";
        const customerUid = "customer_uid";
        const scrapeVersion = "scrape_version";
        const chunkIndex = idx + 1;
        const links: string[] = [];

        const vector = await OpenAIClientManager.embed(chunkText);

        if (DEBUG === 'true')
          console.log(vector.length, chunkIndex);

        const newUpsert: PineconeRecord = {
          id: generateChunkId(chunkText),
          values: vector,
          metadata: {
            text: chunkText,
            source: "document_name.pdf", // optional extras
            page: 1, // optional extras
            pageUrl, // FIXME: clean these up
            pineconeNamespace,
            customerUid,
            scrapeVersion,
            links
          }
        };

        if (DEBUG === 'true')
          console.log(newUpsert);

        await index.upsert({ records: [newUpsert] });
      }

      successCount++;
      console.log(`✅ Successfully processed ${presidentContentTitle} (${successCount}/${presidentContentTitlesClean.length})`);

    } catch (error) {
      failureCount++;
      console.error(`❌ Error processing ${presidentContentTitle}:`, error);
      console.log(`Progress: ${successCount} succeeded, ${failureCount} failed so far`);
      continue;
    }
  }

  console.log(`\n📊 Final Results: ${successCount} succeeded, ${failureCount} failed out of ${presidentContentTitlesClean.length} total`);
};

// Execute the function in an async IIFE for CommonJS compatibility
(async () => {
  try {
    await ingestPresidentialContent();
    console.log("Done!");
  } catch (error) {
    console.error("Error:", error);
  }
})();