import TelegramBot from "node-telegram-bot-api";
import { db } from "@workspace/db";
import {
  subscribersTable,
  plansTable,
  paymentsTable,
  notificationsTable,
} from "@workspace/db";
import { eq, sql, and, or, ilike } from "drizzle-orm";
import { logger } from "../lib/logger.js";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;

let bot: TelegramBot | null = null;

export function getBot(): TelegramBot | null {
  return bot;
}

// ─── State machine ────────────────────────────────────────────────────────────
type Step =
  | "idle"
  | "add_first_name"
  | "add_last_name"
  | "add_phone"
  | "add_plan"
  | "pay_phone";

interface State {
  step: Step;
  data: Record<string, string | number>;
}

const sessions = new Map<number, State>();

function getState(chatId: number): State {
  if (!sessions.has(chatId)) sessions.set(chatId, { step: "idle", data: {} });
  return sessions.get(chatId)!;
}

function resetState(chatId: number) {
  sessions.set(chatId, { step: "idle", data: {} });
}

// ─── Keyboards ────────────────────────────────────────────────────────────────
const MAIN_KEYBOARD: TelegramBot.SendMessageOptions = {
  reply_markup: {
    keyboard: [
      [{ text: "➕ Obunachi qo'shish" }, { text: "👥 Obunachilar" }],
      [{ text: "💰 Moliya" }, { text: "📊 Statistika" }],
    ],
    resize_keyboard: true,
    persistent: true,
  },
};

function subscribersMenu(): TelegramBot.SendMessageOptions {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "📋 Barchasi", callback_data: "subs_all" },
          { text: "✅ Faol", callback_data: "subs_active" },
        ],
        [{ text: "⚠️ Qarzdorlar", callback_data: "subs_overdue" }],
      ],
    },
  };
}

