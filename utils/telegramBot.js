'use strict';
import TelegramBot from 'node-telegram-bot-api';
import { getJuicyPools } from './fetchOperations.js';
import { poolList, readPoolsFromDune } from './duneOperations.js';

const token = '6272930700:AAHwYpqBoXPWpA_apNoBABptdQ-asNfLAQM';
const chat = -1001968505370;
const displayMessageOptions = {
    parse_mode: 'HTML',
    disable_web_page_preview: true,
};

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

export function showMenu(chatId) {
    const menuButtons = [
        [{ text: 'Ethereum', callback_data: 'ethereum' }],
        [{ text: 'Arbitrum', callback_data: 'arbitrum' }],
        [{ text: 'Optimism', callback_data: 'optimism' }],
        [{ text: 'Polygon', callback_data: 'polygon' }],
        [{ text: 'BSC', callback_data: 'bsc' }],
    ];

    const options = {
        reply_markup: {
            inline_keyboard: menuButtons,
        },
    };

    bot.sendMessage(chatId, 'Select a blockchain', options);
}

bot.on('callback_query', async query => fetchAndPost(query));

async function fetchAndPost(query) {
    const chatId = query.message.chat.id;
    const chain = query.data;
    const index = poolList.findIndex(item => item.network == chain);

    const poolData = [];
    poolData.push(poolList[index]);

    const poolsToFetch = await readPoolsFromDune(poolData);
    const timeToFetch = Math.ceil(poolsToFetch[0].pools.length / 300);

    bot.sendMessage(
        chatId,
        `💾 Fetching ${
            poolsToFetch[0].pools.length
        } ${chain} pools, \nEstimated waiting time ${timeToFetch} ${
            timeToFetch > 1 ? 'minutes' : 'minute'
        }...
        Please wait until query finishes befort starting next query`
    );
    const result = await getJuicyPools(poolsToFetch);

    bot.sendMessage(chatId, result.toString(), displayMessageOptions);
}
