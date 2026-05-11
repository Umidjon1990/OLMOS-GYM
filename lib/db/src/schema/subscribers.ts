import { pgTable, serial, text, integer, numeric, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { plansTable } from "./plans";

export const subscribersTable = pgTable("subscribers", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phone: text("phone").notNull().unique(),
  planId: integer("plan_id").notNull().references(() => plansTable.id),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  paymentStatus: text("payment_status").notNull().default("pending"),
  status: text("status").notNull().default("active"),
  telegramChatId: text("telegram_chat_id"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertSubscriberSchema = createInsertSchema(subscribersTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSubscriber = z.infer<typeof insertSubscriberSchema>;
export type Subscriber = typeof subscribersTable.$inferSelect;
