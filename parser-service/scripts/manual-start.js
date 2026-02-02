require('dotenv').config({ path: '../.env' }); // Adjust path if needed, but usually parser-service/scripts/.. is parser-service
// Actually, index.js loads .env from current dir. scripts/ is inside.
// Let's assume cwd is parser-service root.

const { triggerUpdates } = require('../scheduler');

(async () => {
    console.log('Manually triggering scheduler...');
    try {
        await triggerUpdates();
        console.log('Done triggering. Check worker logs.');
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
})();
