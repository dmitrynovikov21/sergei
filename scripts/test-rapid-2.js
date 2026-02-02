const RAPID_KEY = '2f5a4d5f59msh72be683e5a081a4p130050jsn3bc3319b63c4';
const HOST = 'instagram-scraper.p.rapidapi.com';

async function test() {
    // Try https://instagram-scraper.p.rapidapi.com/user/info
    // According to typical junioroangel endpoints
    const headers = { 'x-rapidapi-key': RAPID_KEY, 'x-rapidapi-host': HOST };

    try {
        // Try getting user info first
        console.log('Fetching user info...');
        const res = await fetch(`https://${HOST}/user/info?username=dianissimmo`, { headers });
        console.log('Status:', res.status);
        if (res.ok) {
            console.log(await res.json());
        } else {
            console.log(await res.text());
        }

        // Try getting media
        // Often it is /media/last_posts or similar
    } catch(e) { console.error(e); }
}
test();
