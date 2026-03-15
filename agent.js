const { GoogleGenerativeAI } = require("@google/generative-ai");
const { getEthPrice, getWhaleActivity, getWalletBalance, getDemandSignal } = require("./watchers");
const { getBalances, transferFromHotToCold, transferFromColdToHot } = require("./wallets");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Build a full market context snapshot
async function getMarketContext() {
  const [ethData, balances] = await Promise.all([
    getEthPrice(),
    getBalances(),
  ]);
  const demand = getDemandSignal(ethData.change24h);
  return { ethData, balances, demand };
}

// Ask Gemini to analyse context and recommend action
async function getAIRecommendation(context) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = `
You are a crypto wallet management AI agent.
Current market data:
- ETH price: $${context.ethData.price}
- 24h change: ${context.ethData.change24h}%
- Hot wallet balance: ${context.balances.hot}
- Cold wallet balance: ${context.balances.cold}
- Demand signal: ${context.demand.signal}

In 2-3 sentences, give a concise recommendation on whether to move funds between hot and cold wallet, and why.
Be direct and specific. No disclaimers.
    `;
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (e) {
    return "AI analysis unavailable — " + e.message;
  }
}

// Handle /status command
async function handleStatus() {
  const context = await getMarketContext();
  const aiRec = await getAIRecommendation(context);
  return `
📊 *Wallet Agent Status*

💰 *ETH Price:* $${context.ethData.price}
📈 *24h Change:* ${context.ethData.change24h}%
${context.demand.emoji} *Demand Signal:* ${context.demand.signal}

🔥 *Hot Wallet:* ${context.balances.hot}
🧊 *Cold Wallet:* ${context.balances.cold}

🤖 *AI Recommendation:*
${aiRec}

_${context.demand.action}_
  `.trim();
}

// Handle /rebalance command
async function handleRebalance(direction, amount) {
  let result;
  if (direction === "hot") {
    result = await transferFromColdToHot(amount);
  } else {
    result = await transferFromHotToCold(amount);
  }
  if (result.success) {
    return `✅ *Rebalance complete*\nMoved ${amount} ETH → ${direction} wallet\nTx: \`${result.hash}\`${result.note ? "\n_" + result.note + "_" : ""}`;
  } else {
    return `❌ *Rebalance failed*\n${result.error}`;
  }
}

// Handle free-form AI chat
async function handleChat(userMessage) {
  try {
    const context = await getMarketContext();
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = `
You are a crypto wallet AI agent with access to live market data.
Current ETH price: $${context.ethData.price} (${context.ethData.change24h}% 24h)
Hot wallet: ${context.balances.hot}
Cold wallet: ${context.balances.cold}
Demand signal: ${context.demand.signal}

User message: ${userMessage}
Reply helpfully and concisely. Keep it under 150 words.
    `;
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (e) {
    return "Sorry, AI error: " + e.message;
  }
}

module.exports = { handleStatus, handleRebalance, handleChat };