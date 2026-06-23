import downloadUrlWithSelenium, {type SeleniumDriverLike} from '../selenium_helpers';

describe('downloadUrlWithSelenium', () => {
  const createDriver = (html: string): SeleniumDriverLike => ({
    get: jest.fn().mockResolvedValue(undefined),
    wait: jest.fn(async (condition) => condition()),
    executeScript: jest.fn(async (script: string): Promise<unknown> => {
      if (script === 'return document.readyState') {
        return 'complete';
      }

      if (script === 'return performance.getEntriesByType("resource")') {
        return [{ responseEnd: 1 }];
      }

      return undefined;
    }) as unknown as SeleniumDriverLike['executeScript'],
    findElement: jest.fn().mockResolvedValue({}),
    sleep: jest.fn().mockResolvedValue(undefined),
    getPageSource: jest.fn().mockResolvedValue(html),
  });

  it('should download and extract page text', async () => {
    const driver = createDriver('<html><body><h1>Example Domain</h1></body></html>');

    const result = await downloadUrlWithSelenium('https://example.com', driver);

    expect(result).toBe('Example Domain');
    expect(driver.get).toHaveBeenCalledWith('https://example.com');
    expect(driver.getPageSource).toHaveBeenCalled();
  });

  it('should honor optional wait, scroll, and network-idle settings', async () => {
    const driver = createDriver('<main>Loaded content</main>');

    const result = await downloadUrlWithSelenium('https://example.com', driver, {
      timeout: 5000,
      waitForSelector: 'main',
      scrollToBottom: true,
      waitForNetworkIdle: true,
    });

    expect(result).toBe('Loaded content');
    expect(driver.findElement).toHaveBeenCalledWith({ css: 'main' });
    expect(driver.executeScript).toHaveBeenCalledWith('window.scrollTo(0, document.body.scrollHeight)');
    expect(driver.sleep).toHaveBeenCalledWith(1000);
    expect(driver.executeScript).toHaveBeenCalledWith('return performance.getEntriesByType("resource")');
  });
});
