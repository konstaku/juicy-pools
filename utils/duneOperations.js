'use strict';

const DUNE_API_KEY = 'r6omw302w3fPYQbCAZNgq40zxwc0E78I';

export const poolList = [
    {
        network: 'ethereum',
        queryId: '2428409',
    },
    {
        network: 'optimism',
        queryId: '2427486',
    },
    {
        network: 'polygon',
        queryId: '2428000',
    },
    {
        network: 'arbitrum',
        queryId: '2428398',
    },
    {
        network: 'bsc',
        queryId: '2428404',
    },
];

export async function updateDuneQuery(pools) {
    try {
        Promise.all(
            pools.map(pool => getData(pool.queryId))
        );
        
    } catch (error) {
        console.log('*** Error refreshing pools ***', error);
    }

    console.log('All chains updated successfully');
    return pools;
}

async function getData(queryId) {
    const header = {
        'x-dune-api-key': DUNE_API_KEY,
    };

    try {
        // Sending an execution request
        const request = await fetch(
            `https://api.dune.com/api/v1/query/${queryId}/execute`,
            {
                method: 'POST',
                headers: header,
            }
        );

        const requestData = await request.json();
        const executionId = requestData.execution_id;

        console.log(`Query #${queryId} pending...`);

        // Polling Dune for query status
        while (true) {
            await new Promise(resolve => setTimeout(resolve, 30000));

            const response = await fetch(
                `https://api.dune.com/api/v1/execution/${executionId}/status`,
                {
                    method: 'GET',
                    headers: header,
                }
            );
            const responseData = await response.json();

            switch (responseData.state) {
                case 'QUERY_STATE_COMPLETED':
                    break;
                case 'QUERY_STATE_EXECUTING':
                    continue;
                case 'QUERY_STATE_PENDING':
                    continue;
                case 'QUERY_STATE_FAILED':
                    throw new Error('Error: query state failed');
                case 'QUERY_STATE_CANCELLED':
                    throw new Error('Error: query state cancelled');
                case 'QUERY_STATE_EXPIRED':
                    throw new Error('Error: query state expired');
            }

            console.log(`Query #${queryId} completed`);
            break;
        }

        // Fetching results
        const result = await fetch(
            `https://api.dune.com/api/v1/execution/${executionId}/results`,
            {
                method: 'GET',
                headers: header,
            }
        );
        const data = await result.json();
        return data;
    } catch (err) {
        console.log('*** Error fetching query results ***', err);
    }
}

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

