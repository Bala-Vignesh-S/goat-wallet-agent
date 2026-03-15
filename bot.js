require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const {
  handleStatus,
  handleRebalance,
  handleHistory,
  handleAutoRebalance,
  handlePriceAlert,
  handleWhaleAlert,
  handleChat,
  startMonitoringLoop,
  setAlertCallback,
} = require("./agent");

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
const ALLOWED_ID = parseInt(process.env.ALLOWED_TELEGRAM_ID);

function isAllowed(msg) {
  return msg.from.id === ALLOWED_ID;
}

function deny(chatId) {
  bot.sendMessage(chatId, "⛔ Unauthorized.");
}

// Set up alert callback so monitoring loop can message you proactively
setAlertCallback((msg) => {
  bot.sendMessage(ALLOWED_ID, msg, { parse_mode: "Markdown" });
});

// /start
bot.onText(/\/start/, (msg) => {
  if (!isAllowed(msg)) return deny(msg.chat.id);
  bot.sendMessage(msg.chat.id,
`👋 *GOAT Wallet Agent online*

*Commands:*
/status — live prices, balances, AI recommendation
/rebalance hot 0.01 — move ETH to hot wallet
/rebalance cold 0.01 — move ETH to cold wallet
/history — last 5 transactions per wallet
/autobalance on — agent rebalances automatically
/autobalance off — disable auto-rebalance
/alert set 5 — alert when ETH moves 5%
/alert off — disable price alerts
/whalealert on — alert on large wallet transactions
/whalealert off — disable whale alerts
/help — show this menu

Or just chat — I have live market context.`,
  { parse_mode: "Markdown" });
});

// /help
bot.onText(/\/help/, (msg) => {
  if (!isAllowed(msg)) return deny(msg.chat.id);
  bot.sendMessage(msg.chat.id,
`*Commands:*
/status — market snapshot + AI recommendation
/rebalance hot|cold <amount>
/history — transaction history
/autobalance on|off
/alert set <percent> | off
/whalealert on|off`,
  { parse_mode: "Markdown" });
});

// /status
bot.onText(/\/status/, async (msg) => {
  if (!isAllowed(msg)) return deny(msg.chat.id);
  bot.sendMessage(msg.chat.id, "⏳ Fetching live data...");
  try {
    const response = await handleStatus();
    bot.sendMessage(msg.chat.id, response, { parse_mode: "Markdown" });
  } catch (e) {
    bot.sendMessage(msg.chat.id, "❌ Error: " + e.message);
  }
});

// /history
bot.onText(/\/history/, async (msg) => {
  if (!isAllowed(msg)) return deny(msg.chat.id);
  bot.sendMessage(msg.chat.id, "⏳ Fetching transaction history...");
  try {
    const response = await handleHistory();
    bot.sendMessage(msg.chat.id, response, { parse_mode: "Markdown" });
  } catch (e) {
    bot.sendMessage(msg.chat.id, "❌ Error: " + e.message);
  }
});

// /rebalance hot|cold <amount>
bot.onText(/\/rebalance (hot|cold) (.+)/, async (msg, match) => {
  if (!isAllowed(msg)) return deny(msg.chat.id);
  const direction = match[1];
  const amount = parseFloat(match[2]);
  if (isNaN(amount) || amount <= 0) {
    return bot.sendMessage(msg.chat.id, "❌ Invalid amount. Example: /rebalance hot 0.01");
  }
  bot.sendMessage(msg.chat.id, `⏳ Moving ${amount} ETH to ${direction} wallet...`);
  try {
    const response = await handleRebalance(direction, amount);
    bot.sendMessage(msg.chat.id, response, { parse_mode: "Markdown" });
  } catch (e) {
    bot.sendMessage(msg.chat.id, "❌ Error: " + e.message);
  }
});

// /autobalance on|off
bot.onText(/\/autobalance (on|off)/, async (msg, match) => {
  if (!isAllowed(msg)) return deny(msg.chat.id);
  try {
    const response = await handleAutoRebalance(match[1]);
    bot.sendMessage(msg.chat.id, response, { parse_mode: "Markdown" });
  } catch (e) {
    bot.sendMessage(msg.chat.id, "❌ Error: " + e.message);
  }
});

// /alert set <percent> or /alert off
bot.onText(/\/alert (set|off)(?: (.+))?/, async (msg, match) => {
  if (!isAllowed(msg)) return deny(msg.chat.id);
  const action = match[1];
  const threshold = match[2];
  if (action === "set" && (!threshold || isNaN(parseFloat(threshold)))) {
    return bot.sendMessage(msg.chat.id, "❌ Usage: /alert set 5 (alerts on 5% move)");
  }
  try {
    const response = await handlePriceAlert(action, threshold);
    bot.sendMessage(msg.chat.id, response, { parse_mode: "Markdown" });
  } catch (e) {
    bot.sendMessage(msg.chat.id, "❌ Error: " + e.message);
  }
});

// /whalealert on|off
bot.onText(/\/whalealert (on|off)/, async (msg, match) => {
  if (!isAllowed(msg)) return deny(msg.chat.id);
  try {
    const response = await handleWhaleAlert(match[1]);
    bot.sendMessage(msg.chat.id, response, { parse_mode: "Markdown" });
  } catch (e) {
    bot.sendMessage(msg.chat.id, "❌ Error: " + e.message);
  }
});

// Free-form chat
bot.on("message", async (msg) => {
  if (!isAllowed(msg)) return deny(msg.chat.id);
  if (msg.text && msg.text.startsWith("/")) return;
  try {
    const response = await handleChat(msg.text);
    bot.sendMessage(msg.chat.id, response);
  } catch (e) {
    bot.sendMessage(msg.chat.id, "❌ Error: " + e.message);
  }
});

// Keep-alive HTTP server for UptimeRobot
const http = require("http");
http.createServer((req, res) => {
  res.writeHead(200);
  res.end("Bot is alive!");
}).listen(process.env.PORT || 3000);

// Start background monitoring loop
startMonitoringLoop();

console.log("GOAT Wallet Agent bot is running...");