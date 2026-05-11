import { Router } from "express";
import { db } from "@workspace/db";
import { notificationsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { ListNotificationsQueryParams } from "@workspace/api-zod";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const query = ListNotificationsQueryParams.parse(req.query);
    const items = await db
      .select()
      .from(notificationsTable)
      .where(query.unreadOnly ? eq(notificationsTable.isRead, false) : undefined)
      .orderBy(sql`${notificationsTable.createdAt} DESC`)
      .limit(50);
    res.json(items);
  } catch (err) {
    req.log.error({ err }, "Failed to list notifications");
    res.status(500).json({ error: "Failed to list notifications" });
  }
});

router.post("/:id/read", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [updated] = await db
      .update(notificationsTable)
      .set({ isRead: true })
      .where(eq(notificationsTable.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Notification not found" });
    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to mark notification as read");
    res.status(500).json({ error: "Failed to mark notification as read" });
  }
});

export default router;
