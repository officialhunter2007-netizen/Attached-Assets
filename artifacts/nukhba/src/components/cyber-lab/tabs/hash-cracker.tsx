import { useState } from "react";
import { Share2, Play, Loader2, CheckCircle2, XCircle } from "lucide-react";

async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function md5sim(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-1", data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

const COMMON_PASSWORDS = [
  "password", "123456", "12345678", "qwerty", "abc123",
  "monkey", "1234567", "letmein", "trustno1", "dragon",
  "baseball", "iloveyou", "master", "sunshine", "ashley",
  "michael", "shadow", "123123", "654321", "superman",
  "princess", "football", "charlie", "passw0rd", "hello",
  "admin", "welcome", "login", "starwars", "solo",
  "admin123", "root", "toor", "test", "password1",
];

interface CrackResult {
  found: boolean;
  password?: string;
  attempts: number;
  time: number;
}

export default function HashCracker({ onShare }: { onShare: (c: string) => void }) {
  const [mode, setMode] = useState<"generate" | "crack">("generate");
  const [genInput, setGenInput] = useState("password123");
  const [genAlgo, setGenAlgo] = useState<"sha256" | "md5">("sha256");
  const [genResult, setGenResult] = useState("");
  const [crackInput, setCrackInput] = useState("");
  const [crackAlgo, setCrackAlgo] = useState<"sha256" | "md5">("sha256");
  const [cracking, setCracking] = useState(false);
  const [crackResult, setCrackResult] = useState<CrackResult | null>(null);
  const [crackLog, setCrackLog] = useState<string[]>([]);

  const generateHash = async () => {
    const hash = genAlgo === "sha256" ? await sha256(genInput) : await md5sim(genInput);
    setGenResult(hash);
  };

  const crackHash = async () => {
    setCracking(true);
    setCrackResult(null);
    setCrackLog([]);
    const target = crackInput.trim().toLowerCase();
    const start = performance.now();
    let attempts = 0;

    for (const pw of COMMON_PASSWORDS) {
      attempts++;
      const hash = crackAlgo === "sha256" ? await sha256(pw) : await md5sim(pw);
      setCrackLog(prev => [...prev.slice(-15), `محاولة ${attempts}: ${pw} → ${hash.slice(0, 16)}...`]);
      await new Promise(r => setTimeout(r, 80));

      if (hash === target) {
        const time = performance.now() - start;
        setCrackResult({ found: true, password: pw, attempts, time });
        setCracking(false);
        return;
      }
    }

    const time = performance.now() - start;
    setCrackResult({ found: false, attempts, time });
    setCracking(false);
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 space-y-4" dir="rtl">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setMode("generate")}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
            mode === "generate" ? "bg-orange-500/15 border border-orange-500/30 text-orange-400" : "border border-white/8 text-muted-foreground"
          }`}
        >
          🔐 توليد الهاش
        </button>
        <button
          onClick={() => setMode("crack")}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
            mode === "crack" ? "bg-red-500/15 border border-red-500/30 text-red-400" : "border border-white/8 text-muted-foreground"
          }`}
        >
          🔓 كسر الهاش
        </button>
      </div>

      {mode === "generate" ? (
        <div className="space-y-4">
          <div className="bg-orange-500/5 border border-orange-500/15 rounded-xl p-3">
            <p className="text-xs font-bold text-orange-400">توليد Hash من نص</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">أدخل أي نص لرؤية الـ Hash الناتج — لاحظ كيف أي تغيير بسيط يُنتج hash مختلف تماماً</p>
          </div>

          <div className="flex gap-2">
            <select
              value={genAlgo}
              onChange={e => setGenAlgo(e.target.value as any)}
              className="bg-black/30 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none"
            >
              <option value="sha256">SHA-256</option>
              <option value="md5">MD5 (محاكاة)</option>
            </select>
            <input
              type="text"
              value={genInput}
              onChange={e => setGenInput(e.target.value)}
              placeholder="أدخل نصاً..."
              className="flex-1 bg-black/30 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-orange-500/40"
              dir="ltr"
              onKeyDown={e => e.key === "Enter" && generateHash()}
            />
            <button
              onClick={generateHash}
              className="px-4 py-2.5 bg-orange-500/20 border border-orange-500/30 text-orange-400 rounded-xl text-sm font-bold"
            >
              توليد
            </button>
          </div>

          {genResult && (
            <div className="space-y-2">
              <div className="bg-black/40 border border-white/10 rounded-xl p-3">
                <p className="text-[10px] text-muted-foreground mb-1">{genAlgo.toUpperCase()} Hash:</p>
                <p className="text-xs text-emerald-400 font-mono break-all" dir="ltr">{genResult}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setCrackInput(genResult); setMode("crack"); setCrackAlgo(genAlgo); }}
                  className="text-[11px] text-orange-400 hover:text-orange-300 transition-colors"
                >
                  → جرّب كسر هذا الهاش
                </button>
                <button
                  onClick={() => navigator.clipboard?.writeText(genResult)}
                  className="text-[11px] text-muted-foreground hover:text-white transition-colors"
                >
                  نسخ
                </button>
              </div>
            </div>
          )}

          <div className="bg-black/20 border border-white/5 rounded-xl p-3">
            <p className="text-[10px] font-bold text-muted-foreground mb-2">💡 جرّب وقارن:</p>
            <div className="flex flex-wrap gap-1.5">
              {["password", "Password", "password1", "P@ssw0rd!", "أمن سيبراني"].map(w => (
                <button
                  key={w}
                  onClick={() => { setGenInput(w); }}
                  className="text-[10px] bg-white/5 border border-white/8 rounded-lg px-2 py-1 text-muted-foreground hover:text-white font-mono"
                  dir="ltr"
                >
                  {w}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-red-500/5 border border-red-500/15 rounded-xl p-3">
            <p className="text-xs font-bold text-red-400">كسر الهاش بـ Dictionary Attack</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">يقارن الهاش مع قائمة من {COMMON_PASSWORDS.length} كلمة مرور شائعة</p>
          </div>

          <div className="flex gap-2">
            <select
              value={crackAlgo}
              onChange={e => setCrackAlgo(e.target.value as any)}
              className="bg-black/30 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none"
            >
              <option value="sha256">SHA-256</option>
              <option value="md5">MD5</option>
            </select>
            <input
              type="text"
              value={crackInput}
              onChange={e => setCrackInput(e.target.value)}
              placeholder="الصق الهاش هنا..."
              className="flex-1 bg-black/30 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white font-mono text-[11px] focus:outline-none focus:border-red-500/40"
              dir="ltr"
            />
            <button
              onClick={crackHash}
              disabled={cracking || !crackInput.trim()}
              className="px-4 py-2.5 bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl text-sm font-bold disabled:opacity-50 flex items-center gap-1.5"
            >
              {cracking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              {cracking ? "جاري..." : "كسر"}
            </button>
          </div>

          {(cracking || crackLog.length > 0) && (
            <div className="bg-black/40 border border-white/5 rounded-xl p-3 max-h-[200px] overflow-y-auto font-mono text-[10px]" dir="ltr">
              {crackLog.map((l, i) => (
                <div key={i} className="text-muted-foreground/60">{l}</div>
              ))}
              {cracking && <div className="text-amber-400 animate-pulse">جاري البحث...</div>}
            </div>
          )}

          {crackResult && (
            <div className={`rounded-xl p-4 border flex items-start gap-3 ${crackResult.found ? "bg-red-500/8 border-red-500/20" : "bg-emerald-500/8 border-emerald-500/20"}`}>
              {crackResult.found ? <XCircle className="w-5 h-5 text-red-400 shrink-0" /> : <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
              <div className="flex-1">
                {crackResult.found ? (
                  <>
                    <p className="text-sm font-bold text-red-400">🔓 تم كسر كلمة المرور!</p>
                    <p className="text-lg font-mono font-bold text-white mt-1" dir="ltr">{crackResult.password}</p>
                    <p className="text-[11px] text-muted-foreground mt-2">تم الكسر بعد {crackResult.attempts} محاولة في {(crackResult.time / 1000).toFixed(1)}ث</p>
                    <p className="text-[11px] text-red-400/70 mt-1">⚠ هذه كلمة مرور شائعة وضعيفة — لا تستخدمها!</p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-bold text-emerald-400">✅ لم يتم كسر كلمة المرور</p>
                    <p className="text-[11px] text-muted-foreground mt-1">{crackResult.attempts} محاولة في {(crackResult.time / 1000).toFixed(1)}ث — كلمة المرور ليست في القاموس</p>
                  </>
                )}
                <button
                  onClick={() => onShare(`كسر الهاش\nالخوارزمية: ${crackAlgo.toUpperCase()}\nالنتيجة: ${crackResult.found ? `تم الكسر → ${crackResult.password}` : "لم يتم الكسر"}\nالمحاولات: ${crackResult.attempts}\nالوقت: ${(crackResult.time / 1000).toFixed(1)}ث`)}
                  className="text-[10px] text-muted-foreground hover:text-white flex items-center gap-1 mt-2"
                >
                  <Share2 className="w-3 h-3" /> مشاركة النتيجة
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
