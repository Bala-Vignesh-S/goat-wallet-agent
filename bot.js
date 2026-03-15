require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const { handleStatus, handleRebalance, handleChat } = require("./agent");

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
const ALLOWED_ID = parseInt(process.env.ALLOWED_TELEGRAM_ID);

// Security — only respond to your Telegram account
function isAllowed(msg) {
  return msg.from.id === ALLOWED_ID;
}

function deny(chatId) {
  bot.sendMessage(chatId, "⛔ Unauthorized.");
}

// /start
bot.onText(/\/start/, (msg) => {
  if (!isAllowed(msg)) return deny(msg.chat.id);
  bot.sendMessage(
    msg.chat.id,
    `👋 *GOAT Wallet Agent online*

Available commands:
/status — live prices, balances, AI recommendation
/rebalance hot 0.01 — move 0.01 ETH to hot wallet
/rebalance cold 0.01 — move 0.01 ETH to cold wallet
/help — show this menu

Or just chat with me — I have live market context.`,
    { parse_mode: "Markdown" }
  );
});

// /help
bot.onText(/\/help/, (msg) => {
  if (!isAllowed(msg)) return deny(msg.chat.id);
  bot.sendMessage(
    msg.chat.id,
    `*Commands:*
/status — market snapshot + AI recommendation
/rebalance hot <amount> — cold → hot wallet
/rebalance cold <amount> — hot → cold wallet
/help — this menu`,
    { parse_mode: "Markdown" }
  );
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

// Free-form chat — anything that isn't a command
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

// Keep-alive endpoint for UptimeRobot pinging
const http = require("http");
http.createServer((req, res) => {
  res.writeHead(200);
  res.end("Bot is alive!");
}).listen(process.env.PORT || 3000);

console.log("GOAT Wallet Agent bot is running...");