import { Router, type IRouter } from "express";
import healthRouter from "./health";
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

const router: IRouter = Router();

router.use(healthRouter);
router.use("/dashboard", dashboardRouter);
router.use("/subscribers", subscribersRouter);
router.use("/plans", plansRouter);
router.use("/payments", paymentsRouter);
router.use("/website", websiteRouter);
router.use("/gallery", galleryRouter);
router.use("/trainers", trainersRouter);
router.use("/applications", applicationsRouter);
router.use("/notifications", notificationsRouter);
router.use("/telegram", telegramRouter);

export default router;
