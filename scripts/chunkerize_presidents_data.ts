// assumes data/presidents_clean_urls.json and data/presidents_non_wikipedia_url.json exist

// To run - npx tsx scripts/chunkerize_presidents_data.ts
import SqliteChunkManager from '@/lib/SqliteChunkManager';

import {DEBUG, PINECONE_API_KEY, PINECONE_INDEX_DEV} from "@/config/env.server";
import {RecursiveCharacterTextSplitter} from '@langchain/textsplitters';
import {removeHtmlTagsCheerio} from '@/lib/html_tag_helpers';
import {Pinecone, type PineconeRecord} from '@pinecone-database/pinecone';

// Import helpers (you'll need to create these TypeScript versions)
import {generateChunkId} from '@/lib/chunk_helpers';
import OpenAIClientManager from "@/lib/OpenAIClientManager"
import {getPresidentTitles} from '@/lib/presidential_title_helpers';
import {getWikiPage} from '@/lib/wiki_helpers';
import fs from 'fs';
import path from 'path';
import {extractTextFromHtml} from "@/lib/text_html_helpers";
import downloadUrlWithSelenium, {type SeleniumDriverLike} from "@/lib/selenium_helpers"

// Get instance of the manager
const chunkManager = SqliteChunkManager.getInstance('data/chunks.db');

// Initialize clients
const pc = new Pinecone({
  apiKey: PINECONE_API_KEY!
});

const indexName = PINECONE_INDEX_DEV!;

const handleInsert = (url: string, chunk_index: number): boolean => {
  try {
    chunkManager.insert({ url, chunk_index });
    console.log('✅ Insert successful');
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
      console.log('✅ Duplicate correctly rejected:', error.message);
      return false;
    }
    throw error;
  }
};
// CHECK IF INDEX EXISTS - EXIT IF NOT
(async function checkIndexExists() {
  try {
    console.log(`\n🔍 Checking if index "${indexName}" exists...`);
    const indexes = await pc.listIndexes();
    const indexExists = indexes.indexes?.some(idx => idx.name === indexName) || false;

    if (!indexExists) {
      console.error(`\n❌ ERROR: Index "${indexName}" does not exist!`);
      console.log(`\n📋 Available indexes:`);
      if (indexes.indexes && indexes.indexes.length > 0) {
        indexes.indexes.forEach(idx => console.log(`   - ${idx.name}`));
      } else {
        console.log(`   (No indexes found)`);
      }
      console.log(`\n💡 To create the index, run:`);
      console.log(`   npx tsx scripts/create_pinecone_index.ts --env-file .env.local`);
      console.log(`\n❌ Exiting script. Please create the index first.\n`);
      process.exit(1);
    }

    console.log(`✅ Index "${indexName}" exists. Proceeding...\n`);
  } catch (error) {
    console.error(`\n❌ Error checking index existence:`, error);
    process.exit(1);
  }
})();

const index = pc.index(indexName);

// Configuration for URL ingestion
const CHUNK_SIZE = parseInt(process.env.CHUNK_SIZE || '1000');
const CHUNK_OVERLAP = parseInt(process.env.CHUNK_OVERLAP || '200');

/**
 * Fetches content from a URL using fetch API with timeout
 */
