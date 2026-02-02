#!/usr/bin/env node
/**
 * Тест на профиле с большим количеством контента
 */

require('dotenv').config();
const { ApifyClient } = require('apify-client');

async function main() {
    const APIFY_TOKEN = process.env.APIFY_TOKEN;
    const IG_USERNAME = process.env.IG_USERNAME;
    const IG_PASSWORD = process.env.IG_PASSWORD;

    const client = new ApifyClient({ token: APIFY_TOKEN });

    // Популярный профиль с большим количеством постов
    const testProfiles = ['cristiano', 'kyliejenner', 'nike'];
    const targetProfile = testProfiles[0];

    console.log(`📱 Тестируем парсинг популярного профиля: @${targetProfile}`);
    console.log('━'.repeat(60));

    const input = {
        "directUrls": [`https://www.instagram.com/${targetProfile}/`],
        "resultsType": "posts",
        "resultsLimit": 50, // Ограничим для теста
        "searchType": "user",
        "proxy": {
            "useApifyProxy": true,
            "apifyProxyGroups": ["RESIDENTIAL"]
        },
        "loginUsername": IG_USERNAME,
        "loginPassword": IG_PASSWORD
    };

    console.log('🚀 Запускаем...\n');

    try {
        const run = await client.actor("apify/instagram-scraper").call(input, {
            waitSecs: 120
        });

        console.log(`✅ Статус: ${run.status}`);

        if (run.status === 'SUCCEEDED') {
            const { items } = await client.dataset(run.defaultDatasetId).listItems();
            const validItems = items.filter(i => !i.error);

            console.log(`📦 Получено постов: ${validItems.length}\n`);

            if (validItems.length > 0) {
                console.log('📊 Примеры (первые 5):');
                validItems.slice(0, 5).forEach((item, i) => {
                    const date = new Date(item.timestamp || item.takenAt);
                    const views = item.videoViewCount || item.videoPlayCount || 0;
                    const likes = item.likesCount || 0;
                    console.log(`${i + 1}. ${item.shortCode} | ${date.toLocaleDateString('ru-RU')}`);
                    console.log(`   👁️ ${views.toLocaleString()} | ❤️ ${likes.toLocaleString()}`);
                });

                console.log(`\n✅ Парсер работает корректно!`);
                console.log(`   Получено ${validItems.length} постов от @${targetProfile}`);
            }
        } else {
            const log = await client.log(run.id).get();
            console.log('❌ Лог:', log?.substring(log.length - 800));
        }
    } catch (e) {
        console.error('❌ Ошибка:', e.message);
    }
}

main().catch(console.error);
