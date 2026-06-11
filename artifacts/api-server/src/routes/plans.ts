import { Router } from "express";
import { db } from "@workspace/db";
import { plansTable, subscribersTable } from "@workspace/db";
import { eq, count, sql } from "drizzle-orm";
import { z } from "zod";
import { CreatePlanBody, UpdatePlanBody } from "@workspace/api-zod";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const rows = await db
      .select({
        plan: plansTable,
        subscriberCount: count(subscribersTable.id),
      })
      .from(plansTable)
      .leftJoin(subscribersTable, eq(subscribersTable.planId, plansTable.id))
      .groupBy(plansTable.id)
      .orderBy(sql`${plansTable.createdAt} ASC`);

    res.json(rows.map(({ plan, subscriberCount }) => ({
      ...plan,
      price: parseFloat(String(plan.price)),
      subscriberCount,
    })));
  } catch (err) {
    req.log.error({ err }, "Failed to list plans");
    res.status(500).json({ error: "Failed to list plans" });
  }
});

router.post("/", async (req, res) => {
  try {
    const body = CreatePlanBody.parse(req.body);
    const [plan] = await db.insert(plansTable).values({
      name: body.name,
      price: String(body.price),
      durationDays: body.durationDays,
      description: body.description,
      isActive: body.isActive ?? true,
    }).returning();
    res.status(201).json({ ...plan, price: parseFloat(String(plan.price)), subscriberCount: 0 });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.issues });
    const msg = err instanceof Error ? err.message : String(err);
    const causeMsg = err instanceof Error && err.cause instanceof Error ? err.cause.message : undefined;
    const detail = causeMsg ? `${msg} | cause: ${causeMsg}` : msg;
    req.log.error({ err }, "Failed to create plan");
    res.status(500).json({ error: "Failed to create plan", detail });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [row] = await db
      .select({ plan: plansTable, subscriberCount: count(subscribersTable.id) })
      .from(plansTable)
      .leftJoin(subscribersTable, eq(subscribersTable.planId, plansTable.id))
      .where(eq(plansTable.id, id))
      .groupBy(plansTable.id);

    if (!row) return res.status(404).json({ error: "Plan not found" });
    res.json({ ...row.plan, price: parseFloat(String(row.plan.price)), subscriberCount: row.subscriberCount });
  } catch (err) {
    req.log.error({ err }, "Failed to get plan");
    res.status(500).json({ error: "Failed to get plan" });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const body = UpdatePlanBody.parse(req.body);
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (body.name !== undefined) updateData.name = body.name;
    if (body.price !== undefined) updateData.price = String(body.price);
    if (body.durationDays !== undefined) updateData.durationDays = body.durationDays;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;

    const [updated] = await db.update(plansTable).set(updateData).where(eq(plansTable.id, id)).returning();
    if (!updated) return res.status(404).json({ error: "Plan not found" });

    const [subCount] = await db.select({ count: count() }).from(subscribersTable).where(eq(subscribersTable.planId, id));
    res.json({ ...updated, price: parseFloat(String(updated.price)), subscriberCount: subCount.count });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.issues });
    req.log.error({ err }, "Failed to update plan");
    res.status(500).json({ error: "Failed to update plan" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(plansTable).where(eq(plansTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete plan");
    res.status(500).json({ error: "Failed to delete plan" });
  }
});

export default router;