const fetchUrlContent = async (
  url: string,
  timeout: number = 10000,
  seleniumDriver?: SeleniumDriverLike
): Promise<string> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Content-Ingester/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      // Handle different status codes
      switch (response.status) {
        case 403:
          if (seleniumDriver) {
            console.warn(`Received 403 for ${url}, falling back to Selenium...`);
            return await downloadUrlWithSelenium(url, seleniumDriver, timeout);
          }
          throw new Error(`HTTP 403 Forbidden: ${url} (Selenium fallback not available)`);

        case 429:
          // Too Many Requests - wait and retry with Selenium if available
          if (seleniumDriver) {
            console.warn(`Rate limited for ${url}, waiting 2s then trying Selenium...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
            return await downloadUrlWithSelenium(url, seleniumDriver, timeout);
          }
          throw new Error(`HTTP 429 Too Many Requests: ${url}`);

        default:
          throw new Error(`HTTP ${response.status}: ${response.statusText} for ${url}`);
      }
    }

    const pageHtml = await response.text();
    return pageHtml;
  } catch (error) {
    clearTimeout(timeoutId);

    // Handle fetch-specific errors with Selenium fallback
    if (seleniumDriver && error instanceof Error) {
      const shouldFallback =
        error.name === 'AbortError' ||
        error.message.includes('fetch') ||
        error.message.includes('network') ||
        error.message.includes('ENOTFOUND') ||
        error.message.includes('ECONNREFUSED') ||
        error.message.includes('CORS');

      if (shouldFallback) {
        console.warn(`Fetch error for ${url} (${error.message}), falling back to Selenium...`);
        try {
          return await downloadUrlWithSelenium(url, seleniumDriver, timeout);
        } catch (seleniumError) {
          console.error('Selenium fallback also failed:', seleniumError);
          throw new Error(`Both fetch and Selenium failed for ${url}: ${error.message}`);
        }
      }
    }

    throw error;
  }
};
/**
 * Save a snapshot of content to disk for debugging
 */
function saveSnapshot(url: string, content: string, type: 'html' | 'text'): void {
  if (DEBUG !== 'true') return;

  const snapshotDir = path.resolve(process.cwd(), 'snapshots');
  if (!fs.existsSync(snapshotDir)) {
    fs.mkdirSync(snapshotDir, { recursive: true });
  }

  const urlSlug = url.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 100);
  const filename = `${urlSlug}_${Date.now()}.${type === 'html' ? 'html' : 'txt'}`;
  const filepath = path.join(snapshotDir, filename);

  fs.writeFileSync(filepath, content);
  console.log(`📸 Snapshot saved: ${filepath}`);
}

/**
 * Ingest content from non-Wikipedia URLs
 */
const ingestPresidentialWebContent = async (): Promise<void> => {
  const jsonPath = path.resolve(process.cwd(), 'data/presidents_non_wikipedia_url.json');

  // 1. Read the JSON file
  if (!fs.existsSync(jsonPath)) {
    console.error(`❌ File not found: ${jsonPath}`);
    console.log(`💡 Please ensure data/presidents_non_wikipedia_url.json exists`);
    return;
  }

  const fileContent = fs.readFileSync(jsonPath, 'utf-8');
  const urls: string[] = JSON.parse(fileContent);

  if (!Array.isArray(urls) || urls.length === 0) {
    console.error(`❌ Invalid JSON: expected an array of URLs`);
    return;
  }

  console.log(`\n🚀 Starting URL ingestion from ${jsonPath}`);
  console.log(`📋 Found ${urls.length} URLs to process`);
  console.log(`⚙️  Chunk size: ${CHUNK_SIZE}, Overlap: ${CHUNK_OVERLAP}`);
  console.log('='.repeat(80));

  let successCount = 0;
  let failureCount = 0;

  // 2. Process each URL
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    console.log(`\n📄 [${i + 1}/${urls.length}] Processing: ${url}`);

    try {
      if (DEBUG === 'true')
        console.log(`Processing URL: ${url}`);

      // 1. Fetch the HTML content
      const html = await fetchUrlContent(url);

      if (DEBUG === 'true') {
        saveSnapshot(url, html, 'html');
      }

      // 2. Extract plain text from HTML
      const plainText = extractTextFromHtml(html);

      if (DEBUG === 'true') {
        console.log(`📝 Extracted ${plainText.length} characters of text`);
        saveSnapshot(url, plainText, 'text');
        console.log({
          url,
          hasContent: !!plainText,
          contentPreview: plainText?.substring(0, 500),
          contentLength: plainText?.length ?? 0
        });
      }

      // Skip if extracted text is too short
      if (plainText.length < 100) {
        console.warn(`⚠️  Extracted text too short (${plainText.length} chars), skipping ${url}`);
        failureCount++;
        continue;
      }

      // 3. Split text into chunks
      const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: CHUNK_SIZE,
        chunkOverlap: CHUNK_OVERLAP,
      });

      if (DEBUG === 'true')
        console.log(`DEBUG: Splitting text of length ${plainText.length}`);

      const chunks = await textSplitter.splitText(plainText);

      if (DEBUG === 'true')
        console.log(`DEBUG: Split text into ${chunks.length} chunks`);

      // 4. Process each chunk: check for duplicates, embed, and upsert
      for (let idx = 0; idx < chunks.length; idx++) {
        const chunkText = chunks[idx];
        const chunkIndex = idx + 1;

        // Check if this chunk already exists in SQLite (duplicate guard)
        const existing = chunkManager.getByUrlAndChunkIndex(url, idx);
        if (existing) {
          console.log(`⏭️  [${chunkIndex}/${chunks.length}] Chunk already exists, skipping: ${url} (ID: ${existing.id})`);
          continue; // Skip this chunk
        }

        if (DEBUG === 'true') {
          console.log(`⏳ Embedding chunk ${chunkIndex}/${chunks.length}...`);
        }

        // Generate embedding
        const vector = await OpenAIClientManager.embed(chunkText);

        if (DEBUG === 'true')
          console.log(`Vector length: ${vector.length}, chunk: ${chunkIndex}`);

        // Prepare metadata
        const pageUrl = url;
        const pineconeNamespace = "pinecode";
        const customerUid = "customer_uid";
        const scrapeVersion = "scrape_version";
        const links: string[] = [];

        // Create Pinecone record
        const newUpsert: PineconeRecord = {
          id: generateChunkId(chunkText),
          values: vector,
          metadata: {
            text: chunkText,
            source: "document_name.pdf",
            page: 1,
            pageUrl,
            pineconeNamespace,
            customerUid,
            scrapeVersion,
            links,
            sourceType: 'webpage',
            chunkIndex: chunkIndex,
            totalChunks: chunks.length,
          }
        };

        if (DEBUG === 'true')
          console.log(newUpsert);

        // Upsert to Pinecone
        await index.upsert({ records: [newUpsert] });

        // Save to SQLite after successful Pinecone upsert
        try {
          handleInsert(url, idx);
          if (DEBUG === 'true') {
            console.log(`✅ Saved to SQLite: url=${url} index=${idx}`);
          }
        } catch (sqliteError) {
          console.error(`❌ Failed to save chunk to SQLite: ${sqliteError}`);
          // Continue processing - don't fail the whole URL
        }

        console.log(`✅ [${chunkIndex}/${chunks.length}] Chunk embedded and upserted`);
      }

      successCount++;
      console.log(`✅ Successfully processed ${url} (${successCount}/${urls.length})`);

    } catch (error) {
      failureCount++;
      console.error(`❌ Error processing ${url}:`, error);
      console.log(`Progress: ${successCount} succeeded, ${failureCount} failed so far`);
      continue;
    }
  }

  // 3. Summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 URL INGESTION FINAL RESULTS');
  console.log('='.repeat(80));
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${failureCount}`);
  console.log(`📝 Total: ${urls.length}`);
  console.log(`📈 Success rate: ${((successCount / urls.length) * 100).toFixed(1)}%`);

  // 4. Save detailed results to file
  const resultsPath = path.resolve(process.cwd(), 'data/url_ingestion_results.json');
  const resultsData = {
    generatedAt: new Date().toISOString(),
    total: urls.length,
    successful: successCount,
    failed: failureCount,
  };

  fs.writeFileSync(resultsPath, JSON.stringify(resultsData, null, 2));
  console.log(`\n💾 Results saved to: ${resultsPath}`);

  console.log('\n✨ URL ingestion complete!');
};

/**
 * Ingest content from Wikipedia articles
 */
/**
 * Ingest content from Wikipedia articles
 */
const ingestPresidentialWikiContent = async (): Promise<void> => {
  const presidentContentTitlesClean = await getPresidentTitles();
  let successCount = 0;
  let failureCount = 0;

  console.log(`\n🚀 Starting Wikipedia ingestion`);
  console.log(`📋 Found ${presidentContentTitlesClean.length} Wikipedia articles to process`);
  console.log(`⚙️  Chunk size: ${process.env.CHUNK_SIZE}, Overlap: ${process.env.CHUNK_OVERLAP}`);
  console.log('='.repeat(80));

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

      // Process each chunk: check for duplicates, embed, and upsert
      for (let idx = 0; idx < chunks.length; idx++) {
        const chunkText = chunks[idx];
        const pageUrl = presidentContentTitle;
        const pineconeNamespace = "pinecode";
        const customerUid = "customer_uid";
        const scrapeVersion = "scrape_version";
        const chunkIndex = idx + 1;
        const links: string[] = [];

        // ✅ DUPLICATE CHECK: Skip if chunk already exists in SQLite
        const existing = chunkManager.getByUrlAndChunkIndex(pageUrl, idx);
        if (existing) {
          console.log(`⏭️  [${chunkIndex}/${chunks.length}] Chunk already exists, skipping: ${pageUrl} (ID: ${existing.id})`);
          continue; // Skip to next chunk
        }

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

        // ✅ SAVE TO SQLITE: Record the chunk after successful upsert
        try {
          handleInsert(pageUrl, idx);
          if (DEBUG === 'true') {
            console.log(`✅ Saved to SQLite: url=${pageUrl} index=${idx}`);
          }
        } catch (sqliteError) {
          console.error(`❌ Failed to save chunk to SQLite: ${sqliteError}`);
          // Continue processing - don't fail the whole article
        }

        console.log(`✅ [${chunkIndex}/${chunks.length}] Chunk embedded and upserted`);
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

  console.log(`\n📊 WIKI INGESTION FINAL RESULTS: ${successCount} succeeded, ${failureCount} failed out of ${presidentContentTitlesClean.length} total`);
};

// Execute both functions in sequence
(async () => {
  try {
    // First ingest Wikipedia content
    await ingestPresidentialWikiContent();
    console.log("\n✅ Wikipedia ingestion complete!");

    // Then ingest web content from URLs
    await ingestPresidentialWebContent();
    console.log("\n✅ Web content ingestion complete!");

    console.log("\n🎉 All ingestion complete!");
  } catch (error) {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  }
})();
