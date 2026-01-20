
const fs = require('fs');
const path = require('path');

function searchFiles(dir) {
    const files = fs.readdirSync(dir);

    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (file === 'node_modules' || file === '.git' || file === '.next') return;

        if (stat.isDirectory()) {
            searchFiles(filePath);
        } else {
            try {
                const content = fs.readFileSync(filePath, 'utf8');
                // Simple IPv4 regex
                const ipRegex = /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g;
                const matches = content.match(ipRegex);
                if (matches) {
                    console.log(`Found IP(s) in ${filePath}:`, matches);
                }

                if (content.includes('root@')) {
                    console.log(`Found 'root@' in ${filePath}`);
                }

                if (content.includes('deploy')) {
                    console.log(`Found 'deploy' in ${filePath}`);
                }
            } catch (e) {
                // Ignore binary files error
            }
        }
    });
}

searchFiles('.');
