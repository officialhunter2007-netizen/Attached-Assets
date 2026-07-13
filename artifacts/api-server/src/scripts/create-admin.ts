#!/usr/bin/env tsx
import { db, usersTable } from "@workspace/db";
import { hashPassword } from "../lib/auth";
import { eq } from "drizzle-orm";

async function main() {
  const email = "officialhunter2007@gmail.com";
  const password = "11111111";

  const [existing] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, email));
  if (existing) {
    // Update password and ensure admin role
    await db.update(usersTable).set({
      passwordHash: hashPassword(password),
      role: "admin",
    }).where(eq(usersTable.id, existing.id));
    console.log("✅ تم تحديث كلمة المرور ودور الأدمن للمستخدم:", email);
    process.exit(0);
  }

  const [user] = await db.insert(usersTable).values({
    email,
    passwordHash: hashPassword(password),
    displayName: "المدير",
    role: "admin",
    onboardingDone: true,
    points: 0,
    streakDays: 0,
    badges: [],
  }).returning({ id: usersTable.id, email: usersTable.email, role: usersTable.role });

  console.log("✅ تم إنشاء حساب الأدمن:");
  console.log("   البريد:", user.email);
  console.log("   الدور:", user.role);
  console.log("   المعرف:", user.id);
  process.exit(0);
}

main().catch(e => { console.error("❌", e?.message); process.exit(1); });
