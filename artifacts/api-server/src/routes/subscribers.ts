import { Router } from "express";
import { db } from "@workspace/db";
import { subscribersTable, plansTable, paymentsTable, notificationsTable } from "@workspace/db";
import { eq, and, ilike, or, sql, inArray } from "drizzle-orm";
import { z } from "zod";
import {
  ListSubscribersQueryParams,
  CreateSubscriberBody,
  UpdateSubscriberBody,
} from "@workspace/api-zod";

const router = Router();

function calcDaysLeft(endDate: string): number {
  const end = new Date(endDate);
  return Math.ceil((end.getTime() - Date.now()) / 86400000);
}

async function formatSubscriber(subscriber: typeof subscribersTable.$inferSelect, planName: string) {
  return {
    ...subscriber,
    debtAmount: Number(subscriber.debtAmount),
    planName,
    daysLeft: calcDaysLeft(subscriber.endDate),
  };
}

router.get("/", async (req, res) => {
  try {
    const query = ListSubscribersQueryParams.parse(req.query);

    const conditions = [];
    if (query.status) conditions.push(eq(subscribersTable.status, query.status));
    if (query.planId) conditions.push(eq(subscribersTable.planId, Number(query.planId)));
    if (query.paymentStatus) conditions.push(eq(subscribersTable.paymentStatus, query.paymentStatus));
    if (query.search) {
      conditions.push(
        or(
          ilike(subscribersTable.firstName, `%${query.search}%`),
          ilike(subscribersTable.lastName, `%${query.search}%`),
          ilike(subscribersTable.phone, `%${query.search}%`),
        )
      );
    }

    const rows = await db
      .select({ subscriber: subscribersTable, planName: plansTable.name })
      .from(subscribersTable)
      .leftJoin(plansTable, eq(subscribersTable.planId, plansTable.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(sql`${subscribersTable.createdAt} DESC`);

    const result = await Promise.all(
      rows.map(({ subscriber, planName }) => formatSubscriber(subscriber, planName ?? "Unknown"))
    );

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to list subscribers");
    res.status(500).json({ error: "Failed to list subscribers" });
  }
});

router.post("/bulk", async (req, res) => {
  try {
    const { planId, paymentStatus = "pending", rows } = req.body as {
      planId: number;
      paymentStatus?: "paid" | "pending";
      rows: { firstName: string; lastName: string; phone: string; startDate: string; amountPaid?: number }[];
    };

    if (!planId || !Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: "planId va rows majburiy" });
    }

    const [plan] = await db.select().from(plansTable).where(eq(plansTable.id, planId));
    if (!plan) return res.status(404).json({ error: "Reja topilmadi" });

    const planPrice = Number(plan.price);

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const row of rows) {
      try {
        const { firstName, lastName, phone, startDate } = row;
        if (!firstName || !lastName || !phone || !startDate) {
          skipped++;
          errors.push(`${firstName} ${lastName}: Ma'lumotlar to'liq emas`);
          continue;
        }

        // To'langan summa: agar ko'rsatilmagan bo'lsa, paymentStatus ga qarab default
        const paid = row.amountPaid != null && !Number.isNaN(Number(row.amountPaid))
          ? Math.max(0, Number(row.amountPaid))
          : (paymentStatus === "paid" ? planPrice : 0);

        const debt = Math.max(0, planPrice - paid);
        const rowPaymentStatus = debt <= 0 ? "paid" : "pending";

        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + plan.durationDays);
        const endDateStr = endDate.toISOString().split("T")[0];

        // A'zolik holati bugungi kunga nisbatan hisoblanadi (Toshkent vaqti):
        // tugash sanasi o'tib ketgan bo'lsa — "muddati tugagan"
        const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Tashkent" });
        const membershipStatus = endDateStr < todayStr ? "expired" : "active";

        const [newSub] = await db.insert(subscribersTable).values({
          firstName,
          lastName,
          phone,
          planId,
          startDate,
          endDate: endDateStr,
          paymentStatus: rowPaymentStatus,
          debtAmount: String(debt),
          status: membershipStatus,
        }).returning();

        // To'langan summa bo'lsa, to'lov yozuvi yaratiladi
        if (paid > 0) {
          await db.insert(paymentsTable).values({
            subscriberId: newSub.id,
            planId,
            amount: String(paid),
            paymentDate: startDate,
            status: "confirmed",
            extendSubscription: false,
          });
        }

        imported++;
      } catch (rowErr) {
        skipped++;
        errors.push(`${row.firstName} ${row.lastName}: ${String(rowErr)}`);
      }
    }

    res.json({ imported, skipped, errors });
  } catch (err) {
    req.log.error({ err }, "Failed to bulk import subscribers");
    res.status(500).json({ error: "Bulk import xatosi" });
  }
});

