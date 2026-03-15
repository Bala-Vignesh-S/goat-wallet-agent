const { ethers } = require("ethers");

// Ethereum Sepolia testnet RPC
const BASE_SEPOLIA_RPC = "https://ethereum-sepolia-rpc.publicnode.com";

async function getProvider() {
  return new ethers.JsonRpcProvider(BASE_SEPOLIA_RPC);
}

async function getBalances() {
  try {
    const provider = await getProvider();
    const hotBalance = await provider.getBalance(process.env.HOT_WALLET_ADDRESS);
    const coldBalance = await provider.getBalance(process.env.COLD_WALLET_ADDRESS);
    return {
      hot: ethers.formatEther(hotBalance) + " ETH (testnet)",
      cold: ethers.formatEther(coldBalance) + " ETH (testnet)",
    };
  } catch (e) {
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
    return { success: false, error: e.message };
  }
}

async function transferFromColdToHot(amountEth) {
  // For demo purposes returns simulated result
  // In production you would use cold wallet private key
  return {
    success: true,
    hash: "0xSIMULATED_" + Date.now(),
    note: "Simulated — add cold wallet key to .env for real tx",
  };
}

module.exports = { getBalances, transferFromHotToCold, transferFromColdToHot };