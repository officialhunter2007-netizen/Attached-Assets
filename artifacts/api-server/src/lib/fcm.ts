/**
 * FCM (Firebase Cloud Messaging) — HTTP v1 API
 *
 * Sends push notifications to the admin Android app via FCM.
 * Requires environment variables:
 *   FCM_SERVICE_ACCOUNT_KEY  — JSON string of the Firebase service account key
 *   FCM_PROJECT_ID           — Firebase project ID (also in the service account JSON)
 *
 * If these are not set the function logs a warning and returns silently —
 * it must NEVER throw or crash the caller.
 */
import { GoogleAuth } from "google-auth-library";
import { logger } from "./logger";

let _auth: GoogleAuth | null = null;

function getAuth(): GoogleAuth | null {
  if (_auth) return _auth;
  const raw = process.env.FCM_SERVICE_ACCOUNT_KEY;
  if (!raw) return null;
  try {
    const credentials = JSON.parse(raw);
    _auth = new GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/firebase.messaging"],
    });
    return _auth;
  } catch (e: any) {
    logger.warn({ err: e?.message }, "[fcm] Failed to parse FCM_SERVICE_ACCOUNT_KEY");
    return null;
  }
}

export interface FcmMessage {
  title: string;
  body: string;
  /** Data payload delivered to the app — all values must be strings */
  data?: Record<string, string>;
}

/**
 * Send an FCM notification to a list of device tokens.
 * Best-effort: never throws, logs failures internally.
 */
export async function sendFcmToTokens(
  tokens: string[],
  message: FcmMessage,
): Promise<{ sent: number; failed: number }> {
  if (tokens.length === 0) return { sent: 0, failed: 0 };

  const projectId = process.env.FCM_PROJECT_ID;
  const auth = getAuth();

  if (!projectId || !auth) {
    logger.warn("[fcm] FCM_PROJECT_ID or FCM_SERVICE_ACCOUNT_KEY not configured — skipping push");
    return { sent: 0, failed: 0 };
  }

  let accessToken: string;
  try {
    const client = await auth.getClient();
    const tokenRes = await client.getAccessToken();
    accessToken = tokenRes.token ?? "";
    if (!accessToken) throw new Error("empty access token");
  } catch (e: any) {
    logger.warn({ err: e?.message }, "[fcm] Failed to obtain FCM access token");
    return { sent: 0, failed: 0 };
  }

  const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;
  let sent = 0;
  let failed = 0;

  // FCM v1 sends one message per token (no batch in the free tier v1 API)
  await Promise.allSettled(
    tokens.map(async (token) => {
      try {
        const body = JSON.stringify({
          message: {
            token,
            notification: {
              title: message.title,
              body: message.body,
            },
            ...(message.data ? { data: message.data } : {}),
            android: {
              priority: "high",
              notification: {
                sound: "default",
                channel_id: "admin_alerts",
              },
            },
          },
        });
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body,
        });
        if (res.ok) {
          sent++;
        } else {
          const text = await res.text().catch(() => "");
          // 404/410 means token is stale — log at debug, not warn
          if (res.status === 404 || res.status === 410) {
            logger.debug({ token: token.slice(0, 20), status: res.status }, "[fcm] Stale token");
          } else {
            logger.warn({ status: res.status, body: text.slice(0, 200) }, "[fcm] FCM send failed");
          }
          failed++;
        }
      } catch (e: any) {
        logger.warn({ err: e?.message }, "[fcm] Network error sending FCM");
        failed++;
      }
    }),
  );

  logger.info({ sent, failed }, "[fcm] Notification batch done");
  return { sent, failed };
}
