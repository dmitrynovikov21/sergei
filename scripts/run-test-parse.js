/**
 * Run parsing with IMMEDIATE headline extraction (before URLs expire)
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const PARSER_URL = 'http://localhost:3001/api/scrape';
const HEADLINE_URL = 'http://localhost:3001/api/extract-headline';

async function extractHeadline(imageUrl) {
    if (!imageUrl) return null;
    try {
        const response = await fetch(HEADLINE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageUrl })
        });
        const data = await response.json();
        if (data.success && data.headline) {
            return data.headline;
        }
        return null;
    } catch (e) {
        console.log(`  [OCR Error] ${e.message}`);
        return null;
    }
}

async function scrapeSource(sourceId) {
    const source = await prisma.trackingSource.findUnique({
        where: { id: sourceId },
        include: { dataset: true }
    });

    if (!source) throw new Error('Source not found: ' + sourceId);

    console.log(`\n[Parsing] @${source.username} - ${source.contentTypes} (${source.daysLimit} days)`);

    // Call parser service
    const response = await fetch(PARSER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username: source.username,
            contentTypes: source.contentTypes,
            daysLimit: source.daysLimit,
            fetchLimit: source.fetchLimit
        })
    });

    const data = await response.json();
    console.log(`[Parser] Response: success=${data.success}, posts=${data.posts?.length || 0}`);

    if (!data.success || !data.posts?.length) {
        console.log('[Parser] Error:', data.error);
        return { saved: 0, updated: 0, skipped: 0, errors: [data.error] };
    }

    // Save posts to DB with IMMEDIATE headline extraction
    let saved = 0, updated = 0, skipped = 0;
    const errors = [];

    for (const post of data.posts) {
        const instagramId = post.id || post.shortCode;
        if (!instagramId) { skipped++; continue; }

        const existing = await prisma.contentItem.findFirst({
            where: { instagramId, datasetId: source.datasetId }
        });

        if (existing) {
            await prisma.contentItem.update({
                where: { id: existing.id },
                data: {
                    views: Math.max(0, post.videoPlayCount || post.playCount || 0),
                    likes: Math.max(0, post.likesCount || 0),  // Handle -1 from Apify
                    comments: Math.max(0, post.commentsCount || 0)
                }
            });
            updated++;
        } else {
            try {
                // Extract headline IMMEDIATELY while URL is fresh
                const coverUrl = post.displayUrl;
                console.log(`  Processing ${post.type}: ${instagramId.substring(0, 12)}...`);

                // OCR in separate try-catch - don't fail if headline extraction fails
                let headline = null;
                try {
                    headline = await extractHeadline(coverUrl);
                    if (headline) {
                        console.log(`    Headline: "${headline.substring(0, 50)}${headline.length > 50 ? '...' : ''}"`);
                    }
                } catch (ocrError) {
                    console.log(`    [OCR Error] ${ocrError.message} - saving post without headline`);
                }

                await prisma.contentItem.create({
                    data: {
                        id: require('crypto').randomUUID(),
                        instagramId,
                        originalUrl: post.url || '',
                        sourceUrl: `https://instagram.com/${source.username}`,
                        coverUrl: coverUrl || null,
                        videoUrl: post.videoUrl || null,
                        views: Math.max(0, post.videoPlayCount || post.playCount || 0),
                        likes: Math.max(0, post.likesCount || 0),  // -1 = hidden, convert to 0
                        comments: post.commentsCount || 0,
                        publishedAt: post.timestamp ? new Date(post.timestamp) : new Date(),
                        description: post.caption || null,
                        headline: headline || null,  // Save extracted headline (or null if OCR failed)
                        contentType: post.type || 'Video',
                        datasetId: source.datasetId,
                        isProcessed: !!headline,  // Mark as processed if headline extracted
                        isApproved: false
                    }
                });
                saved++;
                console.log(`  + Created ${post.type}`);
            } catch (e) {
                console.error(`  Error creating post: ${e.message}`);
                errors.push(e.message);
                skipped++;
            }
        }
    }

    // Update lastScrapedAt
    await prisma.trackingSource.update({
        where: { id: sourceId },
        data: { lastScrapedAt: new Date() }
    });

    console.log(`[Result] saved=${saved}, updated=${updated}, skipped=${skipped}`);
    return { saved, updated, skipped, errors };
}

async function main() {
    const sources = [
        '6eb1d93d-9a91-4ecb-8c70-35d03eb91d2c',  // ythemark
        'c770d9db-1fd6-46cc-8134-e45a1277383a'   // kostenkovru
    ];

    console.log('=== Starting Parse Test with Headline Extraction ===');

    for (const sourceId of sources) {
        try {
            await scrapeSource(sourceId);
        } catch (e) {
            console.error('[Error]', e.message);
        }
    }

    // Show final counts
    const total = await prisma.contentItem.count({
        where: { datasetId: 'af3c6f02-643b-45bf-ac79-819a37b6b29f' }
    });
    const withHeadlines = await prisma.contentItem.count({
        where: {
            datasetId: 'af3c6f02-643b-45bf-ac79-819a37b6b29f',
            headline: { not: null }
        }
    });
    console.log(`\n=== Done! Total: ${total}, With Headlines: ${withHeadlines} ===`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
