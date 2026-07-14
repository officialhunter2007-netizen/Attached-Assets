/**
 * معمل المنطق الرقمي وأنظمة الترقيم — بيئة محاكاة غرفة عمليات مركز بيانات يمني
 * 
 * الفكرة المركزية: الطالب مهندس أول في مركز بيانات، يحل تذاكر دعم فني
 * كل تذكرة تطبق مفهوماً من مفاهيم الوحدة التسعة
 * 
 * الميزات:
 * - لوحة تحكم رئيسية (مؤشر استقرار، صندوق تذاكر، سجل عمليات، مقاييس)
 * - 9 محطات تطبيقية (محطة لكل درس)
 * - نظام توثيق إلزامي
 * - مؤشر ديون تقنية
 * - مستويات صعوبة متدرجة
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useRoute, useLocation } from "wouter";
import {
  ChevronRight, HelpCircle, X, Lightbulb, CheckCircle2, AlertTriangle,
  Clock, Zap, Shield, Terminal, Wrench, FileText, BarChart3,
  Activity, Server, Cpu, Monitor, Play, RefreshCw, ArrowLeft, Trophy
} from "lucide-react";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

type TicketPriority = "critical" | "high" | "medium";
type TicketStatus = "pending" | "active" | "done";
type EnvLevel = "dev" | "staging" | "prod";

interface Ticket {
  id: string;
  station: number;
  title: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  timeLimit: number; // seconds
  enablers?: string[]; // prerequisite ticket IDs
}

interface OperationLog {
  time: string;
  action: string;
  type: "info" | "success" | "warning" | "error";
}

// ═══════════════════════════════════════════════════════════════════════════
// LAB ASSISTANT (مساعد المعمل)
// ═══════════════════════════════════════════════════════════════════════════
function LabAssistant({ open, onToggle, station, envLevel }: {
  open: boolean; onToggle: () => void; station: number; envLevel: EnvLevel;
}) {
  const hints: Record<number, string[]> = {
    0: ["البتات تُقرأ من اليمين لليسار: LSB → MSB", "128,64,32,16,8,4,2,1 — تذكر تسلسل القوى", "الباقي من القسمة على 2 يُقرأ من الأسفل للأعلى", "البت السابع في العدد 8-bit هو 2^6 = 64"],
    1: ["للتحويل من ثنائي لست عشري: قسّم لرباعيات", "A=10, B=11, C=12, D=13, E=14, F=15", "للتحقق: حوّل للعشري أولاً، ثم حوّل العشري للنظام الآخر", "IP يتكون من 4 ثمانيات — كل ثمانية 0-255"],
    2: ["0x تعني ست عشري، 0o تعني ثماني", "كل رقم ثماني = 3 بتات بالضبط", "chmod 755 = rwxr-xr-x", "المسافة بين عنوانين = الطرح بالنظام الست عشري"],
    3: ["A·A = A — Idempotent Law", "(A·B)′ = A′ + B′ — De Morgan", "A + A·B = A — Absorption", "تعقيد التعبير = عدد العمليات × عدد المتغيرات"],
    4: ["NAND بوابة كونية — يمكن بناء أي بوابة منها", "XOR = (A·B̅) + (Ā·B)", "الدائرة التجميعية: المخرج يعتمد فقط على المدخلات الحالية", "NOR بوابة كونية أيضاً — اختبر ذلك!"],
    5: ["عدد صفوف جدول الحقيقة = 2^n حيث n عدد المدخلات", "الصفوف المتناقضة = خطأ في التصميم", "SOP = Sum of Products — استخرج الدالة من الصفوف التي مخرجها 1", "POS = Product of Sums — استخرج من الصفوف التي مخرجها 0"],
  };

  const envHelp: Record<EnvLevel, string> = {
    dev: "🐣 بيئة تطوير: تلميحات متاحة، لا ضغط وقت",
    staging: "🔄 بيئة اختبار: تلميحات محدودة، وقت معقول",
    prod: "🚨 بيئة إنتاج: لا تلميحات، وقت ضيق، توثيق صارم",
  };

  const stationHints = hints[station] ?? ["ادرس محتوى الدرس جيداً قبل البدء", "التوثيق مهم — اكتب ملاحظاتك دائماً", "الحل السريع ليس دائماً الأفضل"];

  return (
    <>
      <button onClick={onToggle}
        className={`fixed bottom-6 left-6 z-50 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all ${
          open ? "bg-amber-500 text-black scale-90" : "bg-gradient-to-br from-amber-400 to-amber-600 text-black hover:scale-110"
        }`} title="مساعد المعمل">
        {open ? <X className="w-5 h-5" /> : <HelpCircle className="w-6 h-6" />}
      </button>
      {open && (
        <div className="fixed bottom-20 left-6 z-50 w-80 max-h-[65vh] bg-gradient-to-br from-zinc-900 via-zinc-950 to-black border border-amber-500/30 rounded-3xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-amber-500/20 to-amber-600/10 border-b border-amber-500/20 px-5 py-3">
            <Lightbulb className="w-4 h-4 text-amber-400 inline mr-2" />
            <span className="text-amber-300 font-bold text-sm">مساعد المعمل</span>
            <div className="text-[10px] text-amber-400/50 mt-1">{envHelp[envLevel]}</div>
          </div>
          <div className="p-4 space-y-2 overflow-y-auto max-h-[45vh]">
            {stationHints.map((h, i) => (
              <div key={i} className="flex gap-2 items-start">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400/50 mt-1.5 shrink-0" />
                <p className="text-white/70 text-xs leading-relaxed">{h}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD — لوحة التحكم الرئيسية
// ═══════════════════════════════════════════════════════════════════════════
function Dashboard({ stability, tickets, logs, envLevel, setEnvLevel, onStartTicket }: {
  stability: number;
  tickets: Ticket[];
  logs: OperationLog[];
  envLevel: EnvLevel;
  setEnvLevel: (e: EnvLevel) => void;
  onStartTicket: (t: Ticket) => void;
}) {
  const pending = tickets.filter(t => t.status === "pending");
  const critical = pending.filter(t => t.priority === "critical");

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      {/* System status bar */}
      <div className="rounded-2xl border border-emerald-400/20 bg-gradient-to-br from-emerald-500/5 to-emerald-700/5 p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <span className="text-emerald-300 font-bold text-sm">مركز بيانات النخبة — عدن</span>
          </div>
          <div className="text-[10px] text-white/40">🟢 متصل</div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-white/50 w-20">استقرار المنظومة</span>
          <div className="flex-1 bg-white/5 rounded-full h-2.5 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-red-500 via-amber-500 to-emerald-500 transition-all duration-1000"
              style={{ width: `${stability}%` }} />
          </div>
          <span className="text-[10px] font-mono text-emerald-300 w-8 text-left">{stability}%</span>
        </div>
      </div>

      {/* Environment selector */}
      <div className="flex gap-2">
        {(["dev", "staging", "prod"] as EnvLevel[]).map(env => (
          <button key={env} onClick={() => setEnvLevel(env)}
            className={`flex-1 py-2 rounded-xl text-[10px] font-bold border transition-all ${
              envLevel === env
                ? env === "dev" ? "bg-blue-500/20 border-blue-400/40 text-blue-300" :
                  env === "staging" ? "bg-amber-500/20 border-amber-400/40 text-amber-300" :
                  "bg-red-500/20 border-red-400/40 text-red-300"
                : "bg-white/5 border-white/10 text-white/30"
            }`}>
            {env === "dev" ? "🐣 تطوير" : env === "staging" ? "🔄 اختبار" : "🚨 إنتاج"}
          </button>
        ))}
      </div>

      {/* Alert for critical tickets */}
      {critical.length > 0 && (
        <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 flex items-center gap-2 animate-pulse">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <div className="text-xs text-red-200">{critical.length} تذاكر حرجة بحاجة لتدخل فوري</div>
        </div>
      )}

      {/* Ticket inbox */}
      <div className="rounded-2xl border border-amber-400/20 bg-gradient-to-br from-amber-500/5 to-amber-700/5 p-4">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="w-4 h-4 text-amber-400" />
          <span className="text-amber-300 font-bold text-sm">صندوق التذاكر</span>
          <span className="text-[10px] bg-amber-500/20 rounded-full px-2 py-0.5 text-amber-300">{pending.length} معلقة</span>
        </div>
        <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
          {tickets.filter(t => t.status !== "done").slice(0, 6).map(ticket => (
            <button key={ticket.id} onClick={() => onStartTicket(ticket)}
              className="w-full text-right p-3 rounded-xl border transition-all hover:bg-white/5 flex items-center gap-2"
              style={{ borderColor: ticket.priority === "critical" ? "rgba(239,68,68,0.3)" : ticket.priority === "high" ? "rgba(245,158,11,0.2)" : "rgba(255,255,255,0.1)" }}>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                ticket.priority === "critical" ? "bg-red-500/20 text-red-400" :
                ticket.priority === "high" ? "bg-amber-500/20 text-amber-400" :
                "bg-blue-500/20 text-blue-400"
              }`}>
                {ticket.priority === "critical" ? "حرج" : ticket.priority === "high" ? "عالي" : "متوسط"}
              </span>
              <span className="text-[10px] text-white/30 font-mono">#{ticket.id}</span>
              <span className="text-xs text-white/80 flex-1 truncate">{ticket.title}</span>
              <Clock className="w-3 h-3 text-white/30" />
              <span className="text-[10px] text-white/40">{Math.floor(ticket.timeLimit / 60)}د</span>
            </button>
          ))}
          {tickets.filter(t => t.status !== "done").length === 0 && (
            <div className="text-center text-white/30 text-xs py-4">🎉 لا توجد تذاكر معلقة</div>
          )}
        </div>
      </div>

      {/* Operation log */}
      <div className="rounded-xl border border-white/10 bg-black/30 p-3 max-h-[150px] overflow-y-auto">
        <div className="text-[10px] text-white/30 mb-2 font-bold">سجل العمليات</div>
        {logs.slice(-6).reverse().map((log, i) => (
          <div key={i} className="flex items-center gap-2 text-[9px] font-mono mb-0.5">
            <span className="text-white/20 w-12">{log.time}</span>
            <span className={log.type === "success" ? "text-emerald-400" : log.type === "warning" ? "text-amber-400" : log.type === "error" ? "text-red-400" : "text-white/50"}>
              {log.type === "success" ? "✓" : log.type === "warning" ? "⚠" : log.type === "error" ? "✗" : "ℹ"}
            </span>
            <span className="text-white/40">{log.action}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STATION 1: Binary & Positional Notation
// ═══════════════════════════════════════════════════════════════════════════
function Station1_Binary({ envLevel, onSubmit }: { envLevel: EnvLevel; onSubmit: (doc: string) => void }) {
  const [ex, setEx] = useState(0);
  const [answer, setAnswer] = useState("");
  const [doc, setDoc] = useState("");
  const [feedback, setFeedback] = useState("");
  const [score, setScore] = useState(0);

  // Ex 1: Read binary stream - convert 1101010 to decimal
  // Ex 2: Build positional - represent 173 with min bits
  // Ex 3: Find error - which binary value is wrong (signed vs unsigned)

  const exercises = [
    {
      prompt: "تدفق بيانات ثنائي من نظام المدفوعات: 1101010. ما القيمة العشرية لهذه المعاملة؟",
      answer: "106",
      hint: envLevel === "dev" ? "تذكّر: 64+32+0+8+0+2+0 = ?" : undefined,
      docPlaceholder: "وضّح كيف حسبت القيمة من الخانات الموضعية...",
    },
    {
      prompt: "مثّل العدد 173 بأقل عدد من البتات مع توضيح وزن كل خانة. اكتب التمثيل الثنائي.",
      answer: "10101101",
      hint: envLevel === "dev" ? "أكبر قيمة = 2^7=128 < 173 < 2^8=256 → تحتاج 8 بتات" : undefined,
      docPlaceholder: "لماذا اخترت 8 بتات تحديداً؟ وما وزن الخانة الأكثر أهمية؟",
    },
    {
      prompt: "ثلاث قيم ثنائية: A=10001100, B=01110100, C=11110000. واحدة منها تُمثّل قيمة سالبة بـ two's complement. أيها؟",
      answer: "A",
      hint: envLevel === "dev" ? "في two's complement، البت الأكثر أهمية (أقصى اليسار) = 1 يعني سالب" : undefined,
      docPlaceholder: "اشرح لماذا البت الأهم يحدد الإشارة في two's complement...",
    },
  ];

  const current = exercises[ex];

  const check = () => {
    const clean = answer.trim();
    if (clean.toUpperCase() === current.answer.toUpperCase()) {
      setFeedback("✅ صحيح!");
      setScore(prev => prev + 1);
    } else {
      setFeedback(`❌ غير صحيح. الإجابة: ${current.answer}`);
    }
  };

  const next = () => {
    if (!doc.trim() && envLevel !== "dev") return;
    onSubmit(doc);
    if (ex < 2) {
      setEx(prev => prev + 1);
      setAnswer("");
      setDoc("");
      setFeedback("");
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in">
      <div className="rounded-2xl border border-blue-400/20 bg-gradient-to-br from-blue-500/5 to-blue-700/5 p-4">
        <div className="text-[10px] text-blue-300/70 font-bold">محطة 1 · التمثيل الثنائي والترميز الموضعي</div>
        <div className="text-blue-300 font-black text-sm mt-1">نظام معالجة مدفوعات — قيم مالية خاطئة في السجلات</div>
        <div className="text-white/40 text-xs mt-1">تمرين {ex + 1}/3</div>
      </div>

      <div className="rounded-xl border border-amber-400/20 bg-amber-500/5 p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="bg-red-500/20 text-red-400 text-[9px] px-2 py-0.5 rounded-full font-bold">
            {ex === 0 ? "حرج — مالي" : ex === 1 ? "عالي — بنية تحتية" : "حرج — دقة بيانات"}
          </span>
          <span className="text-[10px] text-white/30">تذكرة #{100 + ex}</span>
        </div>
        <p className="text-sm text-white/90 leading-relaxed mb-4">{current.prompt}</p>
        
        {current.hint && <div className="text-[10px] text-amber-300/70 bg-amber-500/5 rounded-lg p-2 mb-3">💡 {current.hint}</div>}

        <input type="text" value={answer} onChange={e => { if (!feedback) setAnswer(e.target.value); }}
          placeholder="الإجابة..."
          className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-center font-mono text-lg text-white placeholder:text-white/20 focus:border-amber-400/50 outline-none mb-3"
          style={{ direction: "ltr" }} />

        {!feedback ? (
          <button onClick={check} disabled={!answer.trim()}
            className="w-full py-2.5 rounded-xl bg-amber-500 text-black font-bold text-sm disabled:opacity-30">تحقق</button>
        ) : (
          <>
            <div className={`p-3 rounded-xl text-sm font-bold text-center mb-3 ${
              feedback.includes('✅') ? 'bg-emerald-500/10 border border-emerald-400/30 text-emerald-200' :
              'bg-red-500/10 border border-red-400/30 text-red-200'
            }`}>{feedback}</div>
            
            <textarea value={doc} onChange={e => setDoc(e.target.value)}
              placeholder={current.docPlaceholder}
              rows={2}
              className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white/70 placeholder:text-white/20 focus:border-amber-400/50 outline-none resize-none mb-2" />
            <div className="text-[9px] text-white/20 mb-2">⚠️ التوثيق إلزامي في بيئة {envLevel === "prod" ? "الإنتاج" : envLevel === "staging" ? "الاختبار" : "التطوير"}</div>
            
            <button onClick={next} disabled={envLevel !== "dev" && !doc.trim()}
              className="w-full py-2.5 rounded-xl bg-gradient-to-l from-blue-500 to-cyan-500 text-white font-bold text-sm disabled:opacity-30">
              {ex < 2 ? "التالي ←" : "إنهاء المحطة ✓"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STATION 2: Number System Conversions
// ═══════════════════════════════════════════════════════════════════════════
function Station2_Conversions({ envLevel, onSubmit }: { envLevel: EnvLevel; onSubmit: (doc: string) => void }) {
  const [ex, setEx] = useState(0);
  const [answers, setAnswers] = useState<string[]>(["", "", ""]);
  const [doc, setDoc] = useState("");

  // Ex 1: Serial conversion table (3 values)
  // Ex 2: Chain conversion
  // Ex 3: Emergency - convert binary IP to dotted decimal

  const exercises = [
    {
      title: "جدول التحويل التسلسلي",
      desc: "جهاز شبكي يُصدر سجلات بتنسيقات مختلطة. أكمل الجدول:",
      rows: [
        { label: "الثنائي", value: "10101100", target: "decimal" },
        { label: "الست عشري", value: "7F", target: "decimal" },
        { label: "العشري", value: "83", target: "hex" },
      ],
      correctAnswers: ["172", "127", "53"],
      docPlaceholder: "أي نظام كان الأسرع في التحويل؟ ولماذا؟",
    },
    {
      title: "تمرين المسار المتعدد",
      desc: "حوّل 170 إلى ثنائي ثم إلى ست عشري، ثم حوّله مباشرة للست عشري. هل النتيجتان متطابقتان؟",
      answers: ["10101010", "AA"],
      docPlaceholder: "لماذا التحويل المباشر (عشري ← ست عشري) أسرع من المسارين؟",
    },
    {
      title: "سيناريو طوارئ — عنوان IP",
      desc: "عنوان IP معطّل يظهر كـ: 11000000.10101000.00000001.00000001 — حوّله للتدوين النقطي العشري. هل هو عنوان صالح؟",
      answer: "192.168.1.1",
      docPlaceholder: "هل هذا IP خاص (private)؟ كيف عرفت؟",
    },
  ];

  const current = exercises[ex];
  const [results, setResults] = useState<string[]>([]);

  const check = () => {
    if (ex === 0) {
      setResults(answers.map((a, i) => a.trim() === current.correctAnswers[i] ? "✅" : "❌"));
    } else if (ex === 1) {
      setResults(answers.slice(0, 2).map((a, i) => a.trim().toUpperCase() === current.answers[i].toUpperCase() ? "✅" : "❌"));
    } else {
      setResults([answers[0].trim() === current.answer ? "✅" : "❌"]);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in">
      <div className="rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-500/5 to-violet-700/5 p-4">
        <div className="text-[10px] text-violet-300/70 font-bold">محطة 2 · التحويل بين الأنظمة</div>
        <div className="text-violet-300 font-black text-sm mt-1">سجلات شبكية مختلطة — المهندس السابق غادر دون توثيق</div>
        <div className="text-white/40 text-xs mt-1">تمرين {ex + 1}/3</div>
      </div>

      <div className="rounded-xl border border-amber-400/20 bg-amber-500/5 p-4">
        <div className="text-amber-300/80 text-sm font-bold mb-1">{current.title}</div>
        <p className="text-xs text-white/60 mb-4">{current.desc}</p>

        {ex === 0 && (
          <div className="space-y-2 mb-4">
            {current.rows.map((row, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-[10px] text-white/40 w-16">{row.label}:</span>
                <span className="font-mono text-white text-xs w-20" style={{ direction: "ltr" }}>{row.value}</span>
                <span className="text-[10px] text-white/20">→</span>
                <span className="text-[10px] text-white/40 w-16">{row.target}:</span>
                <input type="text" value={answers[i]} onChange={e => { const a = [...answers]; a[i] = e.target.value; setAnswers(a); }}
                  className="flex-1 bg-black/40 border border-white/10 rounded px-2 py-1 font-mono text-xs text-white focus:border-amber-400/50 outline-none max-w-[80px]"
                  style={{ direction: "ltr" }} />
                {results[i] && <span className="text-xs">{results[i]}</span>}
              </div>
            ))}
          </div>
        )}

        {ex === 1 && (
          <div className="space-y-2 mb-4">
            <div className="text-xs text-white/50">170₁₀ → ثنائي → ست عشري</div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-white/40">ثنائي:</span>
              <input type="text" value={answers[0]} onChange={e => { const a = [...answers]; a[0] = e.target.value; setAnswers(a); }}
                className="bg-black/40 border border-white/10 rounded px-2 py-1 font-mono text-xs text-white w-28" style={{ direction: "ltr" }} />
              {results[0] && <span className="text-xs">{results[0]}</span>}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-white/40">ست عشري:</span>
              <input type="text" value={answers[1]} onChange={e => { const a = [...answers]; a[1] = e.target.value; setAnswers(a); }}
                className="bg-black/40 border border-white/10 rounded px-2 py-1 font-mono text-xs text-white w-20" style={{ direction: "ltr" }} />
              {results[1] && <span className="text-xs">{results[1]}</span>}
            </div>
          </div>
        )}

        {ex === 2 && (
          <div className="mb-4">
            <div className="font-mono text-sm text-amber-200 mb-2" style={{ direction: "ltr" }}>
              11000000.10101000.00000001.00000001
            </div>
            <input type="text" value={answers[0]} onChange={e => { const a = [...answers]; a[0] = e.target.value; setAnswers(a); }}
              placeholder="xxx.xxx.xxx.xxx"
              className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 font-mono text-sm text-white focus:border-amber-400/50 outline-none mb-2"
              style={{ direction: "ltr" }} />
            {results[0] && <div className={`text-xs font-bold ${results[0].includes('✅') ? 'text-emerald-400' : 'text-red-400'}`}>{results[0]}</div>}
          </div>
        )}

        {results.length === 0 ? (
          <button onClick={check}
            className="w-full py-2.5 rounded-xl bg-amber-500 text-black font-bold text-sm">تحقق</button>
        ) : (
          <>
            <textarea value={doc} onChange={e => setDoc(e.target.value)}
              placeholder={current.docPlaceholder}
              rows={2}
              className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white/70 resize-none mb-2" />
            <button onClick={() => { onSubmit(doc); if (ex < 2) { setEx(ex + 1); setAnswers(["", "", ""]); setDoc(""); setResults([]); } }}
              className="w-full py-2.5 rounded-xl bg-gradient-to-l from-violet-500 to-purple-500 text-white font-bold text-sm">
              {ex < 2 ? "التالي ←" : "إنهاء المحطة ✓"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STATION 3: Octal & Hex Memory Addresses
// ═══════════════════════════════════════════════════════════════════════════
function Station3_MemoryAddresses({ envLevel, onSubmit }: { envLevel: EnvLevel; onSubmit: (doc: string) => void }) {
  const [ex, setEx] = useState(0);
  const [answer, setAnswer] = useState("");
  const [doc, setDoc] = useState("");
  const [feedback, setFeedback] = useState("");

  const exercises = [
    {
      title: "خريطة الذاكرة",
      prompt: "في تفريغ ذاكرة، المسافة بين 0x1F4 و 0x2A8 هي... كم بايت؟",
      answer: "180",
      hint: envLevel === "dev" ? "2A8₁₆ = 680, 1F4₁₆ = 500, الفرق = 180" : undefined,
      docPlaceholder: "كيف حسبت الفرق؟ اشرح خطواتك.",
    },
    {
      title: "أذونات Linux",
      prompt: "ملف بصلاحيات chmod 755. ماذا يعني الرقم 7؟ وماذا يعني الرقمان 5,5؟",
      answer: "7=rwx,5=r-x",
      hint: envLevel === "dev" ? "4=read, 2=write, 1=execute. 7=4+2+1, 5=4+1" : undefined,
      docPlaceholder: "لماذا نستخدم النظام الثماني لتمثيل الصلاحيات؟",
    },
    {
      title: "ربط النظامين",
      prompt: "أسرع طريقة لتحويل 1011.1100.0101.0010 الثنائي للست عشري هي... (اكتب القيمة)",
      answer: "BC52",
      hint: envLevel === "dev" ? "قسّم لرباعيات: 1011=B, 1100=C, 0101=5, 0010=2" : undefined,
      docPlaceholder: "لماذا التحويل المباشر (رباعيات) أسرع من العشري وسيطاً؟",
    },
  ];

  const current = exercises[ex];

  const check = () => {
    if (answer.trim().toUpperCase() === current.answer.toUpperCase()) {
      setFeedback("✅ صحيح!");
    } else {
      setFeedback(`❌ الإجابة الصحيحة: ${current.answer}`);
    }
  };

  const next = () => { onSubmit(doc); if (ex < 2) { setEx(ex + 1); setAnswer(""); setDoc(""); setFeedback(""); } };

  return (
    <div className="space-y-4 animate-in fade-in">
      <div className="rounded-2xl border border-teal-400/20 bg-gradient-to-br from-teal-500/5 to-teal-700/5 p-4">
        <div className="text-[10px] text-teal-300/70 font-bold">محطة 3 · عناوين الذاكرة</div>
        <div className="text-teal-300 font-black text-sm mt-1">تحليل تفريغ ذاكرة — عملية متعطلة في بيئة الإنتاج</div>
        <div className="text-white/40 text-xs mt-1">تمرين {ex + 1}/3</div>
      </div>

      <div className="rounded-xl border border-amber-400/20 bg-amber-500/5 p-4">
        <div className="text-amber-300/80 text-sm font-bold mb-2">{current.title}</div>
        <p className="text-sm text-white/90 leading-relaxed mb-3">{current.prompt}</p>
        {current.hint && <div className="text-[10px] text-amber-300/70 bg-amber-500/5 rounded-lg p-2 mb-3">💡 {current.hint}</div>}
        
        <input type="text" value={answer} onChange={e => { if (!feedback) setAnswer(e.target.value); }}
          className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-center font-mono text-lg text-white focus:border-amber-400/50 outline-none mb-3"
          style={{ direction: "ltr" }} />

        {!feedback ? (
          <button onClick={check} disabled={!answer.trim()}
            className="w-full py-2.5 rounded-xl bg-amber-500 text-black font-bold text-sm disabled:opacity-30">تحقق</button>
        ) : (
          <>
            <div className={`p-3 rounded-xl text-sm font-bold text-center mb-3 ${
              feedback.includes('✅') ? 'bg-emerald-500/10 border border-emerald-400/30 text-emerald-200' : 'bg-red-500/10 border border-red-400/30 text-red-200'
            }`}>{feedback}</div>
            <textarea value={doc} onChange={e => setDoc(e.target.value)} placeholder={current.docPlaceholder} rows={2}
              className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white/70 resize-none mb-2" />
            <button onClick={next} className="w-full py-2.5 rounded-xl bg-gradient-to-l from-teal-500 to-cyan-500 text-white font-bold text-sm">
              {ex < 2 ? "التالي ←" : "إنهاء المحطة ✓"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STATION 4: Boolean Algebra
// ═══════════════════════════════════════════════════════════════════════════
function Station4_Boolean({ envLevel, onSubmit }: { envLevel: EnvLevel; onSubmit: (doc: string) => void }) {
  const [ex, setEx] = useState(0);
  const [answer, setAnswer] = useState("");
  const [doc, setDoc] = useState("");
  const [feedback, setFeedback] = useState("");

  const exercises = [
    {
      title: "مبسّط التعابير",
      prompt: "بسّط التعبير: A·(A + B) باستخدام قانون الاستيعاب (Absorption)",
      answer: "A",
      hint: envLevel === "dev" ? "قانون الاستيعاب: A·(A+B) = A, وكذلك A+A·B = A" : undefined,
      doc: "أي قانون بولياني استخدمت؟",
    },
    {
      title: "محوّل De Morgan",
      prompt: "حوّل: NOT(A·B + C) باستخدام نظرية De Morgan. اكتب التعبير النهائي المبسّط.",
      answer: "A'+B'·C'",
      hint: envLevel === "dev" ? "(X+Y)′ = X′·Y′ ثم طبق مرة أخرى" : undefined,
      doc: "كم قلّت العمليات بعد تطبيق De Morgan؟",
    },
    {
      title: "تحسين أداء النظام",
      prompt: "نظام تحكم بالوصول: AB + AB'C + A'BC + AB'C'. بسط التعبير. كم شرطاً بقي بعد التبسيط؟",
      answer: "A",
      hint: envLevel === "dev" ? "خذ A عامل مشترك: A(B+B'C+B'C') + A'BC = A(1) + A'BC = A + BC" : undefined,
      doc: "كم قلّ وقت المعالجة بعد التبسيط؟",
    },
  ];

  const current = exercises[ex];

  return (
    <div className="space-y-4 animate-in fade-in">
      <div className="rounded-2xl border border-emerald-400/20 bg-gradient-to-br from-emerald-500/5 to-emerald-700/5 p-4">
        <div className="text-[10px] text-emerald-300/70 font-bold">محطة 4 · الجبر البولياني</div>
        <div className="text-emerald-300 font-black text-sm mt-1">نظام تحكم بالوصول — منطق أذونات معقد وبطيء</div>
        <div className="text-white/40 text-xs mt-1">تمرين {ex + 1}/3</div>
      </div>

      <div className="rounded-xl border border-amber-400/20 bg-amber-500/5 p-4">
        <div className="text-amber-300/80 text-sm font-bold mb-2">{current.title}</div>
        <p className="text-sm text-white/90 leading-relaxed mb-3" style={{ direction: "ltr" }}>{current.prompt}</p>
        {current.hint && <div className="text-[10px] text-amber-300/70 bg-amber-500/5 rounded-lg p-2 mb-3">💡 {current.hint}</div>}
        
        <input type="text" value={answer} onChange={e => { if (!feedback) setAnswer(e.target.value); }}
          placeholder="A + B'·C"
          className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-center font-mono text-lg text-white focus:border-amber-400/50 outline-none mb-3"
          style={{ direction: "ltr" }} />

        {!feedback ? (
          <button onClick={() => { const clean = answer.trim().replace(/\s/g, '').toUpperCase(); setFeedback(clean === current.answer.replace(/\s/g, '').toUpperCase() ? "✅ صحيح!" : `❌ الإجابة: ${current.answer}`); }}
            disabled={!answer.trim()}
            className="w-full py-2.5 rounded-xl bg-amber-500 text-black font-bold text-sm disabled:opacity-30">تحقق</button>
        ) : (
          <>
            <div className={`p-3 rounded-xl text-sm font-bold text-center mb-3 ${
              feedback.includes('✅') ? 'bg-emerald-500/10 border border-emerald-400/30 text-emerald-200' : 'bg-red-500/10 border border-red-400/30 text-red-200'
            }`}>{feedback}</div>
            <textarea value={doc} onChange={e => setDoc(e.target.value)} placeholder={current.doc} rows={2}
              className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white/70 resize-none mb-2" />
            <button onClick={() => { onSubmit(doc); if (ex < 2) { setEx(ex + 1); setAnswer(""); setDoc(""); setFeedback(""); } }}
              className="w-full py-2.5 rounded-xl bg-gradient-to-l from-emerald-500 to-teal-500 text-white font-bold text-sm">
              {ex < 2 ? "التالي ←" : "إنهاء المحطة ✓"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STATION 5: Logic Gates
// ═══════════════════════════════════════════════════════════════════════════
function Station5_LogicGates({ envLevel, onSubmit }: { envLevel: EnvLevel; onSubmit: (doc: string) => void }) {
  const [ex, setEx] = useState(0);
  const [answer, setAnswer] = useState("");
  const [doc, setDoc] = useState("");
  const [feedback, setFeedback] = useState("");

  const exercises = [
    {
      title: "بناء دائرة بسيطة",
      prompt: "ابنِ دائرة NAND فقط تحقق الدالة A·B. كم بوابة NAND تحتاج؟",
      answer: "2",
      hint: envLevel === "dev" ? "NAND ثم NOT (باستخدام NAND أيضاً): NAND(A,B) ثم NAND(x,x) = NOT(x)" : undefined,
      doc: "لماذا NAND بوابة كونية؟",
    },
    {
      title: "تحدي الإنجاز بالحد الأدنى",
      prompt: "حقق الدالة A⊕B (XOR) باستخدام بوابات NAND فقط. كم بوابة تحتاج كحد أدنى؟",
      answer: "4",
      hint: envLevel === "dev" ? "XOR = NAND(NAND(A, NAND(A,B)), NAND(B, NAND(A,B))) — 4 بوابات" : undefined,
      doc: "لماذا نهتم بعدد البوابات في التصنيع؟",
    },
    {
      title: "كشف الخلل",
      prompt: "دائرة XOR تُعطي مخرجاً خاطئاً عند A=1,B=1 (المخرج 1 بدل 0). أي بوابة معطلة؟",
      answer: "OR",
      hint: envLevel === "dev" ? "إذا كانت البوابة الأخيرة OR بدل XOR، فعند 1,1 ستُخرج 1" : undefined,
      doc: "كيف تفحص الدوائر منطقياً لاكتشاف الأعطال؟",
    },
  ];

  const current = exercises[ex];

  return (
    <div className="space-y-4 animate-in fade-in">
      <div className="rounded-2xl border border-amber-400/20 bg-gradient-to-br from-amber-500/5 to-amber-700/5 p-4">
        <div className="text-[10px] text-amber-300/70 font-bold">محطة 5 · البوابات المنطقية</div>
        <div className="text-amber-300 font-black text-sm mt-1">مختبر الدوائر — بناء واختبار وكشف الأعطال</div>
        <div className="text-white/40 text-xs mt-1">تمرين {ex + 1}/3</div>
      </div>

      <div className="rounded-xl border border-amber-400/20 bg-amber-500/5 p-4">
        <div className="text-amber-300/80 text-sm font-bold mb-2">{current.title}</div>
        <p className="text-sm text-white/90 leading-relaxed mb-3">{current.prompt}</p>
        {current.hint && <div className="text-[10px] text-amber-300/70 bg-amber-500/5 rounded-lg p-2 mb-3">💡 {current.hint}</div>}
        
        <input type="text" value={answer} onChange={e => { if (!feedback) setAnswer(e.target.value); }}
          className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-center font-mono text-lg text-white focus:border-amber-400/50 outline-none mb-3"
          style={{ direction: "ltr" }} />

        {!feedback ? (
          <button onClick={() => { if (answer.trim().toUpperCase() === current.answer.toUpperCase()) setFeedback("✅ صحيح!"); else setFeedback(`❌ الإجابة: ${current.answer}`); }}
            disabled={!answer.trim()}
            className="w-full py-2.5 rounded-xl bg-amber-500 text-black font-bold text-sm disabled:opacity-30">تحقق</button>
        ) : (
          <>
            <div className={`p-3 rounded-xl text-sm font-bold text-center mb-3 ${
              feedback.includes('✅') ? 'bg-emerald-500/10 border border-emerald-400/30 text-emerald-200' : 'bg-red-500/10 border border-red-400/30 text-red-200'
            }`}>{feedback}</div>
            <textarea value={doc} onChange={e => setDoc(e.target.value)} placeholder={current.doc} rows={2}
              className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white/70 resize-none mb-2" />
            <button onClick={() => { onSubmit(doc); if (ex < 2) { setEx(ex + 1); setAnswer(""); setDoc(""); setFeedback(""); } }}
              className="w-full py-2.5 rounded-xl bg-gradient-to-l from-amber-500 to-orange-500 text-white font-bold text-sm">
              {ex < 2 ? "التالي ←" : "إنهاء المحطة ✓"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STATION 6: Truth Tables
// ═══════════════════════════════════════════════════════════════════════════
function Station6_TruthTables({ envLevel, onSubmit }: { envLevel: EnvLevel; onSubmit: (doc: string) => void }) {
  const [ex, setEx] = useState(0);
  const [answers, setAnswers] = useState<string[]>(["", "", "", "", "", "", "", ""]);
  const [doc, setDoc] = useState("");
  const [feedback, setFeedback] = useState("");

  const exercises = [
    {
      title: "بناء جدول الحقيقة",
      desc: "نظام تحكم في مولد كهربائي: 'يعمل المولد إذا انقطعت الكهرباء AND كان الوقود كافياً، أو إذا ارتفعت الحرارة'. املأ العمود F.",
      vars: ["كهرباء", "وقود", "حرارة"],
      correct: ["0", "0", "0", "1", "1", "0", "1", "0"],
      hint: "F = (NOT A AND B) OR C",
    },
  ];

  const current = exercises[ex];
  const rows = [
    [0, 0, 0], [0, 0, 1], [0, 1, 0], [0, 1, 1],
    [1, 0, 0], [1, 0, 1], [1, 1, 0], [1, 1, 1],
  ];

  const check = () => {
    const allCorrect = answers.every((a, i) => a.trim() === current.correct[i]);
    if (allCorrect) setFeedback("✅ صحيح! جدول الحقيقة مكتمل.");
    else {
      const wrong = answers.map((a, i) => a.trim() === current.correct[i] ? i : -1).filter(i => i >= 0).length;
      setFeedback(`${wrong}/8 صحيح. راجع الصفوف الخاطئة.`);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in">
      <div className="rounded-2xl border border-rose-400/20 bg-gradient-to-br from-rose-500/5 to-rose-700/5 p-4">
        <div className="text-[10px] text-rose-300/70 font-bold">محطة 6 · جداول الحقيقة</div>
        <div className="text-rose-300 font-black text-sm mt-1">نظام تحكم في مولد كهربائي — قرارات حرجة</div>
        <div className="text-white/40 text-xs mt-1">تمرين {ex + 1}/3</div>
      </div>

      <div className="rounded-xl border border-amber-400/20 bg-amber-500/5 p-4">
        <div className="text-amber-300/80 text-sm font-bold mb-2">{current.title}</div>
        <p className="text-xs text-white/60 mb-3">{current.desc}</p>
        {current.hint && <div className="text-[10px] text-amber-300/70 bg-amber-500/5 rounded-lg p-2 mb-3">💡 {current.hint}</div>}

        <div className="overflow-x-auto mb-3">
          <table className="w-full text-center text-xs" style={{ direction: "ltr" }}>
            <thead>
              <tr className="border-b border-white/10">
                <th className="p-2 text-white/50 font-normal">A(كهرباء)</th>
                <th className="p-2 text-white/50 font-normal">B(وقود)</th>
                <th className="p-2 text-white/50 font-normal">C(حرارة)</th>
                <th className="p-2 text-rose-400 font-bold">F(تشغيل)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-b border-white/5">
                  <td className="p-2 font-mono text-white/70">{row[0]}</td>
                  <td className="p-2 font-mono text-white/70">{row[1]}</td>
                  <td className="p-2 font-mono text-white/70">{row[2]}</td>
                  <td className="p-2">
                    <input type="text" maxLength={1} value={answers[i]} onChange={e => { const a = [...answers]; a[i] = e.target.value; setAnswers(a); }}
                      className="w-8 bg-transparent border-b border-white/20 text-center font-mono text-sm text-white focus:border-rose-400 outline-none" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!feedback ? (
          <button onClick={check} className="w-full py-2.5 rounded-xl bg-amber-500 text-black font-bold text-sm">تحقق من الجدول</button>
        ) : (
          <>
            <div className={`p-3 rounded-xl text-sm font-bold text-center mb-3 ${
              feedback.includes('✅') ? 'bg-emerald-500/10 border border-emerald-400/30 text-emerald-200' : 'bg-red-500/10 border border-red-400/30 text-red-200'
            }`}>{feedback}</div>
            <textarea value={doc} onChange={e => setDoc(e.target.value)} placeholder="استخرج الدالة المنطقية من الجدول: F = ?" rows={2}
              className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white/70 resize-none mb-2" />
            <button onClick={() => onSubmit(doc)} className="w-full py-2.5 rounded-xl bg-gradient-to-l from-rose-500 to-amber-500 text-white font-bold text-sm">
              إنهاء المحطة ✓
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN ENTRY POINT
// ═══════════════════════════════════════════════════════════════════════════

export default function V4ImmersiveLab() {
  const [, params] = useRoute<{ slug: string; labCode: string }>("/lab/:slug/:labCode");
  const slug = params?.slug ?? "";
  const labCode = decodeURIComponent(params?.labCode ?? "");
  const [, navigate] = useLocation();

  const [envLevel, setEnvLevel] = useState<EnvLevel>("dev");
  const [stability, setStability] = useState(0);
  const [activeStation, setActiveStation] = useState<number | null>(null);
  const [assistantOpen, setAssistantOpen] = useState(false);

  // Ticket system
  const [tickets, setTickets] = useState<Ticket[]>([
    { id: "TKT-001", station: 0, title: "قيم مالية خاطئة — تدفق بيانات ثنائي", description: "نظام المدفوعات يرسل قيماً خاطئة", priority: "critical", status: "pending", timeLimit: 300 },
    { id: "TKT-002", station: 1, title: "سجلات شبكية مختلطة — مهندس غادر", description: "قيم عشرية وست عشرية وثنائية", priority: "high", status: "pending", timeLimit: 360 },
    { id: "TKT-003", station: 2, title: "عملية متعطلة — تحليل memory dump", description: "عناوين ذاكرة تحتاج تحليل", priority: "high", status: "pending", timeLimit: 240 },
    { id: "TKT-004", station: 3, title: "نظام وصول بطيء — تبسيط التعابير", description: "منطق أذونات معقد", priority: "medium", status: "pending", timeLimit: 360 },
    { id: "TKT-005", station: 4, title: "دائرة معطلة — فحص البوابات", description: "دائرة رقمية بمخرج خاطئ", priority: "high", status: "pending", timeLimit: 300 },
    { id: "TKT-006", station: 5, title: "مولد طوارئ — بناء جدول حقيقة", description: "منطق تشغيل المولد", priority: "critical", status: "pending", timeLimit: 360 },
  ]);

  const [logs, setLogs] = useState<OperationLog[]>([]);

  const addLog = (action: string, type: OperationLog["type"] = "info") => {
    const now = new Date();
    const time = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;
    setLogs(prev => [...prev, { time, action, type }]);
  };

  const handleStartTicket = (ticket: Ticket) => {
    setTickets(prev => prev.map(t => t.id === ticket.id ? { ...t, status: "active" } : t));
    setActiveStation(ticket.station);
    addLog(`بدء تذكرة ${ticket.id}: ${ticket.title}`, "info");
  };

  const handleStationSubmit = (doc: string) => {
    if (activeStation === null) return;
    const ticket = tickets.find(t => t.station === activeStation && t.status === "active");
    if (!ticket) return;

    setTickets(prev => prev.map(t => t.id === ticket.id ? { ...t, status: "done" } : t));
    setStability(prev => Math.min(100, prev + 16));
    addLog(`إغلاق تذكرة ${ticket.id} ✓${doc ? ' — موثق: ' + doc.substring(0, 30) : ''}`, "success");
    setActiveStation(null);
  };

  const handleBackToDashboard = () => {
    setActiveStation(null);
  };

  const stationNames = ["التمثيل الثنائي", "التحويلات", "عناوين الذاكرة", "الجبر البولياني", "البوابات", "جداول الحقيقة"];

  return (
    <div className="min-h-[100dvh] bg-background text-white pb-24" style={{ direction: "rtl", fontFamily: "Tajawal, Cairo, sans-serif" }}>
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(`/specialty/${encodeURIComponent(slug)}/map`)} className="text-white/50 hover:text-white">
              <ChevronRight className="w-5 h-5" />
            </button>
            <div className="text-2xl">🧪</div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] text-amber-300/70 font-semibold">معمل · {labCode}</div>
              <div className="font-black text-sm truncate">المنطق الرقمي وأنظمة الترقيم</div>
            </div>
            {activeStation !== null && (
              <button onClick={handleBackToDashboard} className="text-[10px] bg-white/10 rounded-full px-3 py-1 text-white/60 hover:text-white">
                ← لوحة التحكم
              </button>
            )}
            <div className="text-[11px] bg-white/10 rounded-full px-2 py-1 text-white/70">
              {stability}%
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-4">
        {activeStation === null ? (
          <Dashboard
            stability={stability}
            tickets={tickets}
            logs={logs}
            envLevel={envLevel}
            setEnvLevel={setEnvLevel}
            onStartTicket={handleStartTicket}
          />
        ) : activeStation === 0 ? (
          <Station1_Binary envLevel={envLevel} onSubmit={handleStationSubmit} />
        ) : activeStation === 1 ? (
          <Station2_Conversions envLevel={envLevel} onSubmit={handleStationSubmit} />
        ) : activeStation === 2 ? (
          <Station3_MemoryAddresses envLevel={envLevel} onSubmit={handleStationSubmit} />
        ) : activeStation === 3 ? (
          <Station4_Boolean envLevel={envLevel} onSubmit={handleStationSubmit} />
        ) : activeStation === 4 ? (
          <Station5_LogicGates envLevel={envLevel} onSubmit={handleStationSubmit} />
        ) : activeStation === 5 ? (
          <Station6_TruthTables envLevel={envLevel} onSubmit={handleStationSubmit} />
        ) : null}
      </div>

      <LabAssistant
        open={assistantOpen}
        onToggle={() => setAssistantOpen(!assistantOpen)}
        station={activeStation ?? 0}
        envLevel={envLevel}
      />
    </div>
  );
}
