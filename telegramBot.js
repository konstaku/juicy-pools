'use strict';

import TelegramBot from 'node-telegram-bot-api';

const token = '6272930700:AAHwYpqBoXPWpA_apNoBABptdQ-asNfLAQM';
const chat = -1001968505370;
const options = {
    parse_mode: "HTML",
    disable_web_page_preview: true,
};

export const bot = new TelegramBot(token);

export async function updateBot(text) {
    try {
        await bot.sendMessage(chat, text.toString(), options);
        console.log('Telegram bot updated');
    } catch (err) {
        console.log('Error updating telegram:', err);
    }
}

export function formatMessage(data) {

    let message = `🔥🔥🔥 Top 20 pools on ${data.chain}: 🔥🔥🔥`;

    for (const pool of data.pools) {
        message += `
        Pool: <a href="${pool.url}">${pool.name}</a>
        TVL: $${pool.tvl}
        24h Vol: $${pool.volume}
        Vitality: ${pool.vitality}
        `;
    }

    return message;
}
