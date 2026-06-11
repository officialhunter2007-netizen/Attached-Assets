/**
 * code-input-area.tsx — IDE-style code input for student code submissions.
 *
 * Features:
 * - macOS traffic-light dots with subtle glow
 * - Language selector (Python, JS, HTML, CSS, SQL, Bash, plain)
 * - Live line numbers (textarea auto-grows so gutter stays in sync)
 * - Tab key inserts 4 spaces (no focus trap)
 * - Copy button with confirmation state
 * - LTR + Fira Code monospace for natural code feel
 */
import { useRef, useCallback, useState } from "react";
import { Check, Copy } from "lucide-react";

const LANGS: Array<{ id: string; label: string; placeholder: string }> = [
  { id: "python",     label: "Python 🐍",     placeholder: "# اكتب كودك هنا…\n" },
  { id: "javascript", label: "JavaScript ⚡",  placeholder: "// اكتب كودك هنا…\n" },
  { id: "html",       label: "HTML 🌐",        placeholder: "<!-- اكتب كودك هنا -->\n" },
  { id: "css",        label: "CSS 🎨",         placeholder: "/* اكتب كودك هنا */\n" },
  { id: "sql",        label: "SQL 🗄️",         placeholder: "-- اكتب استعلامك هنا\n" },
  { id: "bash",       label: "Bash 🐚",        placeholder: "# اكتب الأمر هنا\n" },
  { id: "text",       label: "نص عادي",        placeholder: "اكتب إجابتك هنا…" },
];

export function CodeInputArea({
  value,
  onChange,
  disabled = false,
  defaultLang = "python",
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  defaultLang?: string;
}) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const [lang, setLang] = useState(defaultLang);
  const [copied, setCopied] = useState(false);

  const currentLang = LANGS.find((l) => l.id === lang) ?? LANGS[0];
  const lineCount   = Math.max(7, value.split("\n").length + 1);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Tab") {
        e.preventDefault();
        const ta  = taRef.current!;
        const ss  = ta.selectionStart;
        const se  = ta.selectionEnd;
        const ind = "    ";
        onChange(value.slice(0, ss) + ind + value.slice(se));
        requestAnimationFrame(() => {
          ta.selectionStart = ta.selectionEnd = ss + ind.length;
        });
      }
    },
    [value, onChange],
  );

  const handleCopy = () => {
    if (!value) return;
    navigator.clipboard?.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div
      className="rounded-2xl overflow-hidden shadow-2xl shadow-black/60"
      style={{
        direction: "ltr",
        fontFamily: "'Fira Code', 'Cascadia Code', 'Consolas', ui-monospace, monospace",
        border: "1px solid rgba(245,158,11,0.18)",
        background: "#0d1117",
      }}
    >
      {/* ── Header bar ─────────────────────────────── */}
      <div
        className="flex items-center gap-2.5 px-4 py-2.5"
        style={{
          background: "linear-gradient(180deg,#1c2233 0%,#141a28 100%)",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        {/* Traffic-light dots */}
        <span className="flex items-center gap-1.5 shrink-0 mr-1" aria-hidden>
          <i className="block w-3 h-3 rounded-full" style={{ background:"#ff5f56", boxShadow:"0 0 8px rgba(255,95,86,0.55)" }} />
          <i className="block w-3 h-3 rounded-full" style={{ background:"#ffbd2e", boxShadow:"0 0 8px rgba(255,189,46,0.45)" }} />
          <i className="block w-3 h-3 rounded-full" style={{ background:"#27c93f", boxShadow:"0 0 8px rgba(39,201,63,0.45)" }} />
        </span>

        {/* Language selector */}
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value)}
          disabled={disabled}
          className="bg-transparent border-none outline-none text-[11px] font-bold text-amber-400 cursor-pointer tracking-wider uppercase disabled:opacity-50"
          style={{ fontFamily: "inherit" }}
        >
          {LANGS.map((l) => (
            <option
              key={l.id}
              value={l.id}
              style={{ background: "#141a28", color: "#fbbf24", fontFamily: "sans-serif" }}
            >
              {l.label}
            </option>
          ))}
        </select>

        <span className="flex-1" />

        {/* Line count badge */}
        <span
          className="text-[10px] tabular-nums mr-2 px-2 py-0.5 rounded-full"
          style={{ color:"rgba(255,255,255,0.3)", background:"rgba(255,255,255,0.05)", fontFamily:"inherit" }}
        >
          {value.split("\n").length} سطر
        </span>

        {/* Copy button */}
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all duration-200"
          style={{
            fontFamily: "Tajawal, Cairo, sans-serif",
            color:       copied ? "#6ee7b7"                   : "rgba(255,255,255,0.6)",
            borderColor: copied ? "rgba(16,185,129,0.5)"      : "rgba(255,255,255,0.13)",
            background:  copied ? "rgba(16,185,129,0.14)"     : "rgba(255,255,255,0.05)",
          }}
        >
          {copied ? <Check size={11} /> : <Copy size={11} />}
          <span style={{ direction: "rtl" }}>{copied ? "✓ تم" : "نسخ"}</span>
        </button>
      </div>

      {/* ── Editor body: gutter + textarea ─────────── */}
      <div className="flex">
        {/* Line-number gutter */}
        <div
          className="shrink-0 select-none text-right leading-[1.72] text-[12.5px] border-r"
          style={{
            padding: "14px 10px 14px 14px",
            color:        "rgba(255,255,255,0.22)",
            borderColor:  "rgba(255,255,255,0.07)",
            background:   "#0a0e18",
            minWidth:     "3rem",
            fontFamily:   "inherit",
            whiteSpace:   "pre",
            pointerEvents:"none",
          }}
          aria-hidden
        >
          {Array.from({ length: lineCount }, (_, i) => `${i + 1}\n`).join("")}
        </div>

        {/* Code textarea */}
        <textarea
          ref={taRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={currentLang.placeholder}
          rows={lineCount}
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
          dir="ltr"
          className="flex-1 resize-none bg-transparent outline-none text-[12.5px] leading-[1.72] disabled:opacity-50"
          style={{
            padding:      "14px 16px",
            color:        "#e2e8f0",
            fontFamily:   "inherit",
            caretColor:   "#fbbf24",
          }}
        />
      </div>
    </div>
  );
}

/** Heuristic: does this task text suggest the student should write code? */
export function detectCodeTask(texts: string[]): { isCode: boolean; lang: string } {
  const hay = texts.join(" ").toLowerCase();
  if (/python|بايثون/.test(hay))              return { isCode: true, lang: "python" };
  if (/javascript|js\b|جافاسكريبت/.test(hay)) return { isCode: true, lang: "javascript" };
  if (/\bhtml\b/.test(hay))                   return { isCode: true, lang: "html" };
  if (/\bcss\b/.test(hay))                    return { isCode: true, lang: "css" };
  if (/\bsql\b/.test(hay))                    return { isCode: true, lang: "sql" };
  if (/كود|code|برنامج|اكتب.*برمجة|script/.test(hay)) return { isCode: true, lang: "python" };
  return { isCode: false, lang: "text" };
}
