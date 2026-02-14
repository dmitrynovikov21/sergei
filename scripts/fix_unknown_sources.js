const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
const re = /instagram\.com\/([^\/]+)/;

const COMPETITORS = ['romanpopular', 'wowviking', 'dobfox', 'psy.gleb', 'neiro_gleb', 'nina_khodakovskaya', 'polishuk01', 'vladimir__hack', 'theivansergeev', 'themayeralexander'];

async function go() {
    const MAIN_ID = '26cd2b59-7ae0-426d-86fb-4abbb15ef846';
    const DS50K_ID = '1ac12945-7926-4409-a36a-6b1b6d35dcb6';

    // 1. Get ALL items from main dataset
    const allMain = await p.contentItem.findMany({
        where: { datasetId: MAIN_ID },
        select: { instagramId: true, sourceUrl: true, description: true }
    });
    console.log('Main dataset items:', allMain.length);

    // Identify broken items
    const broken = allMain.filter(i => {
        if (!i.sourceUrl) return true;
        const m = i.sourceUrl.match(re);
        return !m || m[1] === 'p' || m[1] === 'reel';
    });
    console.log('Broken in main:', broken.length);

    // 2. Strategy 1: Check @mentions in descriptions
    const mentionRe = /@([a-zA-Z0-9_.]+)/g;
    const fixesMain = new Map(); // instagramId -> username
    let mentionFixes = 0;

    for (const item of broken) {
        if (!item.description) continue;
        const mentions = [...item.description.matchAll(mentionRe)].map(m => m[1].toLowerCase());
        const self = COMPETITORS.find(c => mentions.includes(c.toLowerCase()));
        if (self) {
            fixesMain.set(item.instagramId, self);
            mentionFixes++;
        }
    }
    console.log('Fixed via @mention in description:', mentionFixes);

    // 3. Strategy 2: Check if broken items were harvested through specific tracking source
    // Each tracking source logs which posts it found. Check parse_history items
    const sources = await p.trackingSource.findMany({
        where: { datasetId: MAIN_ID },
        select: { id: true, username: true }
    });

    // Items without fixes yet - check description for competitor-specific keywords
    const remainingBroken = broken.filter(b => !fixesMain.has(b.instagramId));
    console.log('Still unfixed after @mentions:', remainingBroken.length);

    // 4. Strategy 3: Build sourceUrl shortcode -> username mapping from GOOD items
    const goodItems = allMain.filter(i => {
        if (!i.sourceUrl) return false;
        const m = i.sourceUrl.match(re);
        return m && m[1] !== 'p' && m[1] !== 'reel';
    });
    console.log('\nGood items in main:', goodItems.length);
    const goodUsers = {};
    goodItems.forEach(i => {
        const m = i.sourceUrl.match(re);
        goodUsers[m[1]] = (goodUsers[m[1]] || 0) + 1;
    });
    console.log('Good usernames distribution:', goodUsers);

    // 5. Apply fixes to MAIN dataset
    const mainFixCount = fixesMain.size;
    if (mainFixCount > 0) {
        console.log('\nApplying', mainFixCount, 'fixes to main dataset...');
        for (const [igId, username] of fixesMain) {
            await p.contentItem.updateMany({
                where: { instagramId: igId, datasetId: MAIN_ID },
                data: { sourceUrl: 'https://www.instagram.com/' + username + '/' }
            });
        }
        console.log('Main dataset fixed:', mainFixCount);
    }

    // 6. Now fix 50K+ dataset using same mapping
    // Get broken 50K+ items
    const items50k = await p.contentItem.findMany({
        where: { datasetId: DS50K_ID },
        select: { id: true, instagramId: true, sourceUrl: true }
    });

    const broken50k = items50k.filter(i => {
        if (!i.sourceUrl) return true;
        const m = i.sourceUrl.match(re);
        return !m || m[1] === 'p' || m[1] === 'reel';
    });
    console.log('\n50K+ broken items:', broken50k.length);

    let fixed50k = 0;
    for (const item of broken50k) {
        const baseId = item.instagramId.replace(/_50k$/, '');
        const username = fixesMain.get(baseId);
        if (username) {
            await p.contentItem.update({
                where: { id: item.id },
                data: { sourceUrl: 'https://www.instagram.com/' + username + '/' }
            });
            fixed50k++;
        }
    }
    console.log('Fixed 50K+ items:', fixed50k);
    console.log('Remaining unfixed 50K+:', broken50k.length - fixed50k);

    // 7. Summary
    console.log('\n=== SUMMARY ===');
    console.log('Main dataset: fixed', mainFixCount, 'of', broken.length, 'broken items');
    console.log('50K+ dataset: fixed', fixed50k, 'of', broken50k.length, 'broken items');
    console.log('Total remaining unfixed:', (broken.length - mainFixCount) + (broken50k.length - fixed50k));

    await p.$disconnect();
    process.exit(0);
}

go().catch(e => { console.error(e); process.exit(1) });
