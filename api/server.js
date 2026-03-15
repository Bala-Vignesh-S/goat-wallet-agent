require('dotenv').config({ path: '../.env' });
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { ethers } = require('ethers');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
app.use(cors());
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const SEPOLIA_RPCS = [
  'https://rpc.ankr.com/eth_sepolia',
  'https://ethereum-sepolia-rpc.publicnode.com',
  'https://sepolia.drpc.org',
];

async function getProvider() {
  for (const rpc of SEPOLIA_RPCS) {
    try {
      const provider = new ethers.JsonRpcProvider(rpc);
      await Promise.race([
        provider.getBlockNumber(),
        new Promise((_, r) => setTimeout(() => r(new Error('timeout')), 3000)),
      ]);
      return provider;
    } catch (e) { continue; }
  }
  throw new Error('All RPCs failed');
}

async function getEthPrice() {
  try {
    const res = await axios.get('https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT', { timeout: 5000 });
    const statsRes = await axios.get('https://api.binance.com/api/v3/ticker/24hr?symbol=ETHUSDT', { timeout: 5000 });
    return {
      price: parseFloat(res.data.price).toFixed(2),
      change24h: parseFloat(statsRes.data.priceChangePercent).toFixed(2),
      source: 'Binance',
    };
  } catch (e) {
    try {
      const res = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd&include_24hr_change=true', { timeout: 5000 });
      return { price: res.data.ethereum.usd, change24h: res.data.ethereum.usd_24h_change?.toFixed(2), source: 'CoinGecko' };
    } catch (e2) {
      return { price: null, change24h: '0', source: 'none' };
    }
  }
}

