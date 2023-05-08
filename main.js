'use strict';

import { readFile, writeFile } from 'fs';
import { poolList, refreshPoolsAndFeesData } from './refreshPoolsAndFees.js';
import { bot, updateBot, formatMessage } from './telegramBot.js';

async function prepareFetchData(chains) {
	console.log('Preparing blockchain data...');
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

async function readPoolsFromDisk(chain) {
	return new Promise((resolve, reject) => {
		readFile(`./data/uni_v3_${chain}_pools_and_fees.json`, 'utf-8', (err, data) => {
		if (err) {
			reject(err);
		} else {
			console.log(`${chain} pools data ready`);
			const poolsAndFees = JSON.parse(data).result.rows;
			
			resolve(poolsAndFees);
		}
		})
	});
}

async function fetchPoolData(chainsAndPools) {
	const result = [];

	for (let i = 0; i < chainsAndPools.length; i++) {
		await fetchPoolsForChain(chainsAndPools[i]);
		sortPoolsByVitality(chainsAndPools[i]);
		selectTop20Pools(chainsAndPools[i]);
	//	result.push(makeTable(chainsAndPools[i]));
		result.push(formatMessage(chainsAndPools[i]))
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
		throw new Error('Unable to make batches, pool list empty');
	}
  
	let currentPool = 0;
  
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
  
	console.log(`Done fetching ${pools.length} ${chain} pools`);

	for (let i = 0; i < poolList.pools.length; i++) {
		const pool = poolList.pools[i];
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

	for (const entry of data) {
		await updateBot(entry);
	}
}

async function writeDataToDisk(data) {
	console.log('Saving data to disk...');

	let textFile = '';

	for (const entry of data) {
		textFile += entry;
	}

	writeFile(`./data/results/result.txt`, textFile, (err) => {
		if (err) {
			console.log('Error writing file', err);
		} else {
			console.log('Data saved!');
		}
	});
}

// async function writeLog(rawData) {
// 	const date = new Date();

// 	writeFile(`./data/results/logs/${date.getFullYear()}-${date.getMonth()}-${date.getDate()}_${date.getHours()}-${date.getMinutes()}`, JSON.stringify(rawData), err => {
// 		if (err) {
// 			console.log('Error saving log!');
// 		}
// 	});
// }

function makeTable(poolList) {
	let result = `************************** TOP ${poolList.pools.length} POOLS FOR ${poolList.chain.toUpperCase()} **************************` + '\n';
	
	for (const pool of poolList.pools) {
		result += `Pair:\t${pool.name.length >= 8 ? pool.name : pool.name + '\t'}\t | TVL:\t${pool.tvl}\t | 24h vol:\t${pool.volume >= 10000000 ? pool.volume : pool.volume + '\t'}\t | Vitality:\t${pool.vitality}\t | Address:\t${pool.address}` + '\n';
	}

	result += '\n';
	return result;
}

refreshPoolsAndFeesData(poolList)
	.then(pools => prepareFetchData(pools.map(el => el.network)))
	.then(result => fetchPoolData(result))
	.then(data => updateTelegramBot(data))
	.catch(e => console.log(e))
	.finally(() => {
		if (bot.isPolling()) {
			bot.stopPolling();
			console.log('bot polling stopped');
		}
		console.log('All pool data read successfully!');
	});
