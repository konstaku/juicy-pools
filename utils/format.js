export function sortPoolsByVitality(poolList) {
	poolList.pools = poolList.pools.filter(el => ((el.vitality != null && el.tvl != null) && (el.tvl >= 1000 && el.volume >= 1000)));
	poolList.pools = poolList.pools.sort((a, b) => b.vitality - a.vitality);
}

export function selectTop20Pools(poolList) {
	poolList.pools = poolList.pools.slice(0, 20);
}

export function formatMessage(data) {

    let message = `🔥🔥🔥 Top 20 pools on ${data.network}: 🔥🔥🔥`;

    if (data.pools.length == 0) {
        return message + `\n🤷 No liquidity data for ${data.network} 🤷`;
    }

    for (const pool of data.pools) {
        pool.name = pool.name
            .replace('<', '&lt;')
            .replace('>', '&gt;')
            .replace('&', '&amp;');
            
        message += `
        Pool: <a href="${pool.url}">${pool.name}</a>
        TVL: $${pool.tvl}
        24h Vol: $${pool.volume}
        Vitality: ${pool.vitality}
        `;
    }

    return message;
}