// GET /api/status
app.get('/api/status', async (req, res) => {
  try {
    const [priceData, provider] = await Promise.all([getEthPrice(), getProvider()]);
    const [hotBal, coldBal] = await Promise.all([
      provider.getBalance(process.env.HOT_WALLET_ADDRESS),
      provider.getBalance(process.env.COLD_WALLET_ADDRESS),
    ]);
    const change = parseFloat(priceData.change24h);
    const signal = change > 3 ? 'HIGH' : change < -3 ? 'LOW' : 'NEUTRAL';
    const action = signal === 'HIGH' ? 'Consider moving funds to hot wallet'
      : signal === 'LOW' ? 'Consider moving funds to cold wallet'
      : 'Hold current allocation';

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const prompt = `ETH price $${priceData.price}, 24h change ${priceData.change24h}%, demand ${signal}. Hot: ${ethers.formatEther(hotBal)} ETH, Cold: ${ethers.formatEther(coldBal)} ETH. Give a 2-sentence wallet management recommendation. Be direct.`;
    const aiResult = await model.generateContent(prompt);

    res.json({
      price: priceData.price,
      change24h: priceData.change24h,
      source: priceData.source,
      balances: {
        hot: ethers.formatEther(hotBal) + ' ETH',
        cold: ethers.formatEther(coldBal) + ' ETH',
      },
      demand: { signal, action },
      recommendation: aiResult.response.text(),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/history
app.get('/api/history', async (req, res) => {
  try {
    const apiKey = process.env.ETHERSCAN_API_KEY;
    if (!apiKey) return res.json({ transactions: [] });
    const hotAddr = process.env.HOT_WALLET_ADDRESS;
    const coldAddr = process.env.COLD_WALLET_ADDRESS;
    const [hotRes, coldRes] = await Promise.all([
      axios.get(`https://api.etherscan.io/api?module=account&action=txlist&address=${hotAddr}&page=1&offset=5&sort=desc&apikey=${apiKey}&network=sepolia`),
      axios.get(`https://api.etherscan.io/api?module=account&action=txlist&address=${coldAddr}&page=1&offset=5&sort=desc&apikey=${apiKey}&network=sepolia`),
    ]);
    const mapTx = (txs, addr) => (Array.isArray(txs) ? txs : []).map(tx => ({
      hash: tx.hash,
      value: (parseFloat(tx.value) / 1e18).toFixed(4) + ' ETH',
      direction: tx.from?.toLowerCase() === addr.toLowerCase() ? 'OUT' : 'IN',
      age: Math.floor((Date.now() / 1000 - parseInt(tx.timeStamp)) / 60) + ' mins ago',
      wallet: addr === hotAddr ? 'hot' : 'cold',
    }));
    const txs = [
      ...mapTx(hotRes.data.result, hotAddr),
      ...mapTx(coldRes.data.result, coldAddr),
    ].sort((a, b) => a.age.localeCompare(b.age));
    res.json({ transactions: txs });
  } catch (e) {
    res.json({ transactions: [] });
  }
});

// POST /api/rebalance
app.post('/api/rebalance', async (req, res) => {
  try {
    const { direction, amount } = req.body;
    if (!direction || !amount) return res.status(400).json({ error: 'direction and amount required' });
    const provider = await getProvider();
    const wallet = new ethers.Wallet(process.env.HOT_WALLET_PRIVATE_KEY, provider);
    const to = direction === 'cold' ? process.env.COLD_WALLET_ADDRESS : process.env.HOT_WALLET_ADDRESS;
    const tx = await wallet.sendTransaction({ to, value: ethers.parseEther(amount.toString()) });
    await tx.wait();
    res.json({ success: true, hash: tx.hash, message: `✅ Moved ${amount} ETH → ${direction} wallet. Tx: ${tx.hash.slice(0, 16)}...` });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message, message: '❌ ' + e.message });
  }
});

// POST /api/agent/autobalance
app.post('/api/agent/autobalance', (req, res) => {
  res.json({ success: true, enabled: req.body.enabled });
});

// POST /api/agent/whalealert
app.post('/api/agent/whalealert', (req, res) => {
  res.json({ success: true, enabled: req.body.enabled });
});

// POST /api/agent/alert
app.post('/api/agent/alert', (req, res) => {
  res.json({ success: true, threshold: req.body.threshold });
});

// GET /api/passport/:address — Web3 Credit Passport
app.get('/api/passport/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const provider = await getProvider();
    const apiKey = process.env.ETHERSCAN_API_KEY;

    // Gather on-chain data in parallel
    const [balance, txCountHex] = await Promise.all([
      provider.getBalance(address),
      provider.send('eth_getTransactionCount', [address, 'latest']),
    ]);

    let txHistory = [];
    if (apiKey) {
      try {
        const txRes = await axios.get(`https://api.etherscan.io/api?module=account&action=txlist&address=${address}&page=1&offset=50&sort=asc&apikey=${apiKey}&network=sepolia`);
        txHistory = Array.isArray(txRes.data.result) ? txRes.data.result : [];
      } catch (e) {}
    }

    // Score calculation
    const txCount = parseInt(txCountHex, 16);
    const balEth = parseFloat(ethers.formatEther(balance));

    // Wallet age
    const firstTx = txHistory[0];
    const walletAgeMonths = firstTx
      ? Math.floor((Date.now() / 1000 - parseInt(firstTx.timeStamp)) / (30 * 24 * 3600))
      : 0;

    // Unique contracts interacted with
    const uniqueContracts = new Set(txHistory.filter(tx => tx.to).map(tx => tx.to.toLowerCase())).size;

    // Volume
    const totalVolume = txHistory.reduce((sum, tx) => sum + parseFloat(tx.value) / 1e18, 0);

    // Score components (each out of 200, total 1000)
    const txScore = Math.min(200, txCount * 4);
    const ageScore = Math.min(200, walletAgeMonths * 20);
    const balScore = Math.min(200, Math.floor(balEth * 40));
    const contractScore = Math.min(200, uniqueContracts * 10);
    const volumeScore = Math.min(200, Math.floor(totalVolume * 10));
    const total = txScore + ageScore + balScore + contractScore + volumeScore;

    // AI summary
    let summary = 'Wallet analysis complete.';
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const prompt = `Web3 wallet ${address.slice(0, 10)}... has: ${txCount} transactions, ${walletAgeMonths} months old, ${balEth.toFixed(3)} ETH balance, interacted with ${uniqueContracts} contracts, total volume ${totalVolume.toFixed(2)} ETH. Credibility score: ${total}/1000. Write one sentence summarising this wallet's Web3 credibility profile. Be specific.`;
      const aiResult = await model.generateContent(prompt);
      summary = aiResult.response.text().trim();
    } catch (e) {}

    res.json({
      address,
      score: total,
      summary,
      breakdown: [
        { label: 'Transactions', value: txCount, detail: `${txCount} total txns`, pct: (txScore / 200) * 100 },
        { label: 'Wallet age', value: `${walletAgeMonths}mo`, detail: firstTx ? 'Active wallet' : 'New wallet', pct: (ageScore / 200) * 100 },
        { label: 'ETH balance', value: `${balEth.toFixed(3)}`, detail: 'Current holdings', pct: (balScore / 200) * 100 },
        { label: 'Contracts', value: uniqueContracts, detail: 'Unique protocols', pct: (contractScore / 200) * 100 },
        { label: 'Volume', value: `${totalVolume.toFixed(2)}`, detail: 'Total ETH moved', pct: (volumeScore / 200) * 100 },
        { label: 'Total score', value: `${total}/1000`, detail: total >= 600 ? 'Strong profile' : 'Building profile', pct: (total / 1000) * 100 },
      ],
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.API_PORT || 4000;
app.listen(PORT, () => console.log(`API server running on port ${PORT}`));