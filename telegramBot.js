'use strict';

import TelegramBot from 'node-telegram-bot-api';

const token = '6272930700:AAHwYpqBoXPWpA_apNoBABptdQ-asNfLAQM';
const chat = -1001968505370;
const options = {
    parse_mode: "HTML",
    disable_web_page_preview: true,
};

export const bot = new TelegramBot(token);

export async function updateTelegramBot(data) {
	console.log('Updating telegram bot...');

	try {
		for (const entry of data) {
			await updateBot(entry);
		}
	}
	catch (err) {
		console.log('*** Error updating telegram bot ***', err);
	}
}

async function updateBot(text) {
    try {
        await bot.sendMessage(chat, text.toString(), options);
        console.log('Telegram bot updated');
    } catch (err) {
        console.log('Error updating telegram:', err);
        console.log('Problem text:', text);
    }
}


