'use strict';
import express from 'express';
import { poolList } from './utils/updateDuneQuery.js';
import { updateTelegramBot } from './utils/telegramBot.js';
import { fetchPoolsForChain } from './utils/fetchPoolsForChain.js';
import { readPoolsFromDune } from './utils/readPoolsFromDune.js';
import * as format from './utils/format.js';

const app = express();
const PORT = process.env.PORT || 3030;

app.listen(PORT, () => {
	console.log(`Server started on port ${PORT}`);
});

export async function fetchPoolData(chainsAndPools) {
	const result = [];

	try {
		for (let i = 0; i < chainsAndPools.length; i++) {
			await fetchPoolsForChain(chainsAndPools[i]);
			format.sortPoolsByVitality(chainsAndPools[i]);
			format.selectTop20Pools(chainsAndPools[i]);
			result.push(format.formatMessage(chainsAndPools[i]))
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

