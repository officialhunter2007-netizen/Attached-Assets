import { useState } from "react";
import { Share2, Play, AlertTriangle, CheckCircle2, Database } from "lucide-react";

interface DBRow {
  id: number;
  username: string;
  email: string;
  password: string;
  role: string;
}

const USERS_DB: DBRow[] = [
  { id: 1, username: "admin", email: "admin@company.com", password: "$2b$10$xYzAbC123", role: "admin" },
  { id: 2, username: "ahmed", email: "ahmed@mail.com", password: "$2b$10$dEfGhI456", role: "user" },
  { id: 3, username: "sara", email: "sara@mail.com", password: "$2b$10$jKlMnO789", role: "user" },
  { id: 4, username: "omar", email: "omar@company.com", password: "$2b$10$pQrStU012", role: "moderator" },
  { id: 5, username: "fatima", email: "fatima@mail.com", password: "$2b$10$vWxYzA345", role: "user" },
];

interface QueryResult {
  success: boolean;
  query: string;
  rows: Partial<DBRow>[];
  message: string;
  vulnerability?: string;
  tip?: string;
}

function simulateQuery(input: string, level: number): QueryResult {
  const lower = input.toLowerCase().trim();
  const baseQuery = level === 1
    ? `SELECT * FROM users WHERE username = '${input}'`
    : level === 2
    ? `SELECT * FROM users WHERE username = '${input}' AND role = 'user'`
    : `SELECT * FROM users WHERE username = ? -- parameterized`;

  if (level === 3) {
    const found = USERS_DB.filter(u => u.username === input);
    return {
      success: true,
      query: baseQuery,
      rows: found.map(u => ({ id: u.id, username: u.username, email: u.email, role: u.role })),
      message: found.length ? `تم العثور على ${found.length} نتيجة` : "لم يتم العثور على نتائج",
      tip: "✅ هذا الاستعلام محمي بـ Parameterized Queries — حقن SQL مستحيل!",
    };
  }

  if (lower.includes("' or '1'='1") || lower.includes("' or 1=1") || lower.includes("'or'1'='1")) {
    return {
      success: true,
      query: baseQuery,
      rows: level === 2
        ? USERS_DB.filter(u => u.role === "user").map(u => ({ id: u.id, username: u.username, email: u.email, role: u.role }))
        : USERS_DB.map(u => ({ id: u.id, username: u.username, email: u.email, role: u.role })),
      message: `🔴 حقن SQL ناجح! تم كشف ${level === 2 ? "المستخدمين العاديين" : "جميع المستخدمين"}`,
      vulnerability: "تم تجاوز شرط WHERE باستخدام OR 1=1",
    };
  }

  if (lower.includes("' union select")) {
    return {
      success: true,
      query: baseQuery,
      rows: USERS_DB.map(u => ({ id: u.id, username: u.username, email: u.email, password: u.password, role: u.role })),
      message: "🔴 UNION Attack ناجح! تم كشف كلمات المرور المُشفرة",
      vulnerability: "UNION SELECT أظهرت بيانات حساسة من الجدول",
    };
  }

  if (lower.includes("'; drop table") || lower.includes("'; delete from")) {
    return {
      success: true,
      query: baseQuery + "\n-- ⚠ محاولة حذف تم حظرها في المختبر",
      rows: [],
      message: "🔴 محاولة حذف بيانات! (محظورة في المختبر)",
      vulnerability: "Statement Injection — يمكن تنفيذ أوامر SQL إضافية",
    };
  }

  if (lower.includes("'--") || lower.includes("' #")) {
    return {
      success: true,
      query: baseQuery,
      rows: USERS_DB.slice(0, 1).map(u => ({ id: u.id, username: u.username, email: u.email, role: u.role })),
      message: "🔴 تم تجاوز جزء من الاستعلام بالتعليق!",
      vulnerability: "Comment Injection — تم تجاهل باقي الشروط",
    };
  }

  const found = USERS_DB.filter(u => u.username === input);
  return {
    success: true,
    query: baseQuery,
    rows: found.map(u => ({ id: u.id, username: u.username, email: u.email, role: u.role })),
    message: found.length ? `تم العثور على ${found.length} نتيجة` : "لم يتم العثور على نتائج",
  };
}

