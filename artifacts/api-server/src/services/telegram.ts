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
  | "add_payment_status"
  | "pay_phone"
  | "member_phone";

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

// ─── Helpers ──────────────────────────────────────────────────────────────────
function isAdmin(chatId: number): boolean {
  return process.env.ADMIN_TELEGRAM_CHAT_ID === String(chatId);
}

async function getPlans() {
  return db.select().from(plansTable).where(eq(plansTable.isActive, true));
}

function formatSubscriberCard(
  sub: typeof subscribersTable.$inferSelect & { planName?: string | null }
): string {
  const statusLabel: Record<string, string> = {
    active: "✅ Faol",
    expired: "❌ Muddati tugagan",
    pending: "⏳ Kutilmoqda",
    blocked: "🚫 Bloklangan",
  };
  const payLabel: Record<string, string> = {
    paid: "✅ To'langan",
    pending: "⚠️ To'lanmagan (qarz)",
    overdue: "❌ Muddati o'tgan",
  };
  const daysLeft = Math.floor(
    (new Date(sub.endDate).getTime() - Date.now()) / 86400000
  );
  const daysText =
    daysLeft > 0 ? `*${daysLeft} kun* qoldi` : "⚠️ Muddati tugagan";

  return (
    `👤 *${sub.firstName} ${sub.lastName}*\n` +
    `📞 ${sub.phone}\n` +
    `💎 Reja: ${sub.planName ?? "—"}\n` +
    `📅 ${sub.startDate} → ${sub.endDate}\n` +
    `🗓 Qolgan: ${daysText}\n` +
    `💳 To'lov: ${payLabel[sub.paymentStatus] ?? sub.paymentStatus}\n` +
    `📌 Holat: ${statusLabel[sub.status] ?? sub.status}`
  );
}

// ─── Member info by telegramChatId ────────────────────────────────────────────
async function getLinkedSubscriber(chatId: number) {
  const rows = await db
    .select({ sub: subscribersTable, planName: plansTable.name })
    .from(subscribersTable)
    .leftJoin(plansTable, eq(subscribersTable.planId, plansTable.id))
    .where(eq(subscribersTable.telegramChatId, String(chatId)));
  return rows[0] ?? null;
}

async function showMemberInfo(chatId: number) {
  const row = await getLinkedSubscriber(chatId);
  if (!row) {
    await bot!.sendMessage(
      chatId,
      `❓ Hisobingiz topilmadi.\n\n📞 Telefon raqamingizni yuboring (masalan: +998901234567):`,
      { reply_markup: { force_reply: true } }
    );
    getState(chatId).step = "member_phone";
    return;
  }
  const sub = { ...row.sub, planName: row.planName };
  const daysLeft = Math.floor(
    (new Date(sub.endDate).getTime() - Date.now()) / 86400000
  );

  let extra = "";
  if (daysLeft <= 0) {
    extra = `\n\n⚠️ *Obunangiz tugagan!* Iltimos, to'lov qiling.`;
  } else if (daysLeft <= 5) {
    extra = `\n\n⏰ *Diqqat:* ${daysLeft} kun qoldi. To'lovni kechiktirmang!`;
  } else if (sub.paymentStatus === "pending" || sub.paymentStatus === "overdue") {
    extra = `\n\n⚠️ *To'lov qilinmagan!* Iltimos, to'lovingizni amalga oshiring.`;
  }

  await bot!.sendMessage(chatId, `${formatSubscriberCard(sub)}${extra}`, {
    parse_mode: "Markdown",
    reply_markup: {
      keyboard: [[{ text: "📊 Ma'lumotlarim" }]],
      resize_keyboard: true,
      persistent: true,
    },
  });
}

