require('dotenv').config();
const { worker } = require('./lib/worker');

console.log('[Worker-Entry] Worker process initialized and listening for jobs.');

// Handle graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM signal received: closing worker');
    await worker.close();
});
