import { Router } from "express";
import { db } from "@workspace/db";
import { trainersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { CreateTrainerBody, UpdateTrainerBody } from "@workspace/api-zod";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const items = await db.select().from(trainersTable).orderBy(sql`${trainersTable.createdAt} ASC`);
    res.json(items);
  } catch (err) {
    req.log.error({ err }, "Failed to list trainers");
    res.status(500).json({ error: "Failed to list trainers" });
  }
});

router.post("/", async (req, res) => {
  try {
    const body = CreateTrainerBody.parse(req.body);
    const [trainer] = await db.insert(trainersTable).values({ ...body, isActive: body.isActive ?? true }).returning();
    res.status(201).json(trainer);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.issues });
    req.log.error({ err }, "Failed to create trainer");
    res.status(500).json({ error: "Failed to create trainer" });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const body = UpdateTrainerBody.parse(req.body);
    const [updated] = await db.update(trainersTable).set({ ...body, updatedAt: new Date() }).where(eq(trainersTable.id, id)).returning();
    if (!updated) return res.status(404).json({ error: "Trainer not found" });
    res.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.issues });
    req.log.error({ err }, "Failed to update trainer");
    res.status(500).json({ error: "Failed to update trainer" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(trainersTable).where(eq(trainersTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete trainer");
    res.status(500).json({ error: "Failed to delete trainer" });
  }
});

export default router;
