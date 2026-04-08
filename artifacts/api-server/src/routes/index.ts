import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import lessonsRouter from "./lessons";
import progressRouter from "./progress";
import subscriptionsRouter from "./subscriptions";
import aiRouter from "./ai";
import summariesRouter from "./summaries";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(lessonsRouter);
router.use(progressRouter);
router.use(subscriptionsRouter);
router.use(aiRouter);
router.use(summariesRouter);

export default router;
