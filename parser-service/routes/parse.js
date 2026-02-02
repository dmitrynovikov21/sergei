const express = require('express');
const router = express.Router();
const { scrapeInstagram } = require('../lib/apify');
const { extractHeadlineFromCover } = require('../lib/vision');

// POST /api/scrape
// Scrape Instagram profile for posts
router.post('/scrape', async (req, res) => {
    try {
        const { username, limit = 20, daysLimit = 30, igUsername, igPassword, contentTypes } = req.body;

        if (!username) {
            return res.status(400).json({
                success: false,
                error: 'Username is required'
            });
        }

        const credentials = {};
        if (igUsername && igPassword) {
            credentials.igUsername = igUsername;
            credentials.igPassword = igPassword;
        }

        const posts = await scrapeInstagram(username, limit, daysLimit, credentials, contentTypes);

        if (!posts || posts.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'No posts found',
                posts: []
            });
        }

        res.json({
            success: true,
            posts,
            count: posts.length
        });
    } catch (error) {
        console.error('Scrape endpoint error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Scraping failed'
        });
    }
});

// POST /api/extract-headline
// Extract headline from image using Claude Vision
router.post('/extract-headline', async (req, res) => {
    try {
        const { imageUrl } = req.body;

        if (!imageUrl) {
            return res.status(400).json({
                success: false,
                error: 'imageUrl is required'
            });
        }

        const headline = await extractHeadlineFromCover(imageUrl);

        res.json({
            success: true,
            headline
        });
    } catch (error) {
        console.error('Extract headline error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Headline extraction failed'
        });
    }
});

module.exports = router;
