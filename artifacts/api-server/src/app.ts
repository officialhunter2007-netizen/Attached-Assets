import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import cookieParser from "cookie-parser";
import router from "./routes";
import { logger } from "./lib/logger";

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
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
    } else if ((_req as any).session === null) {
      res.clearCookie("session");
    }
    return originalJson(data);
  };
  next();
});

app.use("/api", router);

export default app;
