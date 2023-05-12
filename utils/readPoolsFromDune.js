'use strict';
const DUNE_API_KEY = 'r6omw302w3fPYQbCAZNgq40zxwc0E78I';

export async function readPoolsFromDune(poolList) {
	console.log('Reading pools data from Dune...');

	try {
		const promises = poolList.map(pool => fetchDuneData(pool));
		// Using Promise.all instead a for loop, so I have all the data filled before moving next
		const poolData = await Promise.all(promises);

		const preparedData = poolList.map((pool, index) => {
			const poolInfo = pool;
			poolInfo.pools = poolData[index].result.rows;
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

async function fetchDuneData(pool) {
	try {
        const response = await fetch(`https://api.dune.com/api/v1/query/${pool.queryId}/results?api_key=${DUNE_API_KEY}`);
        const data = await response.json();
        return data;
	} 
	catch (err) {
		console.log('*** Error reading pools from disk ***', err);
	}
}
