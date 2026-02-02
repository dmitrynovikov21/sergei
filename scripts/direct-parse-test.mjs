/**
 * Direct parsing test without queue
 */

// Use dynamic imports to handle TypeScript
async function main() {
    const { PrismaClient } = await import('@prisma/client')
    const { scrapeInstagram } = await import('../lib/parser/parser-client.js')

    const prisma = new PrismaClient()

    try {
        const source = await prisma.trackingSource.findFirst({
            where: { username: 'd_vycheslavovich' }
        })

        if (!source) {
            console.log('❌ Source not found')
            return
        }

        console.log('📋 Source:', source.username)
        console.log('⚙️  Settings:')
        console.log('   - minViewsFilter:', source.minViewsFilter)
        console.log('   - daysLimit:', source.daysLimit)
        console.log('   - contentTypes:', source.contentTypes)
        console.log('')

        console.log('🚀 Starting direct scrape (bypassing queue)...')
        console.log('   Using 60-day limit to get more posts')
        console.log('')

        const posts = await scrapeInstagram(source.username, 20, 60)

        console.log('')
        console.log('✅ Scraping complete!')
        console.log('📊 Results:')
        console.log('   - Posts found:', posts.length)

        if (posts.length > 0) {
            console.log('')
            console.log('📝 Sample posts:')
            posts.slice(0, 3).forEach((post, i) => {
                const views = post.videoPlayCount || post.playCount || post.videoViewCount || post.viewCount || 0
                console.log(`   ${i + 1}. Type: ${post.type}, Views: ${views}, Date: ${post.timestamp}`)
            })
        }

    } finally {
        await prisma.$disconnect()
    }
}

main().catch(console.error)