function financeMenu(): TelegramBot.SendMessageOptions {
  return {
    reply_markup: {
      inline_keyboard: [
        [{ text: "📅 Oylik hisobot", callback_data: "fin_monthly" }],
        [{ text: "💵 Daromad (jami)", callback_data: "fin_total" }],
        [{ text: "💳 To'lov qabul qilish", callback_data: "fin_pay" }],
      ],
    },
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function isAdmin(chatId: number): boolean {
  const adminId = process.env.ADMIN_TELEGRAM_CHAT_ID;
  return adminId === String(chatId);
}

async function getPlans() {
  return db.select().from(plansTable).where(eq(plansTable.isActive, true));
}

function formatSubscriber(sub: typeof subscribersTable.$inferSelect & { planName?: string | null }) {
  const statusLabel: Record<string, string> = {
    active: "✅ Faol",
    expired: "❌ Muddati tugagan",
    pending: "⏳ Kutilmoqda",
    blocked: "🚫 Bloklangan",
  };
  const payLabel: Record<string, string> = {
    paid: "✅ To'langan",
    pending: "⚠️ Kutilmoqda",
    overdue: "❌ Qarzdor",
  };
  const daysLeft = sub.daysLeft ?? 0;
  return (
    `👤 *${sub.firstName} ${sub.lastName}*\n` +
    `📞 ${sub.phone}\n` +
    `💎 Reja: ${sub.planName ?? "—"}\n` +
    `📅 ${sub.startDate} → ${sub.endDate}\n` +
    `🗓 Qolgan: *${daysLeft > 0 ? daysLeft + " kun" : "Tugagan"}*\n` +
    `💳 To'lov: ${payLabel[sub.paymentStatus] ?? sub.paymentStatus}\n` +
    `📌 Holat: ${statusLabel[sub.status] ?? sub.status}`
  );
}

// ─── Subscriber list ──────────────────────────────────────────────────────────
async function sendSubscriberList(
  chatId: number,
  filter: "all" | "active" | "overdue"
) {
  const today = new Date().toISOString().split("T")[0];

  let rows;
  if (filter === "active") {
    rows = await db
      .select({ sub: subscribersTable, planName: plansTable.name })
      .from(subscribersTable)
      .leftJoin(plansTable, eq(subscribersTable.planId, plansTable.id))
      .where(eq(subscribersTable.status, "active"));
  } else if (filter === "overdue") {
    rows = await db
      .select({ sub: subscribersTable, planName: plansTable.name })
      .from(subscribersTable)
      .leftJoin(plansTable, eq(subscribersTable.planId, plansTable.id))
      .where(
        or(
          eq(subscribersTable.paymentStatus, "overdue"),
          eq(subscribersTable.paymentStatus, "pending")
        )
      );
  } else {
    rows = await db
      .select({ sub: subscribersTable, planName: plansTable.name })
      .from(subscribersTable)
      .leftJoin(plansTable, eq(subscribersTable.planId, plansTable.id))
      .orderBy(sql`${subscribersTable.createdAt} DESC`);
  }

  if (rows.length === 0) {
    await bot!.sendMessage(chatId, "📭 Hech qanday a'zo topilmadi.");
    return;
  }

  const title =
    filter === "active"
      ? "✅ *Faol a'zolar*"
      : filter === "overdue"
      ? "⚠️ *Qarzdor a'zolar*"
      : "📋 *Barcha a'zolar*";

  const list = rows
    .map(
      ({ sub, planName }, i) =>
        `${i + 1}. *${sub.firstName} ${sub.lastName}* — ${sub.phone} | ${planName ?? "—"}`
    )
    .join("\n");

  const message = `${title} (${rows.length} ta)\n\n${list}`;

  // Telegram has 4096 char limit — chunk if needed
  if (message.length <= 4000) {
    await bot!.sendMessage(chatId, message, { parse_mode: "Markdown" });
  } else {
    const chunks: string[] = [];
    let chunk = `${title} (${rows.length} ta)\n\n`;
    for (const line of rows.map(
      ({ sub, planName }, i) =>
        `${i + 1}. *${sub.firstName} ${sub.lastName}* — ${sub.phone} | ${planName ?? "—"}\n`
    )) {
      if (chunk.length + line.length > 3900) {
        chunks.push(chunk);
        chunk = "";
      }
      chunk += line;
    }
    if (chunk) chunks.push(chunk);
    for (const c of chunks) {
      await bot!.sendMessage(chatId, c, { parse_mode: "Markdown" });
    }
  }
}

// ─── Monthly report ───────────────────────────────────────────────────────────
async function sendMonthlyReport(chatId: number) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const monthStart = `${year}-${month}-01`;
  const nextMonth = new Date(year, now.getMonth() + 1, 1);
  const monthEnd = nextMonth.toISOString().split("T")[0];

  const payments = await db
    .select()
    .from(paymentsTable)
    .where(
      and(
        sql`${paymentsTable.paymentDate} >= ${monthStart}`,
        sql`${paymentsTable.paymentDate} < ${monthEnd}`,
        eq(paymentsTable.status, "confirmed")
      )
    );

  const total = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const activeCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(subscribersTable)
    .where(eq(subscribersTable.status, "active"));

  const monthNames = [
    "Yanvar","Fevral","Mart","Aprel","May","Iyun",
    "Iyul","Avgust","Sentabr","Oktabr","Noyabr","Dekabr",
  ];

  await bot!.sendMessage(
    chatId,
    `📅 *${monthNames[now.getMonth()]} ${year} — Oylik hisobot*\n\n` +
      `💰 Jami daromad: *${total.toLocaleString("uz")} so'm*\n` +
      `✅ Tasdiqlangan to'lovlar: *${payments.length} ta*\n` +
      `👥 Faol a'zolar: *${activeCount[0]?.count ?? 0} ta*`,
    { parse_mode: "Markdown" }
  );
}

// ─── Total revenue ────────────────────────────────────────────────────────────
async function sendTotalRevenue(chatId: number) {
  const payments = await db
    .select()
    .from(paymentsTable)
    .where(eq(paymentsTable.status, "confirmed"));

  const total = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const [stats] = await db
    .select({
      total: sql<number>`count(*)`,
      active: sql<number>`sum(case when status = 'active' then 1 else 0 end)`,
    })
    .from(subscribersTable);

  await bot!.sendMessage(
    chatId,
    `💵 *Umumiy daromad*\n\n` +
      `💰 Jami: *${total.toLocaleString("uz")} so'm*\n` +
      `🧾 To'lovlar soni: *${payments.length} ta*\n` +
      `👥 Jami a'zolar: *${stats?.total ?? 0} ta*\n` +
      `✅ Faol a'zolar: *${stats?.active ?? 0} ta*`,
    { parse_mode: "Markdown" }
  );
}

// ─── Accept payment flow ──────────────────────────────────────────────────────
async function findAndShowSubscriberByPhone(chatId: number, phone: string) {
  const clean = phone.replace(/\s+/g, "").replace(/[^\d+]/g, "");

  const rows = await db
    .select({ sub: subscribersTable, planName: plansTable.name })
    .from(subscribersTable)
    .leftJoin(plansTable, eq(subscribersTable.planId, plansTable.id))
    .where(ilike(subscribersTable.phone, `%${clean}%`));

  if (rows.length === 0) {
    await bot!.sendMessage(
      chatId,
      `❌ *${phone}* raqamli a'zo topilmadi.\n\nQaytadan kiriting yoki /bekor buyrug'ini yuboring.`,
      { parse_mode: "Markdown" }
    );
    return;
  }

  const { sub, planName } = rows[0];
  const plan = await db
    .select()
    .from(plansTable)
    .where(eq(plansTable.id, sub.planId));

  const subWithPlan = { ...sub, planName, daysLeft: Math.floor((new Date(sub.endDate).getTime() - Date.now()) / 86400000) };

  const planButtons = plan.map((p) => [
    {
      text: `💳 ${p.name} — ${Number(p.price).toLocaleString("uz")} so'm`,
      callback_data: `pay_confirm_${sub.id}_${p.id}_${p.price}`,
    },
  ]);

  await bot!.sendMessage(
    chatId,
    `${formatSubscriber(subWithPlan)}\n\n📌 *Qaysi reja uchun to'lov qabul qilasiz?*`,
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          ...planButtons,
          [{ text: "❌ Bekor qilish", callback_data: "pay_cancel" }],
        ],
      },
    }
  );
}

