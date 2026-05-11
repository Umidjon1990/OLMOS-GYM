import { Router } from "express";
import { db } from "@workspace/db";
import { applicationsTable, plansTable, subscribersTable, notificationsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { ListApplicationsQueryParams, CreateApplicationBody } from "@workspace/api-zod";
import { sendAdminNotification } from "../services/telegram.js";

const router = Router();

async function formatApplication(app: typeof applicationsTable.$inferSelect, planName?: string | null) {
  return {
    ...app,
    planName: planName ?? null,
  };
}

router.get("/", async (req, res) => {
  try {
    const query = ListApplicationsQueryParams.parse(req.query);
    const rows = await db
      .select({ app: applicationsTable, planName: plansTable.name })
      .from(applicationsTable)
      .leftJoin(plansTable, eq(applicationsTable.planId, plansTable.id))
      .where(query.status ? eq(applicationsTable.status, query.status) : undefined)
      .orderBy(sql`${applicationsTable.createdAt} DESC`);

    res.json(rows.map(({ app, planName }) => ({ ...app, planName: planName ?? null })));
  } catch (err) {
    req.log.error({ err }, "Failed to list applications");
    res.status(500).json({ error: "Failed to list applications" });
  }
});

router.post("/", async (req, res) => {
  try {
    const body = CreateApplicationBody.parse(req.body);
    const [app] = await db.insert(applicationsTable).values({ ...body, status: "pending" }).returning();

    const plan = body.planId
      ? (await db.select().from(plansTable).where(eq(plansTable.id, body.planId)))[0]
      : null;

    await db.insert(notificationsTable).values({
      message: `Yangi ariza: ${app.firstName} ${app.lastName} (${app.phone})`,
      type: "new_application",
      subscriberName: `${app.firstName} ${app.lastName}`,
    });

    await sendAdminNotification(
      `📬 *Yangi ariza keldi!*\n\n` +
      `👤 ${app.firstName} ${app.lastName}\n` +
      `📞 ${app.phone}\n` +
      `💎 Reja: ${plan?.name ?? "Tanlanmagan"}\n\n` +
      `Admin panelda ko'rish: /admin/applications`
    );

    res.status(201).json({ ...app, planName: plan?.name ?? null });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.issues });
    req.log.error({ err }, "Failed to create application");
    res.status(500).json({ error: "Failed to create application" });
  }
});

router.post("/:id/approve", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [app] = await db.select().from(applicationsTable).where(eq(applicationsTable.id, id));
    if (!app) return res.status(404).json({ error: "Application not found" });

    const [approved] = await db
      .update(applicationsTable)
      .set({ status: "approved", updatedAt: new Date() })
      .where(eq(applicationsTable.id, id))
      .returning();

    // Convert to subscriber if plan is set
    if (app.planId) {
      const [plan] = await db.select().from(plansTable).where(eq(plansTable.id, app.planId));
      if (plan) {
        const today = new Date().toISOString().split("T")[0];
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + plan.durationDays);

        await db.insert(subscribersTable).values({
          firstName: app.firstName,
          lastName: app.lastName,
          phone: app.phone,
          planId: app.planId,
          startDate: today,
          endDate: endDate.toISOString().split("T")[0],
          paymentStatus: "pending",
          status: "active",
        }).onConflictDoNothing();
      }
    }

    const plan = app.planId
      ? (await db.select().from(plansTable).where(eq(plansTable.id, app.planId)))[0]
      : null;

    res.json({ ...approved, planName: plan?.name ?? null });
  } catch (err) {
    req.log.error({ err }, "Failed to approve application");
    res.status(500).json({ error: "Failed to approve application" });
  }
});

router.post("/:id/reject", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [rejected] = await db
      .update(applicationsTable)
      .set({ status: "rejected", updatedAt: new Date() })
      .where(eq(applicationsTable.id, id))
      .returning();

    if (!rejected) return res.status(404).json({ error: "Application not found" });

    const plan = rejected.planId
      ? (await db.select().from(plansTable).where(eq(plansTable.id, rejected.planId)))[0]
      : null;

    res.json({ ...rejected, planName: plan?.name ?? null });
  } catch (err) {
    req.log.error({ err }, "Failed to reject application");
    res.status(500).json({ error: "Failed to reject application" });
  }
});

export default router;