async function linkMemberByPhone(chatId: number, phone: string) {
  const clean = phone.replace(/\s+/g, "").replace(/[^\d+]/g, "");
  const rows = await db
    .select({ sub: subscribersTable, planName: plansTable.name })
    .from(subscribersTable)
    .leftJoin(plansTable, eq(subscribersTable.planId, plansTable.id))
    .where(ilike(subscribersTable.phone, `%${clean}%`));

  if (rows.length === 0) {
    await bot!.sendMessage(
      chatId,
      `❌ *${phone}* raqami bilan ro'yxatdan o'tilmagan.\n\n` +
        `Telefon raqamingizni to'g'ri kiriting yoki admin bilan bog'laning:`,
      {
        parse_mode: "Markdown",
        reply_markup: { force_reply: true },
      }
    );
    return;
  }

  const { sub, planName } = rows[0];
  await db
    .update(subscribersTable)
    .set({ telegramChatId: String(chatId), updatedAt: new Date() })
    .where(eq(subscribersTable.id, sub.id));

  const updated = { ...sub, telegramChatId: String(chatId), planName };
  resetState(chatId);
  await bot!.sendMessage(
    chatId,
    `✅ *Hisobingiz ulandi!*\n\n${formatSubscriberCard(updated)}`,
    {
      parse_mode: "Markdown",
      reply_markup: {
        keyboard: [[{ text: "📊 Ma'lumotlarim" }]],
        resize_keyboard: true,
        persistent: true,
      },
    }
  );
  logger.info({ chatId, subscriberId: sub.id }, "Member linked via phone");
}

// ─── Admin: subscriber list ───────────────────────────────────────────────────
async function sendSubscriberList(chatId: number, filter: "all" | "active" | "overdue") {
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

  const lines = rows.map(
    ({ sub, planName }, i) =>
      `${i + 1}. *${sub.firstName} ${sub.lastName}* — ${sub.phone} | ${planName ?? "—"}\n`
  );

  let chunk = `${title} (${rows.length} ta)\n\n`;
  for (const line of lines) {
    if (chunk.length + line.length > 3900) {
      await bot!.sendMessage(chatId, chunk, { parse_mode: "Markdown" });
      chunk = "";
    }
    chunk += line;
  }
  if (chunk) await bot!.sendMessage(chatId, chunk, { parse_mode: "Markdown" });
}

// ─── Admin: finance ───────────────────────────────────────────────────────────
async function sendMonthlyReport(chatId: number) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const monthStart = `${year}-${month}-01`;
  const monthEnd = new Date(year, now.getMonth() + 1, 1).toISOString().split("T")[0];

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

  const total = payments.reduce((s, p) => s + Number(p.amount), 0);
  const [active] = await db
    .select({ count: sql<number>`count(*)` })
    .from(subscribersTable)
    .where(eq(subscribersTable.status, "active"));

  const monthNames = ["Yanvar","Fevral","Mart","Aprel","May","Iyun","Iyul","Avgust","Sentabr","Oktabr","Noyabr","Dekabr"];
  await bot!.sendMessage(
    chatId,
    `📅 *${monthNames[now.getMonth()]} ${year} — Oylik hisobot*\n\n` +
      `💰 Daromad: *${total.toLocaleString("uz")} so'm*\n` +
      `✅ To'lovlar: *${payments.length} ta*\n` +
      `👥 Faol a'zolar: *${active?.count ?? 0} ta*`,
    { parse_mode: "Markdown" }
  );
}

async function sendTotalRevenue(chatId: number) {
  const payments = await db.select().from(paymentsTable).where(eq(paymentsTable.status, "confirmed"));
  const total = payments.reduce((s, p) => s + Number(p.amount), 0);
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
      `🧾 To'lovlar: *${payments.length} ta*\n` +
      `👥 Jami a'zolar: *${stats?.total ?? 0} ta*\n` +
      `✅ Faol: *${stats?.active ?? 0} ta*`,
    { parse_mode: "Markdown" }
  );
}

