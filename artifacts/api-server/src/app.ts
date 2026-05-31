import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import cookieParser from "cookie-parser";
import router from "./routes";
import { logger } from "./lib/logger";
import { signSession, verifySession } from "./lib/session";

const isProd = process.env.NODE_ENV === "production";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
// Body limit raised to 64mb: the v4 admin publish/validate endpoints accept
// full per-specialty instruction files (5 levels × 7 stages × 9 units × 10
// lessons + labs + exam banks) which serialize to tens of MB of Arabic JSON.
// At 10mb those uploads were rejected with a 413 before reaching the route.
app.use(express.json({ limit: "64mb" }));
app.use(express.urlencoded({ extended: true, limit: "64mb" }));

app.use((req: any, _res: any, next: any) => {
  const raw = (req as any).cookies?.session;
  const verified = raw ? verifySession(raw) : null;
  req.session = verified ?? {};
  (req as any).__sessionInitial = JSON.stringify(req.session);
  next();
});

app.use((_req: any, res: any, next: any) => {
  const writeSessionCookie = () => {
    const session = (_req as any).session;
    const initial = (_req as any).__sessionInitial;
    const current = session ? JSON.stringify(session) : "";
    if (current === initial) return;

    if (session === null || (session && Object.keys(session).length === 0)) {
      res.clearCookie("session", {
        path: "/",
        httpOnly: true,
        sameSite: isProd ? "none" : "lax",
        secure: isProd,
      });
      return;
    }

    if (session && Object.keys(session).length > 0) {
      const token = signSession(session);
      res.cookie("session", token, {
        httpOnly: true,
        sameSite: isProd ? "none" : "lax",
        secure: isProd,
        path: "/",
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });
    }
  };

  const originalJson = res.json.bind(res);
  res.json = function (data: unknown) {
    writeSessionCookie();
    return originalJson(data);
  };

  const originalRedirect = res.redirect.bind(res);
  res.redirect = function (...args: any[]) {
    writeSessionCookie();
    return originalRedirect(...args);
  };

  next();
});

app.use("/api", router);

export default app;
