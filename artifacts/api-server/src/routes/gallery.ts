import { Router } from "express";
import { db } from "@workspace/db";
import { galleryTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { CreateGalleryImageBody } from "@workspace/api-zod";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const items = await db.select().from(galleryTable).orderBy(galleryTable.sortOrder, sql`${galleryTable.createdAt} ASC`);
    res.json(items);
  } catch (err) {
    req.log.error({ err }, "Failed to list gallery");
    res.status(500).json({ error: "Failed to list gallery" });
  }
});

router.post("/", async (req, res) => {
  try {
    const body = CreateGalleryImageBody.parse(req.body);
    const [item] = await db.insert(galleryTable).values(body).returning();
    res.status(201).json(item);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.issues });
    req.log.error({ err }, "Failed to add gallery image");
    res.status(500).json({ error: "Failed to add gallery image" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(galleryTable).where(eq(galleryTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete gallery image");
    res.status(500).json({ error: "Failed to delete gallery image" });
  }
});

export default router;
