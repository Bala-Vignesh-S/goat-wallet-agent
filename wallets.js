const { ethers } = require("ethers");

// Ethereum Sepolia — multiple fallback RPCs
const SEPOLIA_RPCS = [
  "https://rpc.ankr.com/eth_sepolia",
  "https://ethereum-sepolia-rpc.publicnode.com",
  "https://sepolia.drpc.org",
];

async function getProvider() {
  for (const rpc of SEPOLIA_RPCS) {
    try {
      const provider = new ethers.JsonRpcProvider(rpc);
      await Promise.race([
        provider.getBlockNumber(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 3000)),
      ]);
      console.log("Connected to RPC:", rpc);
      return provider;
    } catch (e) {
      console.log("RPC failed, trying next:", rpc, e.message);
    }
  }
  throw new Error("All RPCs failed");
}

async function getBalances() {
  try {
    const provider = await getProvider();
    console.log("Fetching balance for hot:", process.env.HOT_WALLET_ADDRESS);
    console.log("Fetching balance for cold:", process.env.COLD_WALLET_ADDRESS);
    const hotBalance = await provider.getBalance(process.env.HOT_WALLET_ADDRESS);
    const coldBalance = await provider.getBalance(process.env.COLD_WALLET_ADDRESS);
    console.log("Hot raw balance:", hotBalance.toString());
    console.log("Cold raw balance:", coldBalance.toString());
    return {
      hot: ethers.formatEther(hotBalance) + " ETH (testnet)",
      cold: ethers.formatEther(coldBalance) + " ETH (testnet)",
    };
  } catch (e) {
    console.error("getBalances error:", e.message);
    return { hot: "unavailable", cold: "unavailable" };
  }
}

async function transferFromHotToCold(amountEth) {
  try {
    const provider = await getProvider();
    const wallet = new ethers.Wallet(process.env.HOT_WALLET_PRIVATE_KEY, provider);
    const tx = await wallet.sendTransaction({
      to: process.env.COLD_WALLET_ADDRESS,
      value: ethers.parseEther(amountEth.toString()),
    });
    await tx.wait();
    return { success: true, hash: tx.hash };
  } catch (e) {
    console.error("transferFromHotToCold error:", e.message);
    return { success: false, error: e.message };
  }
}

async function transferFromColdToHot(amountEth) {
  return {
    success: true,
    hash: "0xSIMULATED_" + Date.now(),
    note: "Simulated — add cold wallet key to .env for real tx",
  };
}

module.exports = { getBalances, transferFromHotToCold, transferFromColdToHot };