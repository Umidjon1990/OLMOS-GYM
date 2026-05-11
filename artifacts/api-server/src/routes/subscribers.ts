import { Router } from "express";
import { db } from "@workspace/db";
import { subscribersTable, plansTable, paymentsTable } from "@workspace/db";
import { eq, and, ilike, or, sql } from "drizzle-orm";
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

    const result = rows.map(({ subscriber, planName }) => ({
      ...subscriber,
      planName: planName ?? "Unknown",
      daysLeft: calcDaysLeft(subscriber.endDate),
    }));

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to list subscribers");
    res.status(500).json({ error: "Failed to list subscribers" });
  }
});

router.post("/", async (req, res) => {
  try {
    const body = CreateSubscriberBody.parse(req.body);
    const [subscriber] = await db.insert(subscribersTable).values(body).returning();
    const [plan] = await db.select().from(plansTable).where(eq(plansTable.id, subscriber.planId));
    res.status(201).json({
      ...subscriber,
      planName: plan?.name ?? "Unknown",
      daysLeft: calcDaysLeft(subscriber.endDate),
    });
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

    res.json({
      ...row.subscriber,
      planName: row.planName ?? "Unknown",
      daysLeft: calcDaysLeft(row.subscriber.endDate),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get subscriber");
    res.status(500).json({ error: "Failed to get subscriber" });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const body = UpdateSubscriberBody.parse(req.body);
    const [updated] = await db
      .update(subscribersTable)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(subscribersTable.id, id))
      .returning();

    if (!updated) return res.status(404).json({ error: "Subscriber not found" });

    const [plan] = await db.select().from(plansTable).where(eq(plansTable.id, updated.planId));
    res.json({
      ...updated,
      planName: plan?.name ?? "Unknown",
      daysLeft: calcDaysLeft(updated.endDate),
    });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.issues });
    req.log.error({ err }, "Failed to update subscriber");
    res.status(500).json({ error: "Failed to update subscriber" });
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