router.post("/", async (req, res) => {
  try {
    const body = CreateSubscriberBody.parse(req.body);
    const { startDate, endDate, ...restBody } = body;
    const [subscriber] = await db.insert(subscribersTable).values({
      ...restBody,
      startDate: startDate instanceof Date ? startDate.toISOString().split("T")[0] : startDate,
      endDate: endDate instanceof Date ? endDate.toISOString().split("T")[0] : endDate,
    }).returning();
    const [plan] = await db.select().from(plansTable).where(eq(plansTable.id, subscriber.planId));
    res.status(201).json(await formatSubscriber(subscriber, plan?.name ?? "Unknown"));
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.issues });
    req.log.error({ err }, "Failed to create subscriber");
    res.status(500).json({ error: "Failed to create subscriber" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [row] = await db
      .select({ subscriber: subscribersTable, planName: plansTable.name })
      .from(subscribersTable)
      .leftJoin(plansTable, eq(subscribersTable.planId, plansTable.id))
      .where(eq(subscribersTable.id, id));

    if (!row) return res.status(404).json({ error: "Subscriber not found" });

    res.json(await formatSubscriber(row.subscriber, row.planName ?? "Unknown"));
  } catch (err) {
    req.log.error({ err }, "Failed to get subscriber");
    res.status(500).json({ error: "Failed to get subscriber" });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const body = UpdateSubscriberBody.parse(req.body);
    const { startDate: sd, endDate: ed, ...restBody } = body;
    const [updated] = await db
      .update(subscribersTable)
      .set({
        ...restBody,
        ...(sd !== undefined ? { startDate: sd instanceof Date ? sd.toISOString().split("T")[0] : sd } : {}),
        ...(ed !== undefined ? { endDate: ed instanceof Date ? ed.toISOString().split("T")[0] : ed } : {}),
        updatedAt: new Date(),
      })
      .where(eq(subscribersTable.id, id))
      .returning();

    if (!updated) return res.status(404).json({ error: "Subscriber not found" });

    const [plan] = await db.select().from(plansTable).where(eq(plansTable.id, updated.planId));
    res.json(await formatSubscriber(updated, plan?.name ?? "Unknown"));
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.issues });
    req.log.error({ err }, "Failed to update subscriber");
    res.status(500).json({ error: "Failed to update subscriber" });
  }
});

router.delete("/bulk", async (req, res) => {
  try {
    const { ids } = req.body as { ids: number[] };
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: "ids array required" });
    await db.delete(subscribersTable).where(inArray(subscribersTable.id, ids));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to bulk delete subscribers");
    res.status(500).json({ error: "Failed to bulk delete subscribers" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(subscribersTable).where(eq(subscribersTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete subscriber");
    res.status(500).json({ error: "Failed to delete subscriber" });
  }
});

router.get("/:id/payments", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
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
      .where(eq(paymentsTable.subscriberId, id))
      .orderBy(sql`${paymentsTable.createdAt} DESC`);

    res.json(rows.map(({ payment, subscriberFirst, subscriberLast, planName }) => ({
      ...payment,
      amount: parseFloat(String(payment.amount)),
      subscriberName: `${subscriberFirst ?? ""} ${subscriberLast ?? ""}`.trim(),
      planName: planName ?? "Unknown",
    })));
  } catch (err) {
    req.log.error({ err }, "Failed to get subscriber payments");
    res.status(500).json({ error: "Failed to get subscriber payments" });
  }
});

export default router;