// ─── Stats ────────────────────────────────────────────────────────────────────
async function sendStats(chatId: number) {
  const [stats] = await db
    .select({
      total: sql<number>`count(*)`,
      active: sql<number>`sum(case when status = 'active' then 1 else 0 end)`,
      expired: sql<number>`sum(case when status = 'expired' then 1 else 0 end)`,
      overdue: sql<number>`sum(case when payment_status in ('overdue','pending') then 1 else 0 end)`,
    })
    .from(subscribersTable);

  const [revenue] = await db
    .select({ total: sql<number>`coalesce(sum(amount::numeric),0)` })
    .from(paymentsTable)
    .where(eq(paymentsTable.status, "confirmed"));

  await bot!.sendMessage(
    chatId,
    `📊 *OLMOS FITNESS — Statistika*\n\n` +
      `👥 Jami a'zolar: *${stats?.total ?? 0} ta*\n` +
      `✅ Faol: *${stats?.active ?? 0} ta*\n` +
      `❌ Tugagan: *${stats?.expired ?? 0} ta*\n` +
      `⚠️ Qarzdor: *${stats?.overdue ?? 0} ta*\n\n` +
      `💰 Jami daromad: *${Number(revenue?.total ?? 0).toLocaleString("uz")} so'm*`,
    { parse_mode: "Markdown" }
  );
}

