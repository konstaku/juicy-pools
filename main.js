'use strict';
import express from 'express';
import { poolList } from './utils/updateDuneQuery.js';
import { updateTelegramBot } from './utils/telegramBot.js';
import { fetchPoolsForChain } from './utils/fetchPoolsForChain.js';
import { readPoolsFromDune } from './utils/readPoolsFromDune.js';
import * as dataOperations from './utils/dataOperations.js';

const app = express();
const PORT = process.env.PORT || 3030;

app.listen(PORT, () => {
	console.log(`Server started on port ${PORT}`);
});

async function fetchPoolData(chainsAndPools) {
	const result = [];

	try {
		for (let i = 0; i < chainsAndPools.length; i++) {
			await fetchPoolsForChain(chainsAndPools[i]);
			dataOperations.sortPoolsByVitality(chainsAndPools[i]);
			dataOperations.selectTop20Pools(chainsAndPools[i]);
			result.push(dataOperations.formatMessage(chainsAndPools[i]))
		}
	} catch (err) {
		console.log('*** Error fetching pool data ***', err);
	}

	return result;
}

readPoolsFromDune(poolList)
	.then(result => fetchPoolData(result))
	.then(result => updateTelegramBot(result))
	.catch(e => console.log(e));
