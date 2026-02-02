#!/usr/bin/env node
/**
 * Тестовый скрипт для прямого вызова Apify Instagram Scraper
 * Запуск: node scripts/test-apify.js
 */

require('dotenv').config();

const { ApifyClient } = require('apify-client');

async function main() {
    const APIFY_TOKEN = process.env.APIFY_TOKEN;
    const IG_USERNAME = process.env.IG_USERNAME;
    const IG_PASSWORD = process.env.IG_PASSWORD;

    if (!APIFY_TOKEN) {
        console.error('❌ APIFY_TOKEN не установлен');
        process.exit(1);
    }

    console.log('🔧 Настройки:');
    console.log(`   APIFY_TOKEN: ${APIFY_TOKEN.substring(0, 8)}...`);
    console.log(`   IG_USERNAME: ${IG_USERNAME || 'не установлен'}`);
    console.log(`   IG_PASSWORD: ${IG_PASSWORD ? '***' : 'не установлен'}`);
    console.log('');

    const client = new ApifyClient({ token: APIFY_TOKEN });
    const targetUsername = 'd_vycheslavovich';

    console.log(`📱 Тестируем парсинг: @${targetUsername}`);
    console.log('━'.repeat(50));

    // Тест 1: apify/instagram-scraper с directUrls
    console.log('\n🧪 Тест 1: apify/instagram-scraper (directUrls + RESIDENTIAL прокси)');

    const input1 = {
        "directUrls": [`https://www.instagram.com/${targetUsername}/`],
        "resultsType": "posts",
        "resultsLimit": 50,
        "searchType": "user",
        "proxy": {
            "useApifyProxy": true,
            "apifyProxyGroups": ["RESIDENTIAL"]
        }
    };

    // Добавляем креды если есть
    if (IG_USERNAME && IG_PASSWORD) {
        input1.loginUsername = IG_USERNAME;
        input1.loginPassword = IG_PASSWORD;
        console.log('   → Используем авторизацию');
    } else {
        console.log('   → Анонимный режим');
    }

    try {
        console.log('   → Запускаем актор...');
        const run1 = await client.actor("apify/instagram-scraper").call(input1, {
            waitSecs: 120
        });

        console.log(`   → Статус: ${run1.status}`);

        if (run1.status === 'SUCCEEDED') {
            const { items } = await client.dataset(run1.defaultDatasetId).listItems();
            const validItems = items.filter(i => !i.error);
            console.log(`   ✅ Получено постов: ${validItems.length}`);

            if (validItems.length > 0) {
                console.log('\n   📊 Примеры постов:');
                validItems.slice(0, 3).forEach((item, i) => {
                    console.log(`   ${i + 1}. ID: ${item.id || item.shortCode}`);
                    console.log(`      Тип: ${item.type || item.productType}`);
                    console.log(`      Просмотры: ${item.videoViewCount || item.videoPlayCount || 'N/A'}`);
                    console.log(`      Лайки: ${item.likesCount || item.likes || 'N/A'}`);
                    console.log(`      Дата: ${item.timestamp || item.takenAt}`);
                    console.log('');
                });

                console.log('\n✅ УСПЕХ! Парсер работает.');
                return;
            } else {
                // Проверяем ошибки
                const { items: allItems } = await client.dataset(run1.defaultDatasetId).listItems({ clean: false });
                if (allItems[0]?.error) {
                    console.log(`   ❌ Ошибка: ${allItems[0].error} - ${allItems[0].errorDescription}`);
                }
            }
        } else {
            const log = await client.log(run1.id).get();
            console.log('   ❌ Лог ошибки:', log?.substring(log.length - 500));
        }
    } catch (e) {
        console.error('   ❌ Ошибка:', e.message);
    }

    console.log('\n━'.repeat(50));
    console.log('⚠️ Тест 1 не дал результатов. Пробуем альтернативный актор...\n');

    // Тест 2: Instagram Reel Scraper  
    console.log('🧪 Тест 2: apify/instagram-reel-scraper');

    const input2 = {
        "urls": [`https://www.instagram.com/${targetUsername}/reels/`],
        "maxPostsPerProfile": 30,
        "proxy": {
            "useApifyProxy": true,
            "apifyProxyGroups": ["RESIDENTIAL"]
        }
    };

    try {
        console.log('   → Запускаем актор...');
        const run2 = await client.actor("apify/instagram-reel-scraper").call(input2, {
            waitSecs: 120
        });

        console.log(`   → Статус: ${run2.status}`);

        if (run2.status === 'SUCCEEDED') {
            const { items } = await client.dataset(run2.defaultDatasetId).listItems();
            console.log(`   ✅ Получено Reels: ${items.length}`);

            if (items.length > 0) {
                console.log('\n   📊 Примеры Reels:');
                items.slice(0, 3).forEach((item, i) => {
                    console.log(`   ${i + 1}. ${JSON.stringify(item).substring(0, 200)}...`);
                });
                console.log('\n✅ УСПЕХ! Reel Scraper работает.');
                return;
            }
        }
    } catch (e) {
        console.error('   ❌ Ошибка:', e.message);
    }

    console.log('\n━'.repeat(50));
    console.log('❌ Все тесты провалились.');
    console.log('   Возможные причины:');
    console.log('   1. Instagram блокирует IP Apify для этого профиля');
    console.log('   2. Профиль приватный или возрастные ограничения');
    console.log('   3. Нужен валидный IG аккаунт для авторизации');
    console.log('\n💡 Рекомендация: Попробуйте другой публичный профиль для теста.');
}

main().catch(console.error);