// ─── Bot initialization ───────────────────────────────────────────────────────
export function initTelegramBot(): TelegramBot | null {
  if (!TOKEN) {
    logger.warn("TELEGRAM_BOT_TOKEN not set — Telegram bot disabled");
    return null;
  }

  try {
    bot = new TelegramBot(TOKEN, { polling: true });

    // ── Message handler ──────────────────────────────────────────────────────
    bot.on("message", async (msg) => {
      const chatId = msg.chat.id;
      const text = (msg.text || "").trim();
      const state = getState(chatId);

      if (!isAdmin(chatId) && text !== "/start" && text !== "/chatid") {
        await bot!.sendMessage(chatId, "⛔ Sizda ruxsat yo'q.");
        return;
      }

      // /start or /chatid
      if (text === "/start" || text === "/chatid") {
        resetState(chatId);
        const isAdm = isAdmin(chatId);
        await bot!.sendMessage(
          chatId,
          isAdm
            ? `💎 *OLMOS FITNESS Admin Bot*\n\nXush kelibsiz! Quyidagi tugmalardan foydalaning.`
            : `✅ Sizning Chat ID: \`${chatId}\`\n\nBu ID ni admin paneliga kiriting.`,
          { parse_mode: "Markdown", ...(isAdm ? MAIN_KEYBOARD : {}) }
        );
        logger.info({ chatId }, isAdm ? "Admin opened bot" : "User requested chat ID");
        return;
      }

      // /bekor — cancel
      if (text === "/bekor" || text === "❌ Bekor") {
        resetState(chatId);
        await bot!.sendMessage(chatId, "✅ Bekor qilindi.", MAIN_KEYBOARD);
        return;
      }

      // ── Step-based conversation ─────────────────────────────────────────────
      if (state.step === "add_first_name") {
        state.data.firstName = text;
        state.step = "add_last_name";
        await bot!.sendMessage(chatId, "👤 Familiyasini kiriting:", {
          reply_markup: { force_reply: true },
        });
        return;
      }

      if (state.step === "add_last_name") {
        state.data.lastName = text;
        state.step = "add_phone";
        await bot!.sendMessage(chatId, "📞 Telefon raqamini kiriting (+998...):", {
          reply_markup: { force_reply: true },
        });
        return;
      }

      if (state.step === "add_phone") {
        state.data.phone = text;
        state.step = "add_plan";
        const plans = await getPlans();
        await bot!.sendMessage(chatId, "💎 Rejani tanlang:", {
          reply_markup: {
            inline_keyboard: plans.map((p) => [
              {
                text: `${p.name} — ${Number(p.price).toLocaleString("uz")} so'm (${p.durationDays} kun)`,
                callback_data: `plan_${p.id}`,
              },
            ]),
          },
        });
        return;
      }

      if (state.step === "pay_phone") {
        await findAndShowSubscriberByPhone(chatId, text);
        resetState(chatId);
        return;
      }

      // ── Main menu buttons ───────────────────────────────────────────────────
      if (text === "➕ Obunachi qo'shish") {
        state.step = "add_first_name";
        state.data = {};
        await bot!.sendMessage(chatId, "👤 A'zoning *ismini* kiriting:", {
          parse_mode: "Markdown",
          reply_markup: { force_reply: true },
        });
        return;
      }

      if (text === "👥 Obunachilar") {
        await bot!.sendMessage(chatId, "👥 *Obunachilar* — Ko'rish turini tanlang:", {
          parse_mode: "Markdown",
          ...subscribersMenu(),
        });
        return;
      }

      if (text === "💰 Moliya") {
        await bot!.sendMessage(chatId, "💰 *Moliya* — Bo'limni tanlang:", {
          parse_mode: "Markdown",
          ...financeMenu(),
        });
        return;
      }

      if (text === "📊 Statistika") {
        await sendStats(chatId);
        return;
      }

      // Fallback
      await bot!.sendMessage(chatId, "Tugmalardan birini tanlang 👇", MAIN_KEYBOARD);
    });

    // ── Callback query handler ───────────────────────────────────────────────
    bot.on("callback_query", async (query) => {
      const chatId = query.message!.chat.id;
      const data = query.data || "";
      const state = getState(chatId);

      await bot!.answerCallbackQuery(query.id);

      // Subscriber filters
      if (data === "subs_all") {
        await sendSubscriberList(chatId, "all");
        return;
      }
      if (data === "subs_active") {
        await sendSubscriberList(chatId, "active");
        return;
      }
      if (data === "subs_overdue") {
        await sendSubscriberList(chatId, "overdue");
        return;
      }

      // Finance
      if (data === "fin_monthly") {
        await sendMonthlyReport(chatId);
        return;
      }
      if (data === "fin_total") {
        await sendTotalRevenue(chatId);
        return;
      }
      if (data === "fin_pay") {
        state.step = "pay_phone";
        state.data = {};
        await bot!.sendMessage(
          chatId,
          "📞 A'zoning *telefon raqamini* kiriting:",
          { parse_mode: "Markdown", reply_markup: { force_reply: true } }
        );
        return;
      }

      // Plan selection during subscriber add
      if (data.startsWith("plan_")) {
        const planId = parseInt(data.replace("plan_", ""));
        state.data.planId = planId;

        const { firstName, lastName, phone } = state.data as Record<string, string>;
        const [plan] = await db.select().from(plansTable).where(eq(plansTable.id, planId));

        if (!plan) {
          await bot!.sendMessage(chatId, "❌ Reja topilmadi.", MAIN_KEYBOARD);
          resetState(chatId);
          return;
        }

        const today = new Date().toISOString().split("T")[0];
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + plan.durationDays);
        const endDateStr = endDate.toISOString().split("T")[0];

        const [newSub] = await db
          .insert(subscribersTable)
          .values({
            firstName,
            lastName,
            phone,
            planId,
            startDate: today,
            endDate: endDateStr,
            paymentStatus: "pending",
            status: "active",
          })
          .returning();

        await db.insert(notificationsTable).values({
          message: `Yangi a'zo (bot orqali): ${firstName} ${lastName} (${phone})`,
          type: "new_application",
          subscriberName: `${firstName} ${lastName}`,
        });

        resetState(chatId);
        await bot!.sendMessage(
          chatId,
          `✅ *A'zo muvaffaqiyatli qo'shildi!*\n\n` +
            `👤 ${firstName} ${lastName}\n` +
            `📞 ${phone}\n` +
            `💎 Reja: ${plan.name}\n` +
            `📅 ${today} → ${endDateStr}\n` +
            `💳 To'lov holati: ⏳ Kutilmoqda\n\n` +
            `🔢 ID: ${newSub.id}`,
          { parse_mode: "Markdown", ...MAIN_KEYBOARD }
        );
        return;
      }

      // Payment confirmation: pay_confirm_{subId}_{planId}_{price}
      if (data.startsWith("pay_confirm_")) {
        const parts = data.split("_");
        const subId = parseInt(parts[2]);
        const planId = parseInt(parts[3]);
        const price = parts[4];

        const today = new Date().toISOString().split("T")[0];
        const [plan] = await db.select().from(plansTable).where(eq(plansTable.id, planId));
        const [sub] = await db.select().from(subscribersTable).where(eq(subscribersTable.id, subId));

        if (!plan || !sub) {
          await bot!.sendMessage(chatId, "❌ Ma'lumot topilmadi.", MAIN_KEYBOARD);
          return;
        }

        // Create confirmed payment
        await db.insert(paymentsTable).values({
          subscriberId: subId,
          planId,
          amount: price,
          paymentDate: today,
          status: "confirmed",
          extendSubscription: true,
        });

        // Extend subscription
        const currentEnd = new Date(sub.endDate);
        const newEnd = new Date(Math.max(currentEnd.getTime(), Date.now()));
        newEnd.setDate(newEnd.getDate() + plan.durationDays);
        const newEndStr = newEnd.toISOString().split("T")[0];

        await db
          .update(subscribersTable)
          .set({
            endDate: newEndStr,
            status: "active",
            paymentStatus: "paid",
            updatedAt: new Date(),
          })
          .where(eq(subscribersTable.id, subId));

        await db.insert(notificationsTable).values({
          message: `To'lov tasdiqlandi (bot orqali): ${sub.firstName} ${sub.lastName} — ${plan.name}`,
          type: "payment_confirmed",
          subscriberId: subId,
          subscriberName: `${sub.firstName} ${sub.lastName}`,
        });

        await bot!.sendMessage(
          chatId,
          `✅ *To'lov qabul qilindi!*\n\n` +
            `👤 ${sub.firstName} ${sub.lastName}\n` +
            `💎 Reja: ${plan.name}\n` +
            `💰 Miqdor: ${Number(price).toLocaleString("uz")} so'm\n` +
            `📅 Yangi muddat: ${newEndStr}`,
          { parse_mode: "Markdown", ...MAIN_KEYBOARD }
        );
        return;
      }

      if (data === "pay_cancel") {
        resetState(chatId);
        await bot!.sendMessage(chatId, "✅ Bekor qilindi.", MAIN_KEYBOARD);
        return;
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
