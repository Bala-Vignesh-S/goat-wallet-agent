const { GoogleGenerativeAI } = require("@google/generative-ai");
const { getEthPrice, getWalletTxHistory, getWhaleActivity, getDemandSignal } = require("./watchers");
const { getBalances, transferFromHotToCold, transferFromColdToHot } = require("./wallets");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// State for auto-rebalance and price alerts
let lastPrice = null;
let autoRebalanceEnabled = false;
let priceAlertThreshold = null; // percentage e.g. 5 means alert on 5% move
let whaleAlertEnabled = false;
let alertCallback = null; // function to send Telegram message proactively

function setAlertCallback(fn) {
  alertCallback = fn;
}

function sendAlert(msg) {
  if (alertCallback) alertCallback(msg);
}

// Build market context
async function getMarketContext() {
  const [ethData, balances] = await Promise.all([getEthPrice(), getBalances()]);
  const demand = getDemandSignal(ethData.change24h);
  return { ethData, balances, demand };
}

// Gemini AI recommendation
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

In 2-3 sentences, give a concise recommendation on whether to move funds between hot and cold wallet, and why. Be direct. No disclaimers.
    `;
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (e) {
    return "AI analysis unavailable — " + e.message;
  }
}

// /status handler
async function handleStatus() {
  const context = await getMarketContext();
  const aiRec = await getAIRecommendation(context);
  const autoStatus = autoRebalanceEnabled ? "🟢 ON" : "🔴 OFF";
  const alertStatus = priceAlertThreshold ? `🔔 ${priceAlertThreshold}%` : "🔕 OFF";
  const whaleStatus = whaleAlertEnabled ? "🟢 ON" : "🔴 OFF";
  return `
📊 *Wallet Agent Status*

💰 *ETH Price:* $${context.ethData.price} _(${context.ethData.source})_
📈 *24h Change:* ${context.ethData.change24h}%
${context.demand.emoji} *Demand Signal:* ${context.demand.signal}

🔥 *Hot Wallet:* ${context.balances.hot}
🧊 *Cold Wallet:* ${context.balances.cold}

🤖 *AI Recommendation:*
${aiRec}

⚙️ *Agent Settings:*
Auto-rebalance: ${autoStatus}
Price alert: ${alertStatus}
Whale alert: ${whaleStatus}
  `.trim();
}

// /rebalance handler
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

// /history handler
async function handleHistory() {
  const hotAddress = process.env.HOT_WALLET_ADDRESS;
  const coldAddress = process.env.COLD_WALLET_ADDRESS;
  const [hotTxs, coldTxs] = await Promise.all([
    getWalletTxHistory(hotAddress, 5),
    getWalletTxHistory(coldAddress, 5),
  ]);

  let msg = "📜 *Transaction History*\n\n";

  msg += "🔥 *Hot Wallet (last 5):*\n";
  if (hotTxs.length === 0) {
    msg += "_No transactions found_\n";
  } else {
    hotTxs.forEach((tx) => {
      msg += `${tx.direction === "OUT" ? "↗️" : "↙️"} ${tx.value} — ${tx.age}\n\`${tx.hash.slice(0, 16)}...\`\n`;
    });
  }

  msg += "\n🧊 *Cold Wallet (last 5):*\n";
  if (coldTxs.length === 0) {
    msg += "_No transactions found_\n";
  } else {
    coldTxs.forEach((tx) => {
      msg += `${tx.direction === "OUT" ? "↗️" : "↙️"} ${tx.value} — ${tx.age}\n\`${tx.hash.slice(0, 16)}...\`\n`;
    });
  }

  if (!process.env.ETHERSCAN_API_KEY) {
    msg += "\n_Add ETHERSCAN\\_API\\_KEY to see full history_";
  }

  return msg.trim();
}

// /autobalance on|off handler
async function handleAutoRebalance(action) {
  if (action === "on") {
    autoRebalanceEnabled = true;
    return "✅ *Auto-rebalance enabled*\nAgent will automatically move funds when demand signal changes to HIGH or LOW.";
  } else {
    autoRebalanceEnabled = false;
    return "🔴 *Auto-rebalance disabled*\nAgent will only move funds when you use /rebalance manually.";
  }
}

