import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const libDir = path.join(__dirname, 'lib');

const urlRegex = /https?:\/\/[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}(?:\/[^\s'"]*)?/g;

function findJsFiles(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(findJsFiles(file));
        } else if (file.endsWith('.js') || file.endsWith('.json')) {
            results.push(file);
        }
    });
    return results;
}

const files = findJsFiles(libDir);
const allUrls = new Set();
const fileToUrl = new Map();

for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    let match;
    while ((match = urlRegex.exec(content)) !== null) {
        let url = match[0];
        // Clean up trailing punctuation if any
        url = url.replace(/[.,;)]$/, '');
        
        // Exclude image files and internal/mock domains
        const lowerUrl = url.toLowerCase();
        if (
            lowerUrl.match(/\.(jpg|jpeg|png|gif|svg|webp)$/) ||
            lowerUrl.includes('localhost') ||
            lowerUrl.includes('placeholder') ||
            lowerUrl.includes('supabase.co') ||
            lowerUrl.includes('gorgona-one.com') ||
            lowerUrl.includes('example.com')
        ) {
            continue;
        }

        allUrls.add(url);
        if (!fileToUrl.has(url)) fileToUrl.set(url, []);
        fileToUrl.get(url).push(path.basename(file));
    }
}

console.log(`Found ${allUrls.size} unique external links to test.\\n`);

async function checkUrl(url) {
    return new Promise((resolve) => {
        const client = url.startsWith('https') ? https : http;
        
        const req = client.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
            },
            timeout: 8000
        }, (res) => {
            // Some servers return 403 for scripts, treat 200-399 and 403 as "likely exists but protected", 
            // but log exactly what it is. 404 is definitely broken.
            resolve({ url, status: res.statusCode });
        }).on('error', (err) => {
            resolve({ url, status: 'ERROR', error: err.message });
        }).on('timeout', () => {
            req.destroy();
            resolve({ url, status: 'TIMEOUT' });
        });
    });
}

async function run() {
    const results = [];
    const urlsToTest = Array.from(allUrls);
    
    // Batch processing to avoid socket exhaustion
    const BATCH_SIZE = 5;
    for (let i = 0; i < urlsToTest.length; i += BATCH_SIZE) {
        const batch = urlsToTest.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.all(batch.map(checkUrl));
        results.push(...batchResults);
        
        // Log progress
        batchResults.forEach(r => {
            const files = fileToUrl.get(r.url).join(', ');
            if (r.status >= 200 && r.status < 400) {
                console.log(`[OK] ${r.status} - ${r.url}`);
            } else {
                console.log(`[FAILED] ${r.status} - ${r.url} (Found in: ${files})`);
                if (r.error) console.log(`   Error: ${r.error}`);
            }
        });
    }

    const broken = results.filter(r => r.status >= 400 || typeof r.status === 'string');
    
    console.log(`\\n--- SUMMARY ---`);
    console.log(`Total checked: ${results.length}`);
    console.log(`Broken / Unreachable: ${broken.length}`);
    
    fs.writeFileSync('link_check_results.json', JSON.stringify({
        total: results.length,
        broken: broken.map(b => ({
            ...b,
            files: fileToUrl.get(b.url)
        }))
    }, null, 2));
}

run();