export default function SqliLab({ onShare }: { onShare: (c: string) => void }) {
  const [level, setLevel] = useState(1);
  const [input, setInput] = useState("");
  const [result, setResult] = useState<QueryResult | null>(null);

  const hints = [
    { level: 1, hints: ["جرّب: ' OR '1'='1", "جرّب: ' UNION SELECT * FROM users--", "جرّب: '; DROP TABLE users--"] },
    { level: 2, hints: ["جرّب: ' OR '1'='1' --", "لاحظ أن الشرط AND role='user' يُقيّد النتائج", "جرّب التعليق لتجاوز الشرط: ' --"] },
    { level: 3, hints: ["هذا المستوى محمي — جرّب أي حقن وشاهد كيف يفشل", "Parameterized Queries تمنع الحقن"] },
  ];

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 space-y-4" dir="rtl">
      <div className="flex items-center gap-2">
        {[1, 2, 3].map(l => (
          <button
            key={l}
            onClick={() => { setLevel(l); setResult(null); setInput(""); }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
              level === l
                ? l === 3 ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400"
                  : "bg-red-500/15 border border-red-500/30 text-red-400"
                : "border border-white/8 text-muted-foreground hover:bg-white/5"
            }`}
          >
            {l === 1 ? "⚡ سهل — بدون حماية" : l === 2 ? "🔥 متوسط — شرط إضافي" : "🛡️ محمي — Parameterized"}
          </button>
        ))}
      </div>

      <div className={`rounded-xl p-3 border ${level === 3 ? "bg-emerald-500/5 border-emerald-500/20" : "bg-red-500/5 border-red-500/20"}`}>
        <p className="text-xs font-bold mb-1 ${level === 3 ? 'text-emerald-400' : 'text-red-400'}">
          {level === 3 ? "🛡️ الاستعلام محمي" : "⚠ الاستعلام ضعيف"}
        </p>
        <code className="text-[11px] text-muted-foreground font-mono block" dir="ltr">
          {level === 1 && "SELECT * FROM users WHERE username = '[INPUT]'"}
          {level === 2 && "SELECT * FROM users WHERE username = '[INPUT]' AND role = 'user'"}
          {level === 3 && "SELECT * FROM users WHERE username = ? -- (parameterized)"}
        </code>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="أدخل اسم المستخدم أو محاولة حقن..."
          className="flex-1 bg-black/30 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-red-500/40"
          dir="ltr"
          onKeyDown={e => e.key === "Enter" && setResult(simulateQuery(input, level))}
        />
        <button
          onClick={() => setResult(simulateQuery(input, level))}
          className="px-4 py-2.5 bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl text-sm font-bold hover:bg-red-500/30 transition-colors flex items-center gap-1.5"
        >
          <Play className="w-3.5 h-3.5" /> تنفيذ
        </button>
      </div>

      <div className="bg-black/20 border border-white/5 rounded-xl p-3">
        <p className="text-[10px] text-muted-foreground mb-1.5 font-bold">💡 تلميحات:</p>
        <div className="flex flex-wrap gap-1.5">
          {hints.find(h => h.level === level)?.hints.map((h, i) => (
            <button
              key={i}
              onClick={() => { setInput(h.replace("جرّب: ", "")); }}
              className="text-[10px] bg-white/5 border border-white/8 rounded-lg px-2 py-1 text-muted-foreground hover:text-white hover:bg-white/10 transition-colors font-mono"
              dir="ltr"
            >
              {h}
            </button>
          ))}
        </div>
      </div>

      {result && (
        <div className="space-y-3">
          <div className="bg-black/30 border border-white/5 rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold text-muted-foreground">الاستعلام المُنفَّذ:</p>
              <button
                onClick={() => onShare(`حقن SQL — المستوى ${level}\nالمدخل: ${input}\nالاستعلام: ${result.query}\nالنتيجة: ${result.message}\n${result.vulnerability ? `الثغرة: ${result.vulnerability}` : ""}`)}
                className="text-[10px] text-muted-foreground hover:text-white flex items-center gap-1"
              >
                <Share2 className="w-3 h-3" /> مشاركة
              </button>
            </div>
            <code className="text-xs text-amber-400 font-mono block" dir="ltr">{result.query}</code>
          </div>

          {result.vulnerability && (
            <div className="bg-red-500/8 border border-red-500/20 rounded-xl p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-red-400">{result.message}</p>
                <p className="text-[11px] text-muted-foreground mt-1">{result.vulnerability}</p>
              </div>
            </div>
          )}

          {result.tip && (
            <div className="bg-emerald-500/8 border border-emerald-500/20 rounded-xl p-3 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-xs text-emerald-400">{result.tip}</p>
            </div>
          )}

          {result.rows.length > 0 && (
            <div className="bg-black/20 rounded-xl border border-white/5 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/5 bg-white/3">
                    {Object.keys(result.rows[0]).map(k => (
                      <th key={k} className="px-3 py-2 text-right font-bold text-muted-foreground">{k}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((row, i) => (
                    <tr key={i} className="border-b border-white/3">
                      {Object.values(row).map((v, j) => (
                        <td key={j} className="px-3 py-2 text-white font-mono text-[11px]" dir="ltr">{String(v)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!result.vulnerability && !result.tip && (
            <p className="text-xs text-muted-foreground text-center">{result.message}</p>
          )}
        </div>
      )}
    </div>
  );
}
