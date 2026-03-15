const axios = require("axios");

// Fetch ETH price — tries multiple sources with fallback
async function getEthPrice() {
  // Source 1: CoinGecko (no key)
  try {
    const res = await axios.get(
      "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd&include_24hr_change=true",
      { timeout: 5000 }
    );
    const data = res.data.ethereum;
    if (data && data.usd) {
      return {
        price: data.usd,
        change24h: data.usd_24h_change?.toFixed(2) || "0",
        source: "CoinGecko",
      };
    }
  } catch (e) {
    console.log("CoinGecko failed:", e.message);
  }

  // Source 2: Binance public API (no key needed)
  try {
    const [priceRes, statsRes] = await Promise.all([
      axios.get("https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT", { timeout: 5000 }),
      axios.get("https://api.binance.com/api/v3/ticker/24hr?symbol=ETHUSDT", { timeout: 5000 }),
    ]);
    const price = parseFloat(priceRes.data.price).toFixed(2);
    const change = parseFloat(statsRes.data.priceChangePercent).toFixed(2);
    return {
      price: parseFloat(price),
      change24h: change,
      source: "Binance",
    };
  } catch (e) {
    console.log("Binance failed:", e.message);
  }

  // Source 3: Kraken public API (no key needed)
  try {
    const res = await axios.get(
      "https://api.kraken.com/0/public/Ticker?pair=ETHUSD",
      { timeout: 5000 }
    );
    const data = res.data.result.XETHZUSD;
    const price = parseFloat(data.c[0]).toFixed(2);
    const open = parseFloat(data.o);
    const current = parseFloat(data.c[0]);
    const change = (((current - open) / open) * 100).toFixed(2);
    return {
      price: parseFloat(price),
      change24h: change,
      source: "Kraken",
    };
  } catch (e) {
    console.log("Kraken failed:", e.message);
  }

  return { price: "unavailable", change24h: "0", source: "none" };
}

// Get recent transactions for a wallet
async function getWalletTxHistory(address, limit = 5) {
  try {
    const apiKey = process.env.ETHERSCAN_API_KEY;
    if (!apiKey) return [];
    const res = await axios.get(
      `https://api.etherscan.io/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=${limit}&sort=desc&apikey=${apiKey}&network=sepolia`,
      { timeout: 5000 }
    );
    const txs = res.data.result;
    if (!Array.isArray(txs)) return [];
    return txs.map((tx) => ({
      hash: tx.hash,
      shortHash: tx.hash?.slice(0, 10) + "...",
      value: (parseFloat(tx.value) / 1e18).toFixed(4) + " ETH",
      direction: tx.from?.toLowerCase() === address.toLowerCase() ? "OUT" : "IN",
      to: tx.to?.slice(0, 10) + "...",
      from: tx.from?.slice(0, 10) + "...",
      age: Math.floor((Date.now() / 1000 - parseInt(tx.timeStamp)) / 60) + " mins ago",
    }));
  } catch (e) {
    return [];
  }
}

// Check for whale activity
async function getWhaleActivity(address, thresholdEth = 0.5) {
  try {
    const apiKey = process.env.ETHERSCAN_API_KEY;
    if (!apiKey) return [];
    const res = await axios.get(
      `https://api.etherscan.io/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=10&sort=desc&apikey=${apiKey}&network=sepolia`,
      { timeout: 5000 }
    );
    const txs = res.data.result;
    if (!Array.isArray(txs)) return [];
    return txs
      .filter((tx) => parseFloat(tx.value) / 1e18 >= thresholdEth)
      .map((tx) => ({
        hash: tx.hash?.slice(0, 10) + "...",
        value: (parseFloat(tx.value) / 1e18).toFixed(4) + " ETH",
        from: tx.from?.slice(0, 10) + "...",
        age: Math.floor((Date.now() / 1000 - parseInt(tx.timeStamp)) / 60) + " mins ago",
      }));
  } catch (e) {
    return [];
  }
}

// Demand signal based on 24h price change
function getDemandSignal(change24h) {
  const change = parseFloat(change24h);
  if (change > 3) return { signal: "HIGH", emoji: "🟢", action: "Consider moving funds to hot wallet" };
  if (change < -3) return { signal: "LOW", emoji: "🔴", action: "Consider moving funds to cold wallet" };
  return { signal: "NEUTRAL", emoji: "🟡", action: "Hold current allocation" };
}

module.exports = { getEthPrice, getWalletTxHistory, getWhaleActivity, getDemandSignal };