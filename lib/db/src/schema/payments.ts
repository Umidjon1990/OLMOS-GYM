import { pgTable, serial, integer, numeric, text, boolean, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { subscribersTable } from "./subscribers";
import { plansTable } from "./plans";

export const paymentsTable = pgTable("payments", {
  id: serial("id").primaryKey(),
  subscriberId: integer("subscriber_id").notNull().references(() => subscribersTable.id),
  planId: integer("plan_id").notNull().references(() => plansTable.id),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  paymentDate: date("payment_date").notNull(),
  status: text("status").notNull().default("pending"),
  extendSubscription: boolean("extend_subscription").notNull().default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertPaymentSchema = createInsertSchema(paymentsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof paymentsTable.$inferSelect;
