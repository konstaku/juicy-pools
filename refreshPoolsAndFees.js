import { writeFile } from 'fs';

const DUNE_API_KEY = 'o0T6Pl9KPv2fjRgqnhDegftHX5RSbg2z';

export const poolList = [
    {
        network: 'ethereum',
        url: 'https://api.dune.com/api/v1/query/2428409/results?api_key=',
    },
    {
        network: 'optimism',
        url: 'https://api.dune.com/api/v1/query/2427486/results?api_key=',
    },
    {
        network: 'polygon',
        url: 'https://api.dune.com/api/v1/query/2428000/results?api_key=',
    },
    {
        network: 'arbitrum',
        url: 'https://api.dune.com/api/v1/query/2428398/results?api_key=',
    },
    {
        network: 'bsc',
        url: 'https://api.dune.com/api/v1/query/2428404/results?api_key=',
    },
];

export async function refreshPoolsAndFeesData(pools) {
    for (const pool of pools) {
        console.log(`Fetching data for ${pool.network} pools...`);
        const response = await fetch(pool.url + DUNE_API_KEY);
        const data = await response.json();
        writeFile(`./data/uni_v3_${pool.network}_pools_and_fees.json`, JSON.stringify(data, null, 4), error => {
            if(error) {
                console.log('Error writing data:', error);
            }
        })
    }

    console.log('Download successful');
    return pools;
}
