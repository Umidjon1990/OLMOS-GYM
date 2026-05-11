import { Router } from "express";
import { getBot } from "../services/telegram.js";
import { logger } from "../lib/logger.js";

const router = Router();

router.get("/status", async (req, res) => {
  const bot = getBot();
  if (!bot) {
    return res.json({ enabled: false, message: "Bot token sozlanmagan" });
  }
  try {
    const me = await bot.getMe();
    const adminChatId = process.env.ADMIN_TELEGRAM_CHAT_ID;
    res.json({
      enabled: true,
      botName: me.first_name,
      botUsername: me.username,
      adminChatIdSet: !!adminChatId,
    });
  } catch (err) {
    logger.error({ err }, "Failed to get bot info");
    res.json({ enabled: false, message: "Bot ulanishda xatolik" });
  }
});

router.post("/set-admin-chat", async (req, res) => {
  const { chatId } = req.body as { chatId?: string };
  if (!chatId) return res.status(400).json({ error: "chatId required" });

  process.env.ADMIN_TELEGRAM_CHAT_ID = String(chatId);

  const bot = getBot();
  if (bot) {
    try {
      await bot.sendMessage(
        chatId,
        `✅ *OLMOS FITNESS CRM*\n\nAdmin bildirishnomalar muvaffaqiyatli ulandi!\n\nEndi barcha yangi arizalar va to'lovlar haqida xabar olasiz.`,
        { parse_mode: "Markdown" }
      );
    } catch (err) {
      logger.warn({ err }, "Could not send confirmation message");
    }
  }

  logger.info({ chatId }, "Admin chat ID set");
  res.json({ success: true, chatId });
});

router.post("/test", async (req, res) => {
  const bot = getBot();
  const adminChatId = process.env.ADMIN_TELEGRAM_CHAT_ID;
  if (!bot || !adminChatId) {
    return res.status(400).json({ error: "Bot yoki admin chat ID sozlanmagan" });
  }
  try {
    await bot.sendMessage(
      adminChatId,
      `🧪 *Test xabar*\n\nOLMOS FITNESS CRM Telegram boti ishlayapti! ✅`,
      { parse_mode: "Markdown" }
    );
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Test message failed");
    res.status(500).json({ error: "Xabar yuborilmadi" });
  }
});

export default router;
