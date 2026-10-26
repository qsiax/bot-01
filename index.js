const puppeteer = require('puppeteer');

// Настройки скрипта
const TARGET_URL = 'https://promo.nlrs.ru';
const TOTAL_VOTES = 5;

async function runBot() {
    console.log(`Всего голосов: ${TOTAL_VOTES}`);

    const browser = await puppeteer.launch({ headless: false });

    for (let i = 1; i <= TOTAL_VOTES; i++) {
        console.log(`\n[Итерация ${i}/${TOTAL_VOTES}] Открытие чистой сессии инкогнито...`);
        
        const context = await browser.createBrowserContext();
        const page = await context.newPage();

        try {
            await page.setViewport({ width: 1280, height: 800 });

            await page.goto(TARGET_URL, { waitUntil: 'networkidle2', timeout: 30000 });
            console.log(`Страница конкурса успешно загружена.`);

            await page.evaluate(() => {
                const headers = Array.from(document.querySelectorAll('h2'));
                const targetHeader = headers.find(h => h.textContent.includes('Верхневилюйский улус'));
                
                if (targetHeader) {
                    const card = targetHeader.closest('div') || targetHeader.parentElement;
                    const voteButton = card.querySelector('button') || card.nextElementSibling?.querySelector('button') || card.querySelector('.btn');
                    
                    if (voteButton) {
                        voteButton.click();
                    } else {
                        throw new Error('Кнопка "Голосовать" в карточке Верхневилюйска не найдена');
                    }
                } else {
                    throw new Error('Верхневилюйский улус не найден в списке на странице');
                }
            });
            console.log(`Нажата кнопка улуса. Ожидание появления анкеты...`);

            await page.waitForSelector('#survey-form', { timeout: 7000 });
            await new Promise(resolve => setTimeout(resolve, 800));

            await page.evaluate(() => {
                const form = document.querySelector('#survey-form');
                const inputs = Array.from(form.querySelectorAll('input[type="radio"]'));
                
                const groups = {};
                inputs.forEach(input => {
                    if (input.name === 'reading_preference' && input.value === 'other') {
                        return; 
                    }

                    if (!groups[input.name]) {
                        groups[input.name] = [];
                    }
                    groups[input.name].push(input);
                });

                Object.values(groups).forEach(groupInputs => {
                    const randomIndex = Math.floor(Math.random() * groupInputs.length);
                    groupInputs[randomIndex].click();
                });
            });
            console.log(`Анкета успешно заполнена`);

            await page.evaluate(() => {
                const form = document.querySelector('#survey-form');
                const submitButton = form.querySelector('button[type="submit"]') || 
                                     document.querySelector('.modal-footer button') ||
                                     Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim().toLowerCase() === 'голосовать');
                
                if (submitButton) {
                    submitButton.click();
                } else {
                    throw new Error('Финальная кнопка отправки анкеты не найдена');
                }
            });
            console.log(`Голос засчитан`);

            await new Promise(resolve => setTimeout(resolve, 3000));

        } catch (error) {
            console.error(`Ошибка на итерации ${i}:`, error.message);
        } finally {
            await context.close();
            console.log(`Сессия закрыта, куки удалены.`);
        }
    }

    await browser.close();
    console.log('Завершен');
}

runBot();
