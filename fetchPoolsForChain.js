'use strict';
const MILLISECONDS_IN_MINUTE = 60000;
const MINUTE_FETCH_LIMIT = 300;
const batchSize = 30;
const cooldown = MILLISECONDS_IN_MINUTE / MINUTE_FETCH_LIMIT * batchSize;

export async function fetchPoolsForChain(poolList) {
	const result = [];
	const chain = poolList.chain;
	const pools = poolList.pools;
  
	if (poolList.pools.length == 0) {
		console.log(`Unable to make batches for ${chain}, pool list empty`);
		return null;
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

    enrichPoolData(poolList, result);
  
	console.log(`Done fetching ${pools.length} ${chain} pools`);

	return poolList;
}

function enrichPoolData(poolList, fetchedData) {
    for (let i = 0; i < poolList.pools.length; i++) {
        const pool = poolList.pools[i];
        let entry = fetchedData[i] ? fetchedData[i].pairs[0] : null;

        if (!entry.liquidity) {
            console.log(`No liquidity info for pool ${entry.baseToken.symbol}/${entry.quoteToken.symbol}!`);
            entry = null;
            continue;
        }

        pool.url = entry.url;
        pool.tvl = Math.round(entry.liquidity.usd) || null;
        pool.volume = Math.round(entry.volume.h24);
        pool.vitality = Math.round(pool.volume / pool.tvl * pool.fees * 100) / 100 || null;
        pool.name = `${entry.baseToken.symbol}/${entry.quoteToken.symbol}`;
	}
}
