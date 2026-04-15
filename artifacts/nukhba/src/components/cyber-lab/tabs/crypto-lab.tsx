import { useState } from "react";
import { Share2, ArrowLeftRight, Lock, Unlock } from "lucide-react";

type Algo = "caesar" | "vigenere" | "base64" | "rot13" | "xor" | "atbash";

function caesarEncrypt(text: string, shift: number): string {
  return text.split("").map(ch => {
    if (ch >= "a" && ch <= "z") return String.fromCharCode(((ch.charCodeAt(0) - 97 + shift) % 26 + 26) % 26 + 97);
    if (ch >= "A" && ch <= "Z") return String.fromCharCode(((ch.charCodeAt(0) - 65 + shift) % 26 + 26) % 26 + 65);
    return ch;
  }).join("");
}

function vigenereEncrypt(text: string, key: string): string {
  if (!key) return text;
  const k = key.toLowerCase();
  let ki = 0;
  return text.split("").map(ch => {
    if (ch >= "a" && ch <= "z") { const s = k.charCodeAt(ki++ % k.length) - 97; return String.fromCharCode(((ch.charCodeAt(0) - 97 + s) % 26) + 97); }
    if (ch >= "A" && ch <= "Z") { const s = k.charCodeAt(ki++ % k.length) - 97; return String.fromCharCode(((ch.charCodeAt(0) - 65 + s) % 26) + 65); }
    return ch;
  }).join("");
}

function vigenereDecrypt(text: string, key: string): string {
  if (!key) return text;
  const k = key.toLowerCase();
  let ki = 0;
  return text.split("").map(ch => {
    if (ch >= "a" && ch <= "z") { const s = k.charCodeAt(ki++ % k.length) - 97; return String.fromCharCode(((ch.charCodeAt(0) - 97 - s + 26) % 26) + 97); }
    if (ch >= "A" && ch <= "Z") { const s = k.charCodeAt(ki++ % k.length) - 97; return String.fromCharCode(((ch.charCodeAt(0) - 65 - s + 26) % 26) + 65); }
    return ch;
  }).join("");
}

function xorEncrypt(text: string, key: string): string {
  if (!key) return text;
  return text.split("").map((ch, i) => {
    const x = ch.charCodeAt(0) ^ key.charCodeAt(i % key.length);
    return x.toString(16).padStart(2, "0");
  }).join(" ");
}

function xorDecrypt(hex: string, key: string): string {
  if (!key) return hex;
  return hex.split(" ").map((h, i) => {
    const x = parseInt(h, 16) ^ key.charCodeAt(i % key.length);
    return String.fromCharCode(x);
  }).join("");
}

function atbash(text: string): string {
  return text.split("").map(ch => {
    if (ch >= "a" && ch <= "z") return String.fromCharCode(122 - (ch.charCodeAt(0) - 97));
    if (ch >= "A" && ch <= "Z") return String.fromCharCode(90 - (ch.charCodeAt(0) - 65));
    return ch;
  }).join("");
}

const ALGOS: { id: Algo; name: string; desc: string; needsKey: boolean; keyLabel?: string }[] = [
  { id: "caesar", name: "شيفرة قيصر", desc: "إزاحة كل حرف بعدد ثابت", needsKey: true, keyLabel: "مقدار الإزاحة (1-25)" },
  { id: "vigenere", name: "شيفرة فيجنر", desc: "تشفير بكلمة مفتاح متكررة", needsKey: true, keyLabel: "كلمة المفتاح" },
  { id: "base64", name: "Base64", desc: "ترميز ثنائي للنصوص", needsKey: false },
  { id: "rot13", name: "ROT13", desc: "إزاحة 13 حرفاً (تشفير وفك بنفس العملية)", needsKey: false },
  { id: "xor", name: "XOR", desc: "تشفير بعملية XOR مع مفتاح", needsKey: true, keyLabel: "مفتاح XOR" },
  { id: "atbash", name: "شيفرة أتباش", desc: "عكس الأبجدية (A↔Z, B↔Y)", needsKey: false },
];

