'use strict';

import express from 'express';
import { readFile } from 'fs';
import { poolList, refreshPoolData } from './refreshPoolsAndFees.js';
import { updateBot, formatMessage } from './telegramBot.js';

const app = express();
const PORT = process.env.PORT || 3030;

const server = app.listen(PORT, () => {
	console.log(`Server started on port ${PORT}`);
});

async function prepareFetchData(chains) {
	console.log('Preparing blockchain data...');

	try {
		const promises = chains.map(chain => readPoolsFromDisk(chain));
		// Using Promise.all instead a for loop, so I have all the data filled before moving next
		const poolData = await Promise.all(promises);

		const preparedData = chains.map((chain, index) => {
			const poolInfo = {};
			poolInfo.chain = chain;
			poolInfo.pools = poolData[index];
			// Normalize fees (3000 = 0.3)
			poolInfo.pools.forEach(el => el.fees /= 10000);
			return poolInfo;
		});

		return preparedData;
	}
	catch (err) {
		console.log('*** Error preparing fetch data', err);
	}
}

async function readPoolsFromDisk(chain) {

	try {
		return new Promise((resolve, reject) => {
			readFile(`./data/uni_v3_${chain}_pools_and_fees.json`, 'utf-8', (err, data) => {
			if (err) {
				reject(err);
			} else {
				console.log(`${chain} pools data ready`);
				const poolsAndFees = JSON.parse(data).result.rows || null;
				resolve(poolsAndFees);
			}
			})
		});
	} 
	catch (err) {
		console.log('*** Error reading pools from disk ***', err);
	}
	
}

async function fetchPoolData(chainsAndPools) {
	const result = [];

	try {
		for (let i = 0; i < chainsAndPools.length; i++) {
			await fetchPoolsForChain(chainsAndPools[i]);
			sortPoolsByVitality(chainsAndPools[i]);
			selectTop20Pools(chainsAndPools[i]);
			result.push(formatMessage(chainsAndPools[i]))
		}
	} catch (err) {
		console.log('*** Error fetching pool data ***', err);
	}

	return result;
}

async function fetchPoolsForChain(poolList) {
	const MILLISECONDS_IN_MINUTE = 60000;
	const MINUTE_FETCH_LIMIT = 300;
	const batchSize = 30;
	const cooldown = MILLISECONDS_IN_MINUTE / MINUTE_FETCH_LIMIT * batchSize;
	
	const result = [];
	const chain = poolList.chain;
	const pools = poolList.pools;
  
	if (poolList.pools.length == 0) {
		console.log(`Unable to make batches for ${chain}, pool list empty`);
		return poolList;
	}
  
	let currentPool = 0;

	try {
		while (currentPool < pools.length) {
			const batch = pools.slice(currentPool, currentPool + batchSize);
			const promises = batch.map(pool => {
				return fetch(`https://api.dexscreener.com/latest/dex/pairs/${chain}/${pool.address}`);
			});
		
			const responses = await Promise.all(promises);
			const data = await Promise.all(responses.map(el => el.json()));
			result.push(...data);
		
			console.log(`Fetching ${currentPool + 1}-${currentPool + batch.length} of ${pools.length} ${chain} pools`);
		
			currentPool += batchSize;
			await new Promise(resolve => setTimeout(resolve, cooldown));
		}
	}
	catch (err) {
		console.log(`*** Error fetching pool ${poolList.chain} from dexscreener ***`, err);
	}
	
  
	console.log(`Done fetching ${pools.length} ${chain} pools`);

	for (let i = 0; i < poolList.pools.length; i++) {
		const pool = poolList.pools[i];

		if (!result[i].pairs) {
			console.log(`+++ No pairs for ${chain} +++`);
			continue;
		}

		const entry = result[i].pairs[0];

		if (!entry || !entry.liquidity) {
			console.log(`No liquidity info for pool ${entry.baseToken.symbol}/${entry.quoteToken.symbol}!`);
			continue;
		}

		pool.url = entry.url;
		pool.tvl = Math.round(entry.liquidity.usd) || null;
		pool.volume = Math.round(entry.volume.h24);
		pool.vitality = Math.round(pool.volume / pool.tvl * pool.fees * 100) / 100 || null;
		pool.name = `${entry.baseToken.symbol}/${entry.quoteToken.symbol}`;
	}

	return poolList;
}

function sortPoolsByVitality(poolList) {
	poolList.pools = poolList.pools.filter(el => ((el.vitality != null && el.tvl != null) && (el.tvl >= 1000 && el.volume >= 1000)));
	poolList.pools = poolList.pools.sort((a, b) => b.vitality - a.vitality);
}

function selectTop20Pools(poolList) {
	poolList.pools = poolList.pools.slice(0, 20);
}

async function updateTelegramBot(data) {
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

refreshPoolData(poolList)
	.then(pools => prepareFetchData(pools.map(el => el.network)))
	.then(result => fetchPoolData(result))
	.then(data => updateTelegramBot(data))
	.catch(e => console.log('*** Error in promise chain ***', e))
	.finally(() => {
		console.log('All pool data read successfully!');
		server.close(() => {
			console.log('Server shut down');
			process.exit(0);
		})
	});