// /alert set|off handler
async function handlePriceAlert(action, threshold) {
  if (action === "off") {
    priceAlertThreshold = null;
    return "🔕 *Price alerts disabled*";
  }
  priceAlertThreshold = parseFloat(threshold);
  return `🔔 *Price alert set*\nI will notify you when ETH moves more than ${priceAlertThreshold}% from current price ($${lastPrice || "loading..."}).`;
}

// /whalealert on|off handler
async function handleWhaleAlert(action) {
  if (action === "on") {
    whaleAlertEnabled = true;
    return "🐋 *Whale alerts enabled*\nI will notify you of large transactions (10+ ETH) on your wallets.";
  } else {
    whaleAlertEnabled = false;
    return "🔕 *Whale alerts disabled*";
  }
}

// Free-form chat
async function handleChat(userMessage) {
  try {
    const context = await getMarketContext();
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = `
You are a crypto wallet AI agent with live market data.
ETH price: $${context.ethData.price} (${context.ethData.change24h}% 24h)
Hot wallet: ${context.balances.hot}
Cold wallet: ${context.balances.cold}
Demand signal: ${context.demand.signal}
User: ${userMessage}
Reply helpfully and concisely. Under 150 words.
    `;
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (e) {
    return "Sorry, AI error: " + e.message;
  }
}

// Background monitoring loop — runs every 60 seconds
async function startMonitoringLoop() {
  console.log("Starting monitoring loop...");
  setInterval(async () => {
    try {
      const { ethData, demand } = await getMarketContext();
      const currentPrice = parseFloat(ethData.price);

      // Price alert check
      if (priceAlertThreshold && lastPrice) {
        const pctChange = Math.abs((currentPrice - lastPrice) / lastPrice * 100);
        if (pctChange >= priceAlertThreshold) {
          const direction = currentPrice > lastPrice ? "📈 UP" : "📉 DOWN";
          sendAlert(`🔔 *Price Alert!*\nETH moved ${direction} ${pctChange.toFixed(2)}%\nNow: $${currentPrice} (was $${lastPrice.toFixed(2)})`);
          lastPrice = currentPrice; // reset baseline
        }
      } else {
        lastPrice = currentPrice;
      }

      // Auto-rebalance check
      if (autoRebalanceEnabled) {
        const balances = await getBalances();
        const hotEth = parseFloat(balances.hot);
        const coldEth = parseFloat(balances.cold);
        const total = hotEth + coldEth;

        if (demand.signal === "HIGH" && hotEth / total < 0.4 && total > 0) {
          const moveAmount = (total * 0.2).toFixed(4);
          const result = await transferFromColdToHot(moveAmount);
          if (result.success) {
            sendAlert(`🤖 *Auto-rebalance triggered*\n${demand.emoji} Demand signal: HIGH\nMoved ${moveAmount} ETH → hot wallet\nTx: \`${result.hash}\``);
          }
        } else if (demand.signal === "LOW" && coldEth / total < 0.4 && total > 0) {
          const moveAmount = (total * 0.2).toFixed(4);
          const result = await transferFromHotToCold(moveAmount);
          if (result.success) {
            sendAlert(`🤖 *Auto-rebalance triggered*\n${demand.emoji} Demand signal: LOW\nMoved ${moveAmount} ETH → cold wallet\nTx: \`${result.hash}\``);
          }
        }
      }

      // Whale alert check
      if (whaleAlertEnabled && process.env.ETHERSCAN_API_KEY) {
        const hotWhales = await getWhaleActivity(process.env.HOT_WALLET_ADDRESS, 0.5);
        if (hotWhales.length > 0) {
          sendAlert(`🐋 *Whale Activity Detected!*\nHot wallet: ${hotWhales[0].value} moved ${hotWhales[0].age}`);
        }
      }

    } catch (e) {
      console.error("Monitoring loop error:", e.message);
    }
  }, 60000); // every 60 seconds
}

module.exports = {
  handleStatus,
  handleRebalance,
  handleHistory,
  handleAutoRebalance,
  handlePriceAlert,
  handleWhaleAlert,
  handleChat,
  startMonitoringLoop,
  setAlertCallback,
};

// v2 — auto-rebalance, price alerts, whale alerts, history