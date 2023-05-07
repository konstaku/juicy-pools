import uniPoolListOptimism from './data/weth_pools_uni_v3_optimism.json' assert { type: 'json' };
import uniPoolListArbitrum from './data/weth_pools_uni_v3_arbitrum.json' assert { type: 'json' };

// The query limit is max of 30 pools at once, so the function forms batches 
// of 30 addresses (or a remaining amount of addresses), and calls the loadBatch 
// function with the current batch until all pools are called.
async function fetchHotPools(pools, network) {
  const entryPoolData = pools.data.liquidityPools;
  const resultingPoolData = [];

  let poolChunk = [];
  let i = 0;

  while (i < entryPoolData.length) {
    poolChunk.push(entryPoolData[i]);
    i++;

    if (poolChunk.length == 30) {
      console.log(`Loading pool chunk, currently ${resultingPoolData.length} elements in result array`);
      await loadBatch(poolChunk, resultingPoolData, network);
      poolChunk = [];
    }

    if (i == entryPoolData.length - 1) {
      await loadBatch(poolChunk, resultingPoolData, network)
      poolChunk = null;
      break;
    }
  }
  
  return resultingPoolData;
}

async function loadBatch(chunk, base, network) {
  const urls = chunk.map(el => fetch(`https://api.dexscreener.com/latest/dex/pairs/${network}/${el.id}`));

  await Promise.all(urls) // 1: Add await
    .then(responses => {
      return Promise.all(responses.map(el => el.json()));
    }) // 2: *Return* Promise all, not just execute
    .then(results => { 
      for (let i = 0; i < results.length; i++) {
        
        if (!results[i].pair) {
          continue;
        }

        const pairInfo = {
          pair: `${results[i].pair.baseToken.name}/${results[i].pair.quoteToken.name}`,
          vitality: null,
          tvl: results[i].pair.liquidity ? results[i].pair.liquidity.usd : null,
          volume: results[i].pair.volume.h24,
          fee: +chunk[i].fees[2].feePercentage,
          address: results[i].pair.pairAddress,
        };

        // IMPORTANT to add || 0, otherwise sort will not work properly
        pairInfo.vitality = pairInfo.volume / pairInfo.tvl * pairInfo.fee || 0;
        base.push(pairInfo);
      }

      console.log('base', base);
      return base;
    })
    .then(result => result.sort((a, b) => b.vitality - a.vitality))
    .catch(e => console.log('Error:', e));
}

fetchHotPools(uniPoolListOptimism, 'optimism')
  .then(results => {
    for (let i = 0; i < results.length; i++) {
      console.log(results[i]);
    }
  });
