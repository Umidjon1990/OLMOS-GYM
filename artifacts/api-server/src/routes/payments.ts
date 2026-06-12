import { Router } from "express";
import { db } from "@workspace/db";
import { paymentsTable, subscribersTable, plansTable, notificationsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { CreatePaymentBody, UpdatePaymentBody } from "@workspace/api-zod";
import { sendAdminNotification, notifySubscriber } from "../services/telegram.js";

const router = Router();

function formatPayment(payment: typeof paymentsTable.$inferSelect, subscriberName: string, planName: string) {
  return {
    ...payment,
    amount: parseFloat(String(payment.amount)),
    subscriberName,
    planName,
  };
}

router.get("/", async (req, res) => {
  try {
    const rows = await db
      .select({
        payment: paymentsTable,
        subscriberFirst: subscribersTable.firstName,
        subscriberLast: subscribersTable.lastName,
        planName: plansTable.name,
      })
      .from(paymentsTable)
      .leftJoin(subscribersTable, eq(paymentsTable.subscriberId, subscribersTable.id))
      .leftJoin(plansTable, eq(paymentsTable.planId, plansTable.id))
      .orderBy(sql`${paymentsTable.createdAt} DESC`);

    res.json(rows.map(({ payment, subscriberFirst, subscriberLast, planName }) =>
      formatPayment(payment, `${subscriberFirst ?? ""} ${subscriberLast ?? ""}`.trim(), planName ?? "Unknown")
    ));
  } catch (err) {
    req.log.error({ err }, "Failed to list payments");
    res.status(500).json({ error: "Failed to list payments" });
  }
});

router.post("/", async (req, res) => {
  try {
    const body = CreatePaymentBody.parse(req.body);
    const [payment] = await db.insert(paymentsTable).values({
      subscriberId: body.subscriberId,
      planId: body.planId,
      amount: String(body.amount),
      paymentDate: body.paymentDate instanceof Date ? body.paymentDate.toISOString().split("T")[0] : body.paymentDate,
      notes: body.notes,
      extendSubscription: body.extendSubscription ?? true,
      status: "pending",
    }).returning();

    const [subscriber] = await db.select().from(subscribersTable).where(eq(subscribersTable.id, body.subscriberId));
    const [plan] = await db.select().from(plansTable).where(eq(plansTable.id, body.planId));

    res.status(201).json(formatPayment(
      payment,
      `${subscriber?.firstName ?? ""} ${subscriber?.lastName ?? ""}`.trim(),
      plan?.name ?? "Unknown"
    ));
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.issues });
    req.log.error({ err }, "Failed to create payment");
    res.status(500).json({ error: "Failed to create payment" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [row] = await db
      .select({ payment: paymentsTable, subscriberFirst: subscribersTable.firstName, subscriberLast: subscribersTable.lastName, planName: plansTable.name })
      .from(paymentsTable)
      .leftJoin(subscribersTable, eq(paymentsTable.subscriberId, subscribersTable.id))
      .leftJoin(plansTable, eq(paymentsTable.planId, plansTable.id))
      .where(eq(paymentsTable.id, id));

    if (!row) return res.status(404).json({ error: "Payment not found" });
    res.json(formatPayment(row.payment, `${row.subscriberFirst ?? ""} ${row.subscriberLast ?? ""}`.trim(), row.planName ?? "Unknown"));
  } catch (err) {
    req.log.error({ err }, "Failed to get payment");
    res.status(500).json({ error: "Failed to get payment" });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const body = UpdatePaymentBody.parse(req.body);
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (body.amount !== undefined) updateData.amount = String(body.amount);
    if (body.paymentDate !== undefined) updateData.paymentDate = body.paymentDate;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.notes !== undefined) updateData.notes = body.notes;

    const [updated] = await db.update(paymentsTable).set(updateData).where(eq(paymentsTable.id, id)).returning();
    if (!updated) return res.status(404).json({ error: "Payment not found" });

    const [subscriber] = await db.select().from(subscribersTable).where(eq(subscribersTable.id, updated.subscriberId));
    const [plan] = await db.select().from(plansTable).where(eq(plansTable.id, updated.planId));
    res.json(formatPayment(updated, `${subscriber?.firstName ?? ""} ${subscriber?.lastName ?? ""}`.trim(), plan?.name ?? "Unknown"));
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.issues });
    req.log.error({ err }, "Failed to update payment");
    res.status(500).json({ error: "Failed to update payment" });
  }
});

router.post("/:id/confirm", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [payment] = await db.select().from(paymentsTable).where(eq(paymentsTable.id, id));
    if (!payment) return res.status(404).json({ error: "Payment not found" });

    const [confirmed] = await db
      .update(paymentsTable)
      .set({ status: "confirmed", updatedAt: new Date() })
      .where(eq(paymentsTable.id, id))
      .returning();

    // Extend subscription if requested
    if (payment.extendSubscription) {
      const [plan] = await db.select().from(plansTable).where(eq(plansTable.id, payment.planId));
      const [subscriber] = await db.select().from(subscribersTable).where(eq(subscribersTable.id, payment.subscriberId));
      if (plan && subscriber) {
        // Yangi muddat har doim oxirgi tugash sanasidan hisoblanadi (to'langan sanadan emas)
        const currentEnd = new Date(subscriber.endDate);
        const newEnd = new Date(currentEnd);
        newEnd.setDate(newEnd.getDate() + plan.durationDays);
        await db.update(subscribersTable)
          .set({ endDate: newEnd.toISOString().split("T")[0], status: "active", paymentStatus: "paid", debtAmount: "0", updatedAt: new Date() })
          .where(eq(subscribersTable.id, payment.subscriberId));

        await db.insert(notificationsTable).values({
          message: `To'lov tasdiqlandi: ${subscriber.firstName} ${subscriber.lastName} — ${plan.name}`,
          type: "payment_confirmed",
          subscriberId: subscriber.id,
          subscriberName: `${subscriber.firstName} ${subscriber.lastName}`,
        });

        await sendAdminNotification(
          `✅ *To'lov tasdiqlandi!*\n\n` +
          `👤 ${subscriber.firstName} ${subscriber.lastName}\n` +
          `💎 Reja: ${plan.name}\n` +
          `💰 Miqdor: ${Number(payment.amount).toLocaleString("uz")} so'm\n` +
          `📅 Obuna tugaydi: ${newEnd.toISOString().split("T")[0]}`
        );

        await notifySubscriber(
          subscriber.id,
          `✅ *To'lovingiz qabul qilindi!*\n\n` +
          `💎 Reja: ${plan.name}\n` +
          `💰 Miqdor: ${Number(payment.amount).toLocaleString("uz")} so'm\n` +
          `📅 Obunangiz: ${newEnd.toISOString().split("T")[0]} gacha`
        );
      }
    }

    const [subscriber] = await db.select().from(subscribersTable).where(eq(subscribersTable.id, confirmed.subscriberId));
    const [plan] = await db.select().from(plansTable).where(eq(plansTable.id, confirmed.planId));
    res.json(formatPayment(confirmed, `${subscriber?.firstName ?? ""} ${subscriber?.lastName ?? ""}`.trim(), plan?.name ?? "Unknown"));
  } catch (err) {
    req.log.error({ err }, "Failed to confirm payment");
    res.status(500).json({ error: "Failed to confirm payment" });
  }
});

export default router;
