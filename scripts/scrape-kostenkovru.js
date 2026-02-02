#!/usr/bin/env node
/**
 * Полный парсинг @kostenkovru - быстрый повтор
 */

require('dotenv').config();
const { ApifyClient } = require('apify-client');
const fs = require('fs');

async function main() {
    const APIFY_TOKEN = process.env.APIFY_TOKEN;
    const IG_USERNAME = process.env.IG_USERNAME;
    const IG_PASSWORD = process.env.IG_PASSWORD;

    const client = new ApifyClient({ token: APIFY_TOKEN });
    const targetProfile = 'kostenkovru';
    const DAYS_LIMIT = 14;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - DAYS_LIMIT);

    console.log(`📱 Парсим @${targetProfile} за ${DAYS_LIMIT} дней`);
    console.log(`📅 Отсечка: ${cutoffDate.toLocaleDateString('ru-RU')}`);
    console.log('━'.repeat(60));

    const input = {
        "directUrls": [`https://www.instagram.com/${targetProfile}/`],
        "resultsType": "posts",
        "resultsLimit": 100, // Снижен лимит для скорости
        "searchType": "user",
        "proxy": {
            "useApifyProxy": true,
            "apifyProxyGroups": ["RESIDENTIAL"]
        },
        "loginUsername": IG_USERNAME,
        "loginPassword": IG_PASSWORD
    };

    console.log('🚀 Запуск...\n');

    try {
        const run = await client.actor("apify/instagram-scraper").call(input, {
            waitSecs: 600 // 10 минут
        });

        console.log(`✅ Статус: ${run.status}`);

        if (run.status === 'SUCCEEDED') {
            const { items } = await client.dataset(run.defaultDatasetId).listItems();
            const validItems = items.filter(i => !i.error);

            console.log(`📦 Всего: ${validItems.length} постов\n`);

            // Фильтр по дате и сортировка
            const recentItems = validItems.filter(item => {
                const postDate = new Date(item.timestamp || item.takenAt);
                return postDate >= cutoffDate;
            }).sort((a, b) => new Date(a.timestamp || a.takenAt) - new Date(b.timestamp || b.takenAt));

            console.log(`📅 За ${DAYS_LIMIT} дней: ${recentItems.length} постов`);
            console.log('━'.repeat(60));

            // Типы
            const types = {};
            recentItems.forEach(item => {
                const type = item.type || item.productType || 'Unknown';
                types[type] = (types[type] || 0) + 1;
            });
            console.log('📊 По типам:', types);

            // Таблица постов
            console.log('\n📋 ВСЕ ПОСТЫ:\n');
            recentItems.forEach((item, i) => {
                const date = new Date(item.timestamp || item.takenAt);
                const type = item.type || item.productType;
                const views = item.videoViewCount || item.videoPlayCount || 0;
                const likes = item.likesCount || 0;
                console.log(`${i + 1}. ${date.toLocaleString('ru-RU')} | ${type} | 👁️${views} ❤️${likes}`);
                console.log(`   🔗 https://www.instagram.com/p/${item.shortCode}/`);
            });

            // Самый старый
            if (recentItems.length > 0) {
                const oldest = recentItems[0];
                console.log('\n━'.repeat(60));
                console.log('🕰️  САМЫЙ СТАРЫЙ ПОСТ:');
                console.log(`   📅 ${new Date(oldest.timestamp || oldest.takenAt).toLocaleString('ru-RU')}`);
                console.log(`   🔗 https://www.instagram.com/p/${oldest.shortCode}/`);
            }

            // Сохраняем
            fs.writeFileSync('/tmp/kostenkovru_posts.json', JSON.stringify(recentItems, null, 2));
            console.log('\n💾 Сохранено в /tmp/kostenkovru_posts.json');
        } else {
            console.log('❌ Статус:', run.status);
        }
    } catch (e) {
        console.error('❌ Ошибка:', e.message);
    }
}

main().catch(console.error);
