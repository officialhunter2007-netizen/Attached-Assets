/**
 * Expo Push Notifications — HTTP API
 *
 * يرسل إشعارات لتطبيقات الطالب والأدمن المبنية بـ Expo
 * عبر Expo Push Service (لا يحتاج Firebase أو VAPID).
 *
 * التوكنات بصيغة: ExponentPushToken[xxxxxx]
 * لا يحتاج API key للاستخدام الأساسي.
 *
 * الوثائق: https://docs.expo.dev/push-notifications/sending-notifications/
 */

import { logger } from "./logger";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const BATCH_SIZE    = 100; // الحد الأقصى لكل طلب

export interface ExpoPushMessage {
  title:    string;
  body:     string;
  /** بيانات إضافية تصل للتطبيق عند النقر على الإشعار */
  data?:    Record<string, string>;
  /** رابط يُفتح في WebView عند النقر */
  url?:     string;
  sound?:   "default" | null;
  badge?:   number;
  /** لون خلفية الأيقونة في Android */
  color?:   string;
  /** الأولوية — high يُنبّه فوراً */
  priority?: "default" | "normal" | "high";
  /** قناة Android */
  channelId?: string;
  /** صورة مصغّرة تظهر في الإشعار (رابط عام) */
  imageUrl?: string;
}

export interface ExpoPushResult {
  sent:   number;
  failed: number;
  errors: string[];
}

/**
 * تحقق إذا كان التوكن بصيغة Expo صحيحة
 */
export function isValidExpoToken(token: string): boolean {
  return token.startsWith("ExponentPushToken[") && token.endsWith("]");
}

/**
 * أرسل إشعارات Expo لمجموعة من التوكنات.
 * best-effort — لا يرمي استثناء أبداً.
 */
export async function sendExpoPushToTokens(
  tokens: string[],
  message: ExpoPushMessage,
): Promise<ExpoPushResult> {
  const valid = tokens.filter(isValidExpoToken);
  if (valid.length === 0) return { sent: 0, failed: tokens.length, errors: [] };

  const result: ExpoPushResult = { sent: 0, failed: 0, errors: [] };
  const data = message.url
    ? { ...(message.data ?? {}), url: message.url }
    : (message.data ?? {});

  // أرسل على دفعات
  for (let i = 0; i < valid.length; i += BATCH_SIZE) {
    const batch = valid.slice(i, i + BATCH_SIZE).map((to) => ({
      to,
      title:     message.title,
      body:      message.body,
      data,
      sound:     message.sound ?? "default",
      priority:  message.priority  ?? "high",
      channelId: message.channelId ?? "nukhba",
      color:     message.color     ?? "#F59E0B",
      ...(message.badge    !== undefined ? { badge:    message.badge    } : {}),
      ...(message.imageUrl !== undefined ? { imageUrl: message.imageUrl } : {}),
    }));

    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method:  "POST",
        headers: {
          "Content-Type": "application/json",
          Accept:         "application/json",
        },
        body: JSON.stringify(batch),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        result.failed += batch.length;
        result.errors.push(`HTTP ${res.status}: ${text.slice(0, 200)}`);
        logger.warn({ status: res.status, body: text.slice(0, 200) }, "[expo-push] batch failed");
        continue;
      }

      const json = (await res.json()) as { data?: { status: string; message?: string }[] };
      const rows = json?.data ?? [];

      for (const row of rows) {
        if (row.status === "ok") result.sent++;
        else {
          result.failed++;
          if (row.message) result.errors.push(row.message);
        }
      }

      // إذا لم يعد Expo بصفوف (غير متوقع) نعتبر الدفعة ناجحة
      if (rows.length === 0) result.sent += batch.length;

    } catch (e: any) {
      result.failed += batch.length;
      result.errors.push(e?.message ?? "network error");
      logger.warn({ err: e?.message }, "[expo-push] network error");
    }
  }

  logger.info({ sent: result.sent, failed: result.failed }, "[expo-push] batch done");
  return result;
}
