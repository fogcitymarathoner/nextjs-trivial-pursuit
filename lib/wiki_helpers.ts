interface WikiPage {
  title: string;
  summary: string;
  text: string;
  fullContent?: string;
}

export async function getWikiPage(title: string, getFullContent: boolean = false): Promise<WikiPage> {
  const headers = {
    'User-Agent': 'TriviaApp/1.0 (marc@example.com) - Learning project',
    'Accept': 'application/json',
    'Api-User-Agent': 'TriviaApp/1.0'
  };

  // First get summary (faster, rate-limit friendly)
  const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  const summaryData = await fetchWithRetry(summaryUrl, headers);

  let fullContent = undefined;

  // Optionally get full content
  if (getFullContent) {
    const contentUrl = `https://en.wikipedia.org/api/rest_v1/page/html/${encodeURIComponent(title)}`;
    try {
      const contentResponse = await fetch(contentUrl, { headers });
      fullContent = await contentResponse.text();
    } catch (error) {
      console.log('Could not fetch full content:', error);
    }
  }

  return {
    title: summaryData.title,
    summary: summaryData.extract,
    text: summaryData.extract,
    fullContent
  };
}

async function fetchWithRetry(url: string, headers: any, maxRetries: number = 3): Promise<any> {
  let delay = 1000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, { headers });

      if (response.status === 429) {
        const retryAfter = response.headers.get('retry-after');
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : delay;

        console.log(`Rate limited. Waiting ${waitTime/1000}s... (Attempt ${attempt}/${maxRetries})`);
        await sleep(waitTime);
        delay *= 2;
        continue;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();

    } catch (error) {
      if (attempt === maxRetries) throw error;
      console.log(`Request failed: ${error.message}. Retrying in ${delay/1000}s...`);
      await sleep(delay);
      delay *= 2;
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}