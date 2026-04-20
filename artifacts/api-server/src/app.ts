import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import cookieParser from "cookie-parser";
import path from "node:path";
import fs from "node:fs";
import router from "./routes";
import { logger } from "./lib/logger";

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
app.use(cookieParser(process.env.SESSION_SECRET ?? "nukhba-secret"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use((req: any, _res: any, next: any) => {
  try {
    const raw = (req as any).signedCookies?.session || (req as any).cookies?.session;
    if (raw) {
      req.session = JSON.parse(Buffer.from(raw, "base64").toString("utf8"));
    } else {
      req.session = {};
    }
  } catch {
    req.session = {};
  }
  next();
});

app.use((_req: any, res: any, next: any) => {
  const originalJson = res.json.bind(res);
  res.json = function (data: unknown) {
    const session = (_req as any).session;
    if (session && Object.keys(session).length > 0) {
      const encoded = Buffer.from(JSON.stringify(session)).toString("base64");
      res.cookie("session", encoded, {
        httpOnly: true,
        signed: false,
        sameSite: isProd ? "none" : "lax",
        secure: isProd,
        path: "/",
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });
    } else if ((_req as any).session === null) {
      res.clearCookie("session");
    }
    return originalJson(data);
  };
  next();
});

app.use("/api", router);

// In production, also serve the built nukhba frontend so a single deployable
// service handles both the SPA and the API. The built assets live in
// artifacts/nukhba/dist/public (relative to the repo root). When the api-server
// runs from `node artifacts/api-server/dist/index.mjs`, process.cwd() is the
// repo root, so we resolve from there.
if (isProd) {
  const candidates = [
    path.resolve(process.cwd(), "artifacts/nukhba/dist/public"),
    path.resolve(process.cwd(), "../nukhba/dist/public"),
  ];
  const staticDir = candidates.find((p) => fs.existsSync(path.join(p, "index.html"))) ?? null;
  if (staticDir) {
    logger.info({ staticDir }, "Serving nukhba static frontend");
    app.use(express.static(staticDir, { index: false, maxAge: "1h" }));
    app.get(/^(?!\/api\/).*/, (_req: Request, res: Response, next: NextFunction) => {
      const indexFile = path.join(staticDir, "index.html");
      res.sendFile(indexFile, (err) => { if (err) next(err); });
    });
  } else {
    logger.warn({ candidates }, "nukhba dist/public not found — frontend will not be served");
  }
}

export default app;
