import { Router } from "express";
import { db } from "@workspace/db";
import {
  subscribersTable,
  plansTable,
  paymentsTable,
  applicationsTable,
} from "@workspace/db";
import { eq, and, gte, lte, lt, count, sum, sql } from "drizzle-orm";

const router = Router();

router.get("/stats", async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const threeDaysLater = new Date(Date.now() + 3 * 86400000).toISOString().split("T")[0];

    const [totalRes] = await db.select({ count: count() }).from(subscribersTable);
    const [activeRes] = await db.select({ count: count() }).from(subscribersTable).where(eq(subscribersTable.status, "active"));
    const [expiredRes] = await db.select({ count: count() }).from(subscribersTable).where(eq(subscribersTable.status, "expired"));
    const [expiringSoonRes] = await db.select({ count: count() }).from(subscribersTable).where(
      and(
        eq(subscribersTable.status, "active"),
        gte(subscribersTable.endDate, today),
        lte(subscribersTable.endDate, threeDaysLater),
      )
    );
    const [pendingPaymentRes] = await db.select({ count: count() }).from(subscribersTable).where(
      eq(subscribersTable.paymentStatus, "pending")
    );
    const [revenueRes] = await db.select({ total: sum(paymentsTable.amount) }).from(paymentsTable).where(
      eq(paymentsTable.status, "confirmed")
    );
    const [newAppsRes] = await db.select({ count: count() }).from(applicationsTable).where(
      eq(applicationsTable.status, "pending")
    );

    const planBreakdown = await db
      .select({
        planName: plansTable.name,
        count: count(subscribersTable.id),
      })
      .from(subscribersTable)
      .leftJoin(plansTable, eq(subscribersTable.planId, plansTable.id))
      .where(eq(subscribersTable.status, "active"))
      .groupBy(plansTable.name);

    res.json({
      totalSubscribers: totalRes.count,
      activeSubscribers: activeRes.count,
      expiredSubscribers: expiredRes.count,
      expiringSoon: expiringSoonRes.count,
      pendingPayment: pendingPaymentRes.count,
      totalRevenue: parseFloat(String(revenueRes.total ?? 0)),
      newApplications: newAppsRes.count,
      planBreakdown: planBreakdown.map(p => ({
        planName: p.planName ?? "Unknown",
        count: p.count,
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get dashboard stats");
    res.status(500).json({ error: "Failed to get dashboard stats" });
  }
});

router.get("/expiring-soon", async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const threeDaysLater = new Date(Date.now() + 3 * 86400000).toISOString().split("T")[0];

    const rows = await db
      .select({
        subscriber: subscribersTable,
        planName: plansTable.name,
      })
      .from(subscribersTable)
      .leftJoin(plansTable, eq(subscribersTable.planId, plansTable.id))
      .where(
        and(
          eq(subscribersTable.status, "active"),
          gte(subscribersTable.endDate, today),
          lte(subscribersTable.endDate, threeDaysLater),
        )
      );

    const result = rows.map(({ subscriber, planName }) => {
      const endDate = new Date(subscriber.endDate);
      const daysLeft = Math.ceil((endDate.getTime() - Date.now()) / 86400000);
      return {
        ...subscriber,
        planName: planName ?? "Unknown",
        daysLeft,
      };
    });

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to get expiring soon");
    res.status(500).json({ error: "Failed to get expiring soon" });
  }
});

router.get("/recent-payments", async (req, res) => {
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
      .orderBy(sql`${paymentsTable.createdAt} DESC`)
      .limit(10);

    const result = rows.map(({ payment, subscriberFirst, subscriberLast, planName }) => ({
      ...payment,
      amount: parseFloat(String(payment.amount)),
      subscriberName: `${subscriberFirst} ${subscriberLast}`,
      planName: planName ?? "Unknown",
    }));

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to get recent payments");
    res.status(500).json({ error: "Failed to get recent payments" });
  }
});

export default router;
