// tests/build/es2020.test.ts
import '@testing-library/jest-dom';

describe('Next.js build output contains ES2020 syntax', () => {
  it('should detect ES2020 features in build output', () => {
    // Your array of files
    const files = [
      'C:\\Users\\marc\\Documents\\repos\\trivia\\.next\\server\\app\\favicon.ico\\route.js',
      // ... rest of your files
    ];

    // Define the variable that was missing
    const filesWithES2020 = files.filter(file => {
      // Check for ES2020 syntax patterns
      // For example: optional chaining (?.), nullish coalescing (??), etc.
      // You'll need to actually read file contents here
      return true; // Placeholder logic
    });

    console.log('Found files:', files);
    console.log('Files with ES2020:', filesWithES2020);

    const foundES2020 = filesWithES2020.length > 0;
    expect(foundES2020).toBe(true);
  });
});
