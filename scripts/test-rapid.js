const fetch = require('node-fetch');

const RAPID_KEY = '2f5a4d5f59msh72be683e5a081a4p130050jsn3bc3319b63c4';
const HOST = 'instagram-scraper-2022.p.rapidapi.com'; // Usually the host matches the API name, checking...
// Wait, screenshot says: instagram-scraper.p.rapidapi.com
const REAL_HOST = 'instagram-scraper.p.rapidapi.com';

async function testConfig() {
    console.log('Testing RapidAPI for @dianissimmo...');

    const headers = {
        'x-rapidapi-key': RAPID_KEY,
        'x-rapidapi-host': REAL_HOST
    };

    try {
        // 1. Get User Info (to verify working)
        console.log('\n--- 1. User Info ---');
        // Based on screenshot: getUserDataByUsername
        // Usually /v1/instagram/user_info?username=X or similar
        // Let's guess the path based on typical RapidAPI structures or try to use the one from screenshot if visible
        // Screenshot command shows: https://instagram-scraper.p.rapidapi.com/v1/instagram/media/%7Bshortcode%7D
        // So base is /v1/instagram/...
        
        const userUrl = `https://${REAL_HOST}/v1/instagram/user_info?username=dianissimmo`;
        // Or maybe just /user_info
        
        // Let's try to list endpoints or just try common ones. 
        // Screenshot shows "getUserDataByUsername" on the left.
        
        // Let's try the most common endpoint pattern for this specific API (junioroangel)
        // It seems to be: https://instagram-scraper.p.rapidapi.com/v1/user_info?username=dianissimmo
        
        const response = await fetch(`https://${REAL_HOST}/v1/user_info?username=dianissimmo`, { headers });
        const data = await response.json();
        
        if (!response.ok) {
           console.error('Error fetching user:', response.status, data);
        } else {
           console.log('User found:', data.username, 'ID:', data.id);
           
           // 2. Get Media
           console.log('\n--- 2. Getting Media ---');
           // Endpoint "getMedia" usually implies getting posts
           // Try /v1/timeline?username=... or /v1/user_media?username=...
           // Let's try /v1/media?username=dianissimmo
           
           const mediaUrl = `https://${REAL_HOST}/v1/user_media?username=dianissimmo`; 
           const mediaRes = await fetch(mediaUrl, { headers });
           const mediaData = await mediaRes.json();
           
           console.log('Media response status:', mediaRes.status);
           if (Array.isArray(mediaData)) {
             console.log(`Found ${mediaData.length} items`);
             console.log('First item:', JSON.stringify(mediaData[0], null, 2));
           } else if (mediaData.data && Array.isArray(mediaData.data)) {
             console.log(`Found ${mediaData.data.length} items`);
             console.log('First item:', JSON.stringify(mediaData.data[0], null, 2));
           } else {
             console.log('Structure:', Object.keys(mediaData));
           }
        }

    } catch (e) {
        console.error('Test failed:', e);
    }
}

testConfig();