export default function CryptoLab({ onShare }: { onShare: (c: string) => void }) {
  const [algo, setAlgo] = useState<Algo>("caesar");
  const [input, setInput] = useState("Hello World - Cyber Security");
  const [key, setKey] = useState("3");
  const [mode, setMode] = useState<"encrypt" | "decrypt">("encrypt");

  const algoInfo = ALGOS.find(a => a.id === algo)!;

  const compute = (): string => {
    try {
      switch (algo) {
        case "caesar": {
          const shift = parseInt(key) || 0;
          return mode === "encrypt" ? caesarEncrypt(input, shift) : caesarEncrypt(input, -shift);
        }
        case "vigenere":
          return mode === "encrypt" ? vigenereEncrypt(input, key) : vigenereDecrypt(input, key);
        case "base64":
          return mode === "encrypt" ? btoa(unescape(encodeURIComponent(input))) : decodeURIComponent(escape(atob(input)));
        case "rot13":
          return caesarEncrypt(input, 13);
        case "xor":
          return mode === "encrypt" ? xorEncrypt(input, key) : xorDecrypt(input, key);
        case "atbash":
          return atbash(input);
        default: return "";
      }
    } catch {
      return "⚠ خطأ في المعالجة — تحقق من المدخلات";
    }
  };

  const result = compute();

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 space-y-4" dir="rtl">
      <div className="flex flex-wrap gap-2">
        {ALGOS.map(a => (
          <button
            key={a.id}
            onClick={() => { setAlgo(a.id); if (a.id === "caesar") setKey("3"); else if (a.id === "xor" || a.id === "vigenere") setKey("key"); else setKey(""); }}
            className={`text-xs font-bold px-3 py-2 rounded-xl border transition-all ${
              algo === a.id ? "bg-purple-500/15 border-purple-500/30 text-purple-400" : "border-white/8 text-muted-foreground hover:bg-white/5"
            }`}
          >
            {a.name}
          </button>
        ))}
      </div>

      <div className="bg-purple-500/5 border border-purple-500/15 rounded-xl p-3">
        <p className="text-xs font-bold text-purple-400">{algoInfo.name}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">{algoInfo.desc}</p>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setMode("encrypt")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold transition-all ${
            mode === "encrypt" ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400" : "border border-white/8 text-muted-foreground"
          }`}
        >
          <Lock className="w-3.5 h-3.5" /> تشفير
        </button>
        <button
          onClick={() => setMode("decrypt")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold transition-all ${
            mode === "decrypt" ? "bg-amber-500/15 border border-amber-500/30 text-amber-400" : "border border-white/8 text-muted-foreground"
          }`}
        >
          <Unlock className="w-3.5 h-3.5" /> فك التشفير
        </button>
      </div>

      {algoInfo.needsKey && (
        <div>
          <label className="text-xs font-bold text-muted-foreground mb-1.5 block">{algoInfo.keyLabel}</label>
          <input
            type={algo === "caesar" ? "number" : "text"}
            value={key}
            onChange={e => setKey(e.target.value)}
            min={algo === "caesar" ? 1 : undefined}
            max={algo === "caesar" ? 25 : undefined}
            className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-purple-500/40"
            dir="ltr"
          />
        </div>
      )}

      <div>
        <label className="text-xs font-bold text-muted-foreground mb-1.5 block">النص المُدخل</label>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          rows={3}
          className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-purple-500/40 resize-none"
          dir="ltr"
        />
      </div>

      <div className="flex items-center justify-center">
        <ArrowLeftRight className="w-5 h-5 text-purple-400/50" />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-bold text-muted-foreground">النتيجة</label>
          <button
            onClick={() => onShare(`${algoInfo.name} (${mode === "encrypt" ? "تشفير" : "فك"})\nالمدخل: ${input}\n${algoInfo.needsKey ? `المفتاح: ${key}\n` : ""}النتيجة: ${result}`)}
            className="text-[10px] text-muted-foreground hover:text-white flex items-center gap-1"
          >
            <Share2 className="w-3 h-3" /> مشاركة
          </button>
        </div>
        <div className="bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 min-h-[60px]">
          <p className="text-sm text-emerald-400 font-mono break-all" dir="ltr">{result}</p>
        </div>
      </div>

      <button
        onClick={() => { setInput(result); }}
        className="text-xs text-center text-purple-400/60 hover:text-purple-400 transition-colors"
      >
        ↑ استخدم النتيجة كمدخل جديد
      </button>
    </div>
  );
}
