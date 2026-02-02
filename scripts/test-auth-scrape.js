#!/usr/bin/env node
/**
 * Тест парсинга с авторизованным аккаунтом Instagram
 */

require('dotenv').config();

const { ApifyClient } = require('apify-client');

async function main() {
    const APIFY_TOKEN = process.env.APIFY_TOKEN;
    const IG_USERNAME = process.env.IG_USERNAME;
    const IG_PASSWORD = process.env.IG_PASSWORD;
    const IG_2FA = process.env.IG_2FA_SECRET;

    console.log('🔧 Настройки:');
    console.log(`   APIFY_TOKEN: ${APIFY_TOKEN?.substring(0, 8)}...`);
    console.log(`   IG_USERNAME: ${IG_USERNAME}`);
    console.log(`   IG_PASSWORD: ${IG_PASSWORD ? '***' : 'не установлен'}`);
    console.log(`   IG_2FA: ${IG_2FA ? IG_2FA.substring(0, 8) + '...' : 'не установлен'}`);
    console.log('');

    if (!IG_USERNAME || !IG_PASSWORD) {
        console.error('❌ IG_USERNAME и IG_PASSWORD не установлены в .env');
        process.exit(1);
    }

    const client = new ApifyClient({ token: APIFY_TOKEN });
    const targetUsername = 'd_vycheslavovich';
    const DAYS_LIMIT = 14;

    console.log(`📱 Парсим @${targetUsername} за ${DAYS_LIMIT} дней С АВТОРИЗАЦИЕЙ`);
    console.log('━'.repeat(60));

    const input = {
        "directUrls": [`https://www.instagram.com/${targetUsername}/`],
        "resultsType": "posts",
        "resultsLimit": 500,
        "searchType": "user",
        "proxy": {
            "useApifyProxy": true,
            "apifyProxyGroups": ["RESIDENTIAL"]
        },
        // Авторизация
        "loginUsername": IG_USERNAME,
        "loginPassword": IG_PASSWORD
    };

    console.log('🚀 Запускаем с авторизацией...\n');
    console.log('Input:', JSON.stringify({ ...input, loginPassword: '***' }, null, 2));

    try {
        const run = await client.actor("apify/instagram-scraper").call(input, {
            waitSecs: 180
        });

        console.log(`\n✅ Статус: ${run.status}`);

        if (run.status === 'SUCCEEDED') {
            const { items } = await client.dataset(run.defaultDatasetId).listItems();
            const validItems = items.filter(i => !i.error);

            console.log(`📦 Получено постов: ${validItems.length}\n`);

            // Фильтр по дате
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - DAYS_LIMIT);

            const recentItems = validItems.filter(item => {
                const postDate = new Date(item.timestamp || item.takenAt);
                return postDate >= cutoffDate;
            });

            console.log(`📅 За последние ${DAYS_LIMIT} дней: ${recentItems.length} постов`);
            console.log('━'.repeat(60));

            // Показать все
            recentItems.forEach((item, i) => {
                const postDate = new Date(item.timestamp || item.takenAt);
                const views = item.videoViewCount || item.videoPlayCount || 0;
                const likes = item.likesCount || item.likes || 0;

                console.log(`${i + 1}. ${item.shortCode}`);
                console.log(`   📅 ${postDate.toLocaleString('ru-RU')}`);
                console.log(`   👁️ ${views.toLocaleString()} views | ❤️ ${likes} likes`);
                console.log(`   🖼️ ${item.displayUrl?.substring(0, 50)}...`);
                console.log('');
            });

            // Сохраняем
            const fs = require('fs');
            fs.writeFileSync('/tmp/instagram_auth_posts.json', JSON.stringify(recentItems, null, 2));
            console.log('💾 Сохранено в /tmp/instagram_auth_posts.json');

        } else {
            const log = await client.log(run.id).get();
            console.log('\n❌ Лог ошибки:');
            console.log(log?.substring(log.length - 1500));
        }
    } catch (e) {
        console.error('❌ Ошибка:', e.message);
    }
}

main().catch(console.error);
