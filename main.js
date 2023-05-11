'use strict';

import express from 'express';
import { readFile } from 'fs';
import { poolList, refreshPoolData } from './refreshPoolsAndFees.js';
import { updateBot, formatMessage } from './telegramBot.js';
import { fetchPoolsForChain } from './fetchPoolsForChain.js';

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

// refreshPoolData(poolList)
// 	.then(pools => prepareFetchData(pools.map(el => el.network)))

const chains = poolList.map(el => el.network);

prepareFetchData(chains)
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
