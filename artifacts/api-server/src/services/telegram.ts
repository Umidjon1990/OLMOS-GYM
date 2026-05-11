import TelegramBot from "node-telegram-bot-api";
import { logger } from "../lib/logger.js";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;

let bot: TelegramBot | null = null;

export function getBot(): TelegramBot | null {
  return bot;
}

export function initTelegramBot(): TelegramBot | null {
  if (!TOKEN) {
    logger.warn("TELEGRAM_BOT_TOKEN not set — Telegram bot disabled");
    return null;
  }

  try {
    bot = new TelegramBot(TOKEN, { polling: true });

    bot.on("message", (msg) => {
      const chatId = msg.chat.id;
      const text = msg.text || "";

      if (text === "/start" || text === "/chatid") {
        bot!.sendMessage(
          chatId,
          `✅ *OLMOS FITNESS Bot*\n\n` +
          `Sizning Chat ID: \`${chatId}\`\n\n` +
          `Admin bildirishnomalarini olish uchun bu ID ni saqlang va admin paneliga kiriting.`,
          { parse_mode: "Markdown" }
        );
        logger.info({ chatId }, "Admin requested chat ID");
      }

      if (text === "/stats") {
        bot!.sendMessage(chatId, "📊 Statistika so'raldi. Admin panelini tekshiring: /admin");
      }
    });

    bot.on("polling_error", (err) => {
      logger.error({ err: err.message }, "Telegram polling error");
    });

    logger.info("Telegram bot started (polling)");
    return bot;
  } catch (err) {
    logger.error({ err }, "Failed to start Telegram bot");
    return null;
  }
}

export async function sendAdminNotification(message: string): Promise<void> {
  if (!bot) return;
  const adminChatId = process.env.ADMIN_TELEGRAM_CHAT_ID;
  if (!adminChatId) {
    logger.warn("ADMIN_TELEGRAM_CHAT_ID not set — notification skipped");
    return;
  }
  try {
    await bot.sendMessage(adminChatId, message, { parse_mode: "Markdown" });
  } catch (err) {
    logger.error({ err }, "Failed to send Telegram notification");
  }
}