async function sendStats(chatId: number) {
  const [stats] = await db
    .select({
      total: sql<number>`count(*)`,
      active: sql<number>`sum(case when status = 'active' then 1 else 0 end)`,
      expired: sql<number>`sum(case when status = 'expired' then 1 else 0 end)`,
      overdue: sql<number>`sum(case when payment_status in ('overdue','pending') then 1 else 0 end)`,
    })
    .from(subscribersTable);
  const [rev] = await db
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
      `💰 Jami daromad: *${Number(rev?.total ?? 0).toLocaleString("uz")} so'm*`,
    { parse_mode: "Markdown" }
  );
}

// ─── Admin: payment search ────────────────────────────────────────────────────
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
      `❌ *${phone}* raqamli a'zo topilmadi.\n\nQaytadan kiriting:`,
      { parse_mode: "Markdown", reply_markup: { force_reply: true } }
    );
    getState(chatId).step = "pay_phone";
    return;
  }

  const { sub, planName } = rows[0];
  const plans = await getPlans();
  const subWithPlan = {
    ...sub,
    planName,
    daysLeft: Math.floor((new Date(sub.endDate).getTime() - Date.now()) / 86400000),
  };

  await bot!.sendMessage(
    chatId,
    `${formatSubscriberCard(subWithPlan)}\n\n📌 *Qaysi reja uchun to'lov qabul qilasiz?*`,
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          ...plans.map((p) => [
            {
              text: `💳 ${p.name} — ${Number(p.price).toLocaleString("uz")} so'm`,
              callback_data: `pay_confirm_${sub.id}_${p.id}_${p.price}`,
            },
          ]),
          [{ text: "❌ Bekor qilish", callback_data: "pay_cancel" }],
        ],
      },
    }
  );
}

// ─── Keyboards ────────────────────────────────────────────────────────────────
const ADMIN_KEYBOARD: TelegramBot.SendMessageOptions = {
  reply_markup: {
    keyboard: [
      [{ text: "➕ Obunachi qo'shish" }, { text: "👥 Obunachilar" }],
      [{ text: "💰 Moliya" }, { text: "📊 Statistika" }],
    ],
    resize_keyboard: true,
    persistent: true,
  },
};

