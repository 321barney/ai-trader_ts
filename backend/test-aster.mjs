// Test fetching AsterDex pairs
const url = 'https://fapi.asterdex.com/fapi/v1/exchangeInfo';
const res = await fetch(url);
const data = await res.json();

console.log('Total pairs:', data.symbols?.length);
console.log('\nFirst 10 pairs:');
data.symbols?.slice(0, 10).forEach(s => {
    console.log(`  ${s.symbol} (${s.baseAsset}/${s.quoteAsset}) - ${s.status}`);
});
