import { Router } from "express";
import { db } from "@workspace/db";
import { websiteSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { UpdateWebsiteSettingsBody } from "@workspace/api-zod";

const router = Router();

router.get("/settings", async (req, res) => {
  try {
    let [settings] = await db.select().from(websiteSettingsTable).limit(1);
    if (!settings) {
      [settings] = await db
        .insert(websiteSettingsTable)
        .values({ gymName: "FitZone Gym" })
        .returning();
    }
    res.json(settings);
  } catch (err) {
    req.log.error({ err }, "Failed to get website settings");
    res.status(500).json({ error: "Failed to get website settings" });
  }
});

router.patch("/settings", async (req, res) => {
  try {
    const body = UpdateWebsiteSettingsBody.parse(req.body);
    let [settings] = await db.select().from(websiteSettingsTable).limit(1);

    if (!settings) {
      [settings] = await db
        .insert(websiteSettingsTable)
        .values({ gymName: "FitZone Gym", ...body })
        .returning();
    } else {
      [settings] = await db
        .update(websiteSettingsTable)
        .set({ ...body, updatedAt: new Date() })
        .where(eq(websiteSettingsTable.id, settings.id))
        .returning();
    }
    res.json(settings);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.issues });
    req.log.error({ err }, "Failed to update website settings");
    res.status(500).json({ error: "Failed to update website settings" });
  }
});

export default router;
