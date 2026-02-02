#!/usr/bin/env node
/**
 * Полный парсинг всех постов за 14 дней
 */

require('dotenv').config();

const { ApifyClient } = require('apify-client');

async function main() {
    const APIFY_TOKEN = process.env.APIFY_TOKEN;
    const client = new ApifyClient({ token: APIFY_TOKEN });
    const targetUsername = 'd_vycheslavovich';
    const DAYS_LIMIT = 14;

    // Дата отсечки: 14 дней назад
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - DAYS_LIMIT);
    console.log(`📅 Дата отсечки: ${cutoffDate.toISOString()}`);

    console.log(`📱 Парсим ВСЕ посты @${targetUsername} за последние ${DAYS_LIMIT} дней`);
    console.log('━'.repeat(60));

    const input = {
        "directUrls": [`https://www.instagram.com/${targetUsername}/`],
        "resultsType": "posts",
        "resultsLimit": 500, // Увеличиваем лимит для полного скачивания
        "searchType": "user",
        "proxy": {
            "useApifyProxy": true,
            "apifyProxyGroups": ["RESIDENTIAL"]
        }
    };

    console.log('🚀 Запускаем актор с увеличенным лимитом (500 постов)...\n');

    try {
        const run = await client.actor("apify/instagram-scraper").call(input, {
            waitSecs: 180 // 3 минуты таймаут
        });

        console.log(`✅ Статус: ${run.status}`);

        if (run.status === 'SUCCEEDED') {
            const { items } = await client.dataset(run.defaultDatasetId).listItems();
            const validItems = items.filter(i => !i.error);

            console.log(`📦 Всего получено: ${validItems.length} постов\n`);

            // Фильтруем по дате
            const recentItems = validItems.filter(item => {
                const postDate = new Date(item.timestamp || item.takenAt);
                return postDate >= cutoffDate;
            });

            console.log(`📅 За последние ${DAYS_LIMIT} дней: ${recentItems.length} постов\n`);
            console.log('━'.repeat(60));

            // Показываем все посты с деталями
            recentItems.forEach((item, i) => {
                const postDate = new Date(item.timestamp || item.takenAt);
                const type = item.type || item.productType || 'Unknown';
                const views = item.videoViewCount || item.videoPlayCount || 0;
                const likes = item.likesCount || item.likes || 0;
                const comments = item.commentsCount || item.comments || 0;

                // Обложка / первое изображение
                const coverUrl = item.displayUrl || item.thumbnailUrl || item.imageUrl || 'N/A';
                const caption = (item.caption || '').substring(0, 80);

                console.log(`${i + 1}. ${item.shortCode || item.id}`);
                console.log(`   📅 ${postDate.toLocaleString('ru-RU')}`);
                console.log(`   📹 Тип: ${type}`);
                console.log(`   👁️ Просмотры: ${views.toLocaleString()}`);
                console.log(`   ❤️ Лайки: ${likes.toLocaleString()}`);
                console.log(`   💬 Комменты: ${comments.toLocaleString()}`);
                console.log(`   🖼️ Обложка: ${coverUrl.substring(0, 60)}...`);
                console.log(`   📝 Описание: ${caption}...`);
                console.log('');
            });

            // Суммарная статистика
            const totalViews = recentItems.reduce((sum, i) => sum + (i.videoViewCount || i.videoPlayCount || 0), 0);
            const totalLikes = recentItems.reduce((sum, i) => sum + (i.likesCount || i.likes || 0), 0);

            console.log('━'.repeat(60));
            console.log(`📊 ИТОГО за ${DAYS_LIMIT} дней:`);
            console.log(`   Постов: ${recentItems.length}`);
            console.log(`   Просмотров: ${totalViews.toLocaleString()}`);
            console.log(`   Лайков: ${totalLikes.toLocaleString()}`);

            // Сохраняем JSON для анализа
            const fs = require('fs');
            fs.writeFileSync('/tmp/instagram_posts.json', JSON.stringify(recentItems, null, 2));
            console.log('\n💾 Данные сохранены в /tmp/instagram_posts.json');
        }
    } catch (e) {
        console.error('❌ Ошибка:', e.message);
    }
}

main().catch(console.error);
