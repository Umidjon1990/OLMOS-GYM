import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import dashboardRouter from "./dashboard";
import subscribersRouter from "./subscribers";
import plansRouter from "./plans";
import paymentsRouter from "./payments";
import websiteRouter from "./website";
import galleryRouter from "./gallery";
import trainersRouter from "./trainers";
import applicationsRouter from "./applications";
import notificationsRouter from "./notifications";
import telegramRouter from "./telegram";
import { requireAuth, allowMethods } from "../middlewares/requireAuth";

const router: IRouter = Router();

// Public
router.use(healthRouter);
router.use("/auth", authRouter);

// Mixed: public reads / content for the landing page, protected writes
router.use("/plans", allowMethods("GET"), plansRouter);
router.use("/website", allowMethods("GET"), websiteRouter);
router.use("/trainers", allowMethods("GET"), trainersRouter);
router.use("/gallery", allowMethods("GET"), galleryRouter);
router.use("/applications", allowMethods("POST"), applicationsRouter);

// Admin-only
router.use("/dashboard", requireAuth, dashboardRouter);
router.use("/subscribers", requireAuth, subscribersRouter);
router.use("/payments", requireAuth, paymentsRouter);
router.use("/notifications", requireAuth, notificationsRouter);
router.use("/telegram", requireAuth, telegramRouter);

export default router;
