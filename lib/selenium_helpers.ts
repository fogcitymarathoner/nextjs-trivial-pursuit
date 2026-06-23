import {extractTextFromHtml} from "@/lib/text_html_helpers"

type SeleniumDownloadOptions = {
  timeout?: number;
  waitForSelector?: string;
  scrollToBottom?: boolean;
  waitForNetworkIdle?: boolean;
};

export type SeleniumDriverLike = {
  get(url: string): Promise<unknown>;
  wait<T>(
    condition: () => T | Promise<T>,
    timeout?: number,
    message?: string
  ): Promise<T>;
  executeScript<T = unknown>(script: string): Promise<T>;
  findElement(locator: { css: string }): Promise<unknown>;
  sleep(ms: number): Promise<unknown>;
  getPageSource(): Promise<string>;
};

const downloadUrlWithSelenium = async (
  url: string,
  driver: SeleniumDriverLike,
  options?: number | SeleniumDownloadOptions
): Promise<string> => {
  const resolvedOptions = typeof options === 'number'
    ? { timeout: options }
    : options ?? {};

  const {
    timeout = 10000,
    waitForSelector,
    scrollToBottom = false,
    waitForNetworkIdle = false
  } = resolvedOptions;

  try {
    // Navigate to URL
    await driver.get(url);

    // Wait for page to load
    await driver.wait(
      async () => {
        const readyState = await driver.executeScript('return document.readyState');
        return readyState === 'complete';
      },
      timeout,
      'Page load timeout'
    );

    // Wait for specific selector if provided
    if (waitForSelector) {
      await driver.wait(
        async () => {
          const element = await driver.findElement({ css: waitForSelector });
          return element !== null;
        },
        timeout,
        `Selector "${waitForSelector}" not found`
      );
    }

    // Scroll to bottom to trigger lazy loading
    if (scrollToBottom) {
      await driver.executeScript('window.scrollTo(0, document.body.scrollHeight)');
      await driver.sleep(1000); // Allow time for lazy content to load
    }

    // Wait for network idle if requested
    if (waitForNetworkIdle) {
      await driver.wait(
        async () => {
          const performanceEntries = await driver.executeScript<Array<{ responseEnd: number }>>(
            'return performance.getEntriesByType("resource")'
          );
          // Check if all resources are loaded
          return performanceEntries.every((entry) =>
            entry.responseEnd > 0
          );
        },
        timeout,
        'Network idle timeout'
      );
    }

    // Get the page source
    const htmlContent = await driver.getPageSource();

    // Extract text from HTML
    const rawText = extractTextFromHtml(htmlContent);

    return rawText;
  } catch (error) {
    console.error('Error downloading URL with Selenium:', error);
    throw error;
  }
};

export default downloadUrlWithSelenium;
