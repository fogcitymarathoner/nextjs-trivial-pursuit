process.env.PORT = process.env.PLAYWRIGHT_PORT ?? '3000';
process.env.HOSTNAME = process.env.PLAYWRIGHT_HOST ?? '127.0.0.1';

await import('../.next/standalone/server.js');
