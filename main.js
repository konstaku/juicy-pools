'use strict';
import express from 'express';
import cron from 'node-cron';

import { poolList, updateDuneQuery, readPoolsFromDune } from './utils/duneOperations.js';
import { bot, updateTelegramBot, showMenu } from './utils/telegramBot.js';

const app = express();
const PORT = process.env.PORT || 3030;

// Start server
app.listen(PORT, () => {
	console.log(`Server started on port ${PORT}`);
});

// Scheduling query refresh at 0400 daily
cron.schedule('0 4 * * *', () => updateDuneQuery(poolList));

// Main sequence
// readPoolsFromDune(poolList)
// 	.then(result => getJuicyPools(result))
// 	.then(result => updateTelegramBot(result))
// 	.catch(e => console.log(e));

bot.onText(/\/menu/, async (msg) => {
	const chatId = msg.chat.id;
	showMenu(chatId);
});
