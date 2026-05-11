import { pgTable, serial, text, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const websiteSettingsTable = pgTable("website_settings", {
  id: serial("id").primaryKey(),
  gymName: text("gym_name").notNull().default("My Gym"),
  tagline: text("tagline"),
  description: text("description"),
  logoUrl: text("logo_url"),
  bannerUrl: text("banner_url"),
  phone: text("phone"),
  address: text("address"),
  workingHours: text("working_hours"),
  instagramUrl: text("instagram_url"),
  telegramUrl: text("telegram_url"),
  facebookUrl: text("facebook_url"),
  isActive: boolean("is_active").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const galleryTable = pgTable("gallery", {
  id: serial("id").primaryKey(),
  imageUrl: text("image_url").notNull(),
  caption: text("caption"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const trainersTable = pgTable("trainers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  specialty: text("specialty"),
  bio: text("bio"),
  photoUrl: text("photo_url"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertWebsiteSettingsSchema = createInsertSchema(websiteSettingsTable).omit({ id: true, updatedAt: true });
export const insertGallerySchema = createInsertSchema(galleryTable).omit({ id: true, createdAt: true });
export const insertTrainerSchema = createInsertSchema(trainersTable).omit({ id: true, createdAt: true, updatedAt: true });

export type InsertWebsiteSettings = z.infer<typeof insertWebsiteSettingsSchema>;
export type WebsiteSettings = typeof websiteSettingsTable.$inferSelect;
export type InsertGallery = z.infer<typeof insertGallerySchema>;
export type Gallery = typeof galleryTable.$inferSelect;
export type InsertTrainer = z.infer<typeof insertTrainerSchema>;
export type Trainer = typeof trainersTable.$inferSelect;
