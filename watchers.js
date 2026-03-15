const axios = require("axios");

// Fetch ETH price from CoinGecko (no API key needed)
async function getEthPrice() {
  try {
    const res = await axios.get(
      "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd&include_24hr_change=true"
    );
    const data = res.data.ethereum;
    return {
      price: data.usd,
      change24h: data.usd_24h_change?.toFixed(2),
    };
  } catch (e) {
    return { price: "unavailable", change24h: "N/A" };
  }
}

// Fetch recent large transactions for a wallet (whale watching)
async function getWhaleActivity(address) {
  try {
    const apiKey = process.env.ETHERSCAN_API_KEY;
    const res = await axios.get(
      `https://api.etherscan.io/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=5&sort=desc&apikey=${apiKey}`
    );
    const txs = res.data.result;
    if (!Array.isArray(txs)) return [];
    return txs.map((tx) => ({
      hash: tx.hash?.slice(0, 10) + "...",
      value: (parseFloat(tx.value) / 1e18).toFixed(4) + " ETH",
      from: tx.from?.slice(0, 8) + "...",
      to: tx.to?.slice(0, 8) + "...",
      age: Math.floor((Date.now() / 1000 - parseInt(tx.timeStamp)) / 60) + " mins ago",
    }));
  } catch (e) {
    return [];
  }
}

// Get wallet ETH balance
async function getWalletBalance(address) {
  try {
    const apiKey = process.env.ETHERSCAN_API_KEY;
    const res = await axios.get(
      `https://api.etherscan.io/api?module=account&action=balance&address=${address}&tag=latest&apikey=${apiKey}`
    );
    const balanceWei = res.data.result;
    return (parseFloat(balanceWei) / 1e18).toFixed(6) + " ETH";
  } catch (e) {
    return "unavailable";
  }
}

// Simple demand signal based on 24h price change
function getDemandSignal(change24h) {
  const change = parseFloat(change24h);
  if (change > 3) return { signal: "HIGH", emoji: "🟢", action: "Consider moving funds to hot wallet" };
  if (change < -3) return { signal: "LOW", emoji: "🔴", action: "Consider moving funds to cold wallet" };
  return { signal: "NEUTRAL", emoji: "🟡", action: "Hold current allocation" };
}

module.exports = { getEthPrice, getWhaleActivity, getWalletBalance, getDemandSignal };