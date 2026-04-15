import { useState, useRef, useEffect } from "react";
import { Share2, Play, AlertTriangle, CheckCircle2, Shield } from "lucide-react";

interface XSSResult {
  rendered: string;
  vulnerable: boolean;
  attackType?: string;
  explanation?: string;
}

function checkXSS(input: string, level: number): XSSResult {
  const lower = input.toLowerCase();

  if (level === 3) {
    const sanitized = input.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    return {
      rendered: `<div style="padding:8px;background:#1a1b26;border-radius:8px;color:#a0a0a0;font-size:13px;">مرحباً، <strong style="color:white">${sanitized}</strong></div>`,
      vulnerable: false,
      explanation: "تم ترميز الأحرف الخاصة — XSS مستحيل مع Output Encoding",
    };
  }

  if (lower.includes("<script") || lower.includes("javascript:") || lower.includes("onerror") || lower.includes("onload") || lower.includes("onclick") || lower.includes("<img") || lower.includes("<svg")) {
    let attackType = "Stored XSS";
    if (lower.includes("<script")) attackType = "Script Injection";
    else if (lower.includes("onerror") || lower.includes("onload")) attackType = "Event Handler XSS";
    else if (lower.includes("<img") || lower.includes("<svg")) attackType = "HTML Tag Injection";

    if (level === 2 && lower.includes("<script")) {
      const filtered = input.replace(/<script[^>]*>.*?<\/script>/gi, "[BLOCKED]");
      return {
        rendered: `<div style="padding:8px;background:#1a1b26;border-radius:8px;color:#a0a0a0;font-size:13px;">مرحباً، <strong style="color:white">${filtered}</strong></div>`,
        vulnerable: !lower.includes("onerror") && !lower.includes("onload") && !lower.includes("<img"),
        attackType: lower.includes("onerror") || lower.includes("onload") || lower.includes("<img") ? attackType : undefined,
        explanation: lower.includes("onerror") || lower.includes("onload") || lower.includes("<img")
          ? "فلتر script تم تجاوزه! يمكن استخدام Event Handlers بدلاً من script tags"
          : "تم حظر وسم <script> — لكن جرّب طرق أخرى مثل <img onerror>",
      };
    }

    return {
      rendered: `<div style="padding:8px;background:#1a1b26;border-radius:8px;color:#a0a0a0;font-size:13px;">مرحباً، <strong style="color:white">${input}</strong><br/><span style="color:#ef4444;font-size:11px;">⚠ تم تنفيذ كود خبيث!</span></div>`,
      vulnerable: true,
      attackType,
      explanation: `تم حقن ${attackType} بنجاح — المدخلات لم تُفلتر`,
    };
  }

  const rendered = level === 1
    ? `<div style="padding:8px;background:#1a1b26;border-radius:8px;color:#a0a0a0;font-size:13px;">مرحباً، <strong style="color:white">${input}</strong></div>`
    : `<div style="padding:8px;background:#1a1b26;border-radius:8px;color:#a0a0a0;font-size:13px;">مرحباً، <strong style="color:white">${input}</strong></div>`;

  return { rendered, vulnerable: false };
}

export default function XssLab({ onShare }: { onShare: (c: string) => void }) {
  const [level, setLevel] = useState(1);
  const [input, setInput] = useState("");
  const [result, setResult] = useState<XSSResult | null>(null);

  const hints = [
    { level: 1, hints: ['<script>alert("XSS")</script>', '<img src=x onerror="alert(1)">', '<svg onload="alert(1)">'] },
    { level: 2, hints: ['<script>alert(1)</script> (محظور)', '<img src=x onerror="alert(1)">', '<svg/onload=alert(1)>'] },
    { level: 3, hints: ['<script>alert(1)</script>', '<img src=x onerror=alert(1)>', "كل المحاولات ستفشل ✅"] },
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
                  : "bg-amber-500/15 border border-amber-500/30 text-amber-400"
                : "border border-white/8 text-muted-foreground hover:bg-white/5"
            }`}
          >
            {l === 1 ? "⚡ بدون فلترة" : l === 2 ? "🔥 فلتر جزئي" : "🛡️ محمي بالكامل"}
          </button>
        ))}
      </div>

      <div className={`rounded-xl p-3 border ${level === 3 ? "bg-emerald-500/5 border-emerald-500/20" : "bg-amber-500/5 border-amber-500/20"}`}>
        <p className="text-xs font-bold">
          {level === 1 && "⚠ التطبيق يعرض المدخلات مباشرة بدون أي فلترة"}
          {level === 2 && "⚠ التطبيق يفلتر وسم <script> فقط — لكن هل هذا كافٍ؟"}
          {level === 3 && "✅ التطبيق يستخدم Output Encoding لحماية المخرجات"}
        </p>
        <code className="text-[11px] text-muted-foreground font-mono block mt-1" dir="ltr">
          {level === 1 && 'innerHTML = "مرحباً، " + userInput'}
          {level === 2 && 'filtered = userInput.replace(/<script>/gi, ""); innerHTML = "مرحباً، " + filtered'}
          {level === 3 && 'encoded = escapeHTML(userInput); textContent = "مرحباً، " + encoded'}
        </code>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder='أدخل اسمك أو محاولة XSS...'
          className="flex-1 bg-black/30 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-amber-500/40"
          dir="ltr"
          onKeyDown={e => e.key === "Enter" && setResult(checkXSS(input, level))}
        />
        <button
          onClick={() => setResult(checkXSS(input, level))}
          className="px-4 py-2.5 bg-amber-500/20 border border-amber-500/30 text-amber-400 rounded-xl text-sm font-bold hover:bg-amber-500/30 transition-colors flex items-center gap-1.5"
        >
          <Play className="w-3.5 h-3.5" /> إرسال
        </button>
      </div>

      <div className="bg-black/20 border border-white/5 rounded-xl p-3">
        <p className="text-[10px] text-muted-foreground mb-1.5 font-bold">💡 جرّب هذه الحمولات:</p>
        <div className="flex flex-wrap gap-1.5">
          {hints.find(h => h.level === level)?.hints.map((h, i) => (
            <button
              key={i}
              onClick={() => setInput(h)}
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
              <p className="text-[10px] font-bold text-muted-foreground">معاينة الصفحة:</p>
              <button
                onClick={() => onShare(`هجوم XSS — المستوى ${level}\nالمدخل: ${input}\n${result.vulnerable ? `🔴 ثغرة: ${result.attackType}\n${result.explanation}` : "✅ محمي"}`)}
                className="text-[10px] text-muted-foreground hover:text-white flex items-center gap-1"
              >
                <Share2 className="w-3 h-3" /> مشاركة
              </button>
            </div>
            <div
              className="bg-[#0d1117] rounded-lg p-3 border border-white/5"
              dangerouslySetInnerHTML={{ __html: result.rendered.replace(/<script[\s\S]*?<\/script>/gi, '<span style="color:#ef4444">[SCRIPT EXECUTED]</span>') }}
            />
          </div>

          {result.vulnerable && result.explanation && (
            <div className="bg-red-500/8 border border-red-500/20 rounded-xl p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-red-400">🔴 {result.attackType}</p>
                <p className="text-[11px] text-muted-foreground mt-1">{result.explanation}</p>
              </div>
            </div>
          )}

          {result.explanation && !result.vulnerable && (
            <div className="bg-emerald-500/8 border border-emerald-500/20 rounded-xl p-3 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-xs text-emerald-400">{result.explanation}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
