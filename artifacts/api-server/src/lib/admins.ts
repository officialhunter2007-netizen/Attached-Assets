function parseEmailEnv(value: string | undefined, fallback: string[]): Set<string> {
  if (!value || !value.trim()) {
    return new Set(fallback.map((e) => e.trim().toLowerCase()).filter(Boolean));
  }
  return new Set(
    value
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

const DEFAULT_ADMIN_EMAILS = ["officialhunter2007@gmail.com"];
const DEFAULT_UNLIMITED_EMAILS = ["7amr7ahmed7@gmail.com"];

const adminEmails = parseEmailEnv(process.env.ADMIN_EMAILS, DEFAULT_ADMIN_EMAILS);
const unlimitedEmails = parseEmailEnv(
  process.env.UNLIMITED_ACCESS_EMAILS,
  DEFAULT_UNLIMITED_EMAILS,
);

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmails.has(email.trim().toLowerCase());
}

export function isUnlimitedEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return unlimitedEmails.has(email.trim().toLowerCase());
}

export function getAdminEmails(): string[] {
  return Array.from(adminEmails);
}

export function getUnlimitedEmails(): string[] {
  return Array.from(unlimitedEmails);
}
