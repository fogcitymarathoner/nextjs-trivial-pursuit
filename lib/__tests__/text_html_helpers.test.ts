import {extractTextFromHtml} from "../text_html_helpers"

describe('extractTextFromHtml', () => {
  it('should return a string with no HTML tags', () => {
    const text = 'Hello from a paragraph';
    const html = `<article><h1>Title</h1><p>${text}</p></article>`;

    const result = extractTextFromHtml(html);

    expect(result).not.toMatch(/<[^>]+>/);
    expect(result).toContain('Title');
    expect(result).toContain(text);
  });

  it('should decode all common HTML entities', () => {
    const html = '<p>Tom &amp; Jerry &quot;won&quot; &#39;again&#39; &lt;today&gt;&nbsp;OK</p>';

    const result = extractTextFromHtml(html);

    expect(result).toBe('Tom & Jerry "won" \'again\' <today> OK');
  });

  it('should remove script and style contents', () => {
    const html = `
      <style>.hidden { display: none; }</style>
      <p>Visible text</p>
      <script>window.alert('nope')</script>
    `;

    const result = extractTextFromHtml(html);

    expect(result).toBe('Visible text');
  });
});
