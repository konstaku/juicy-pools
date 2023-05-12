'use strict';
import TelegramBot from 'node-telegram-bot-api';

const token = '6272930700:AAHwYpqBoXPWpA_apNoBABptdQ-asNfLAQM';
const chat = -1001968505370;
const displayMessageOptions = {
    parse_mode: 'HTML',
    disable_web_page_preview: true,
};

// const menuOptions = [
//     [{ text: 'Ethereum', callback_data: 'ethereum' }],
//     [{ text: 'Arbitrum', callback_data: 'arbitrum' }],
//     [{ text: 'Optimism', callback_data: 'optimism' }],
//     [{ text: 'Polygon', callback_data: 'polygon' }],
//     [{ text: 'BSC', callback_data: 'bsc' }],
// ];

export const bot = new TelegramBot(token);

if (bot.isPolling()) {
    console.log('Bot is polling');
    bot.stopPolling();
    console.log('Stopped polling');
} else {
    bot.startPolling();
    console.log('Started polling');
}

export async function updateTelegramBot(data) {
    console.log('Updating telegram bot...');

    try {
        for (const entry of data) {
            await updatePricesInBot(entry);
        }
    } catch (err) {
        console.log('*** Error updating telegram bot ***', err);
    }
}

async function updatePricesInBot(text) {
    try {
        await bot.sendMessage(chat, text.toString(), displayMessageOptions);
        console.log('Telegram bot updated');
    } catch (err) {
        console.log('Error updating telegram:', err);
        console.log('Problem text:', text);
    }
}