const MEMBER_KEYBOARD: TelegramBot.SendMessageOptions = {
  reply_markup: {
    keyboard: [[{ text: "📊 Ma'lumotlarim" }]],
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

// ─── Notify a subscriber via Telegram ────────────────────────────────────────
export async function notifySubscriber(subscriberId: number, message: string): Promise<void> {
  if (!bot) return;
  try {
    const [sub] = await db
      .select({ telegramChatId: subscribersTable.telegramChatId })
      .from(subscribersTable)
      .where(eq(subscribersTable.id, subscriberId));
    if (sub?.telegramChatId) {
      await bot.sendMessage(sub.telegramChatId, message, { parse_mode: "Markdown" });
    }
  } catch (err) {
    logger.warn({ err }, "Failed to notify subscriber");
  }
}

// ─── Admin notification ───────────────────────────────────────────────────────
export async function sendAdminNotification(message: string): Promise<void> {
  if (!bot) return;
  const adminChatId = process.env.ADMIN_TELEGRAM_CHAT_ID;
  if (!adminChatId) return;
  try {
    await bot.sendMessage(adminChatId, message, { parse_mode: "Markdown" });
  } catch (err) {
    logger.error({ err }, "Failed to send admin notification");
  }
}

// ─── Bot init ─────────────────────────────────────────────────────────────────
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
      const admin = isAdmin(chatId);

      // ── /start ─────────────────────────────────────────────────────────────
      if (text === "/start") {
        resetState(chatId);
        if (admin) {
          await bot!.sendMessage(
            chatId,
            `💎 *OLMOS FITNESS Admin Bot*\n\nXush kelibsiz, admin! Tugmalardan foydalaning.`,
            { parse_mode: "Markdown", ...ADMIN_KEYBOARD }
          );
        } else {
          // Member flow: check if already linked
          const linked = await getLinkedSubscriber(chatId);
          if (linked) {
            await showMemberInfo(chatId);
          } else {
            state.step = "member_phone";
            await bot!.sendMessage(
              chatId,
              `💎 *OLMOS FITNESS*\n\nXush kelibsiz! Hisobingizga kirish uchun *telefon raqamingizni* yuboring:`,
              { parse_mode: "Markdown", reply_markup: { force_reply: true } }
            );
          }
        }
        logger.info({ chatId, admin }, "User started bot");
        return;
      }

      // /chatid — for linking admin
      if (text === "/chatid") {
        await bot!.sendMessage(chatId, `🆔 Sizning Chat ID: \`${chatId}\``, {
          parse_mode: "Markdown",
        });
        return;
      }

      // ── Member flow ────────────────────────────────────────────────────────
      if (!admin) {
        if (state.step === "member_phone") {
          await linkMemberByPhone(chatId, text);
          return;
        }
        if (text === "📊 Ma'lumotlarim") {
          await showMemberInfo(chatId);
          return;
        }
        // Unknown message from member — show their info
        await showMemberInfo(chatId);
        return;
      }

      // ── Admin: cancel ──────────────────────────────────────────────────────
      if (text === "/bekor" || text === "❌ Bekor") {
        resetState(chatId);
        await bot!.sendMessage(chatId, "✅ Bekor qilindi.", ADMIN_KEYBOARD);
        return;
      }

      // ── Admin: step-based conversation ─────────────────────────────────────
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
        return;
      }

      // ── Admin: main menu buttons ───────────────────────────────────────────
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

      await bot!.sendMessage(chatId, "Tugmalardan birini tanlang 👇", ADMIN_KEYBOARD);
    });

    // ── Callback query handler ───────────────────────────────────────────────
    bot.on("callback_query", async (query) => {
      const chatId = query.message!.chat.id;
      const data = query.data || "";
      const state = getState(chatId);
      await bot!.answerCallbackQuery(query.id);

      // Subscriber list filters
      if (data === "subs_all") { await sendSubscriberList(chatId, "all"); return; }
      if (data === "subs_active") { await sendSubscriberList(chatId, "active"); return; }
      if (data === "subs_overdue") { await sendSubscriberList(chatId, "overdue"); return; }

      // Finance
      if (data === "fin_monthly") { await sendMonthlyReport(chatId); return; }
      if (data === "fin_total") { await sendTotalRevenue(chatId); return; }
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

      // Plan selection → ask payment status
      if (data.startsWith("plan_") && state.step === "add_plan") {
        const planId = parseInt(data.replace("plan_", ""));
        state.data.planId = planId;
        state.step = "add_payment_status";
        const [plan] = await db.select().from(plansTable).where(eq(plansTable.id, planId));
        await bot!.sendMessage(
          chatId,
          `💎 Reja: *${plan?.name}* (${Number(plan?.price ?? 0).toLocaleString("uz")} so'm)\n\n💳 *To'lov holati qanday?*`,
          {
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: [[
                { text: "✅ To'landi", callback_data: "ps_paid" },
                { text: "⚠️ Qarz", callback_data: "ps_debt" },
              ]],
            },
          }
        );
        return;
      }

      // Payment status → save subscriber
      if (data === "ps_paid" || data === "ps_debt") {
        const paymentStatus = data === "ps_paid" ? "paid" : "pending";
        const { firstName, lastName, phone, planId } = state.data as Record<string, string>;

        if (!firstName || !lastName || !phone || !planId) {
          await bot!.sendMessage(chatId, "❌ Ma'lumotlar to'liq emas. Qaytadan boshlang.", ADMIN_KEYBOARD);
          resetState(chatId);
          return;
        }

        const [plan] = await db.select().from(plansTable).where(eq(plansTable.id, Number(planId)));
        if (!plan) {
          await bot!.sendMessage(chatId, "❌ Reja topilmadi.", ADMIN_KEYBOARD);
          resetState(chatId);
          return;
        }

        const today = new Date().toISOString().split("T")[0];
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + plan.durationDays);
        const endDateStr = endDate.toISOString().split("T")[0];

        const [newSub] = await db
          .insert(subscribersTable)
          .values({ firstName, lastName, phone, planId: Number(planId), startDate: today, endDate: endDateStr, paymentStatus, status: "active" })
          .returning();

        if (paymentStatus === "paid") {
          await db.insert(paymentsTable).values({
            subscriberId: newSub.id, planId: Number(planId),
            amount: String(plan.price), paymentDate: today,
            status: "confirmed", extendSubscription: false,
          });
        }

        await db.insert(notificationsTable).values({
          message: `Yangi a'zo (bot orqali): ${firstName} ${lastName} (${phone})`,
          type: "new_application",
          subscriberName: `${firstName} ${lastName}`,
        });

        resetState(chatId);
        await bot!.sendMessage(
          chatId,
          `✅ *A'zo qo'shildi!*\n\n` +
            `👤 ${firstName} ${lastName}\n📞 ${phone}\n` +
            `💎 ${plan.name} — ${Number(plan.price).toLocaleString("uz")} so'm\n` +
            `📅 ${today} → ${endDateStr}\n` +
            `💳 ${paymentStatus === "paid" ? "✅ To'landi" : "⚠️ Qarz"}\n🔢 ID: ${newSub.id}`,
          { parse_mode: "Markdown", ...ADMIN_KEYBOARD }
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
          await bot!.sendMessage(chatId, "❌ Ma'lumot topilmadi.", ADMIN_KEYBOARD);
          return;
        }

        await db.insert(paymentsTable).values({
          subscriberId: subId, planId, amount: price,
          paymentDate: today, status: "confirmed", extendSubscription: true,
        });

        const currentEnd = new Date(sub.endDate);
        const newEnd = new Date(Math.max(currentEnd.getTime(), Date.now()));
        newEnd.setDate(newEnd.getDate() + plan.durationDays);
        const newEndStr = newEnd.toISOString().split("T")[0];

        await db.update(subscribersTable)
          .set({ endDate: newEndStr, status: "active", paymentStatus: "paid", updatedAt: new Date() })
          .where(eq(subscribersTable.id, subId));

        await db.insert(notificationsTable).values({
          message: `To'lov tasdiqlandi (bot orqali): ${sub.firstName} ${sub.lastName} — ${plan.name}`,
          type: "payment_confirmed", subscriberId: subId,
          subscriberName: `${sub.firstName} ${sub.lastName}`,
        });

        // Notify the member if they have Telegram linked
        if (sub.telegramChatId) {
          await bot!.sendMessage(
            sub.telegramChatId,
            `✅ *To'lovingiz qabul qilindi!*\n\n` +
              `💎 Reja: ${plan.name}\n` +
              `💰 Miqdor: ${Number(price).toLocaleString("uz")} so'm\n` +
              `📅 Obuna muddati: ${newEndStr} gacha`,
            { parse_mode: "Markdown", ...MEMBER_KEYBOARD }
          );
        }

        resetState(chatId);
        await bot!.sendMessage(
          chatId,
          `✅ *To'lov qabul qilindi!*\n\n👤 ${sub.firstName} ${sub.lastName}\n` +
            `💎 ${plan.name}\n💰 ${Number(price).toLocaleString("uz")} so'm\n📅 → ${newEndStr}`,
          { parse_mode: "Markdown", ...ADMIN_KEYBOARD }
        );
        return;
      }

      if (data === "pay_cancel") {
        resetState(chatId);
        await bot!.sendMessage(chatId, "✅ Bekor qilindi.", ADMIN_KEYBOARD);
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
