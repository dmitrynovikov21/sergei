/**
 * Process imported posts:
 * 1. Calculate virality scores based on average views
 * 2. Extract headlines via AI (Claude Vision)
 */
import { PrismaClient } from '@prisma/client';
import Anthropic from '@anthropic-ai/sdk';

const prisma = new PrismaClient();
const anthropic = new Anthropic();

const DATASET_ID = '26cd2b59-7ae0-426d-86fb-4abbb15ef846';

async function extractHeadline(imageUrl: string): Promise<string | null> {
    try {
        // Fetch image as base64
        const response = await fetch(imageUrl);
        if (!response.ok) return null;

        const buffer = await response.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');
        const mimeType = response.headers.get('content-type') || 'image/jpeg';

        const message = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 200,
            messages: [{
                role: 'user',
                content: [{
                    type: 'image',
                    source: {
                        type: 'base64',
                        media_type: mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
                        data: base64
                    }
                }, {
                    type: 'text',
                    text: 'Извлеките ЗАГОЛОВОК с обложки этого рилса. Заголовок - это крупный текст поверх изображения. Верните ТОЛЬКО текст заголовка без пояснений. Если заголовка нет - верните "—".'
                }]
            }]
        });

        const textContent = message.content[0];
        if (textContent.type === 'text') {
            const headline = textContent.text.trim();
            return headline === '—' ? null : headline;
        }
        return null;
    } catch (error) {
        console.error('Headline extraction failed:', error);
        return null;
    }
}

async function processAllPosts() {
    console.log('Fetching posts...');

    // Get all posts
    const posts = await prisma.contentItem.findMany({
        where: { datasetId: DATASET_ID },
        select: { id: true, views: true, coverUrl: true }
    });

    console.log(`Found ${posts.length} posts`);

    // Calculate average views for virality
    const totalViews = posts.reduce((sum, p) => sum + (p.views || 0), 0);
    const averageViews = posts.length > 0 ? totalViews / posts.length : 0;

    console.log(`Average views: ${Math.round(averageViews)}`);
    console.log('Processing posts...\n');

    let processed = 0;
    let headlinesExtracted = 0;

    for (const post of posts) {
        try {
            // Calculate virality score
            const viralityScore = averageViews > 0 ? (post.views || 0) / averageViews : null;

            // Extract headline from cover
            let headline: string | null = null;
            if (post.coverUrl) {
                console.log(`[${processed + 1}/${posts.length}] Extracting headline...`);
                headline = await extractHeadline(post.coverUrl);
                if (headline) {
                    headlinesExtracted++;
                    console.log(`  -> "${headline.substring(0, 50)}..."`);
                } else {
                    console.log(`  -> No headline found`);
                }
            }

            // Update post
            await prisma.contentItem.update({
                where: { id: post.id },
                data: {
                    viralityScore,
                    headline,
                    isProcessed: true
                }
            });

            processed++;

            // Small delay to avoid rate limiting
            await new Promise(r => setTimeout(r, 500));

        } catch (error) {
            console.error(`Error processing ${post.id}:`, error);
        }
    }

    console.log(`\n=== PROCESSING COMPLETE ===`);
    console.log(`Processed: ${processed}`);
    console.log(`Headlines extracted: ${headlinesExtracted}`);
    console.log(`Average virality: 1.0 (normalized)`);

    await prisma.$disconnect();
}

processAllPosts().catch(console.error);
