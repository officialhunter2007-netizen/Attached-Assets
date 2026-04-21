import { useState, lazy, Suspense, useRef } from "react";
import { LabProvider, useLabContext } from "./context";
import type { LabTab, TabGroup } from "./types";
import { Scale, BookOpen, FileText, TrendingUp, Calculator, ChevronRight, ChevronLeft, ArrowLeftRight, GraduationCap, Sparkles, RotateCcw, HelpCircle, X } from "lucide-react";

const EquationTab = lazy(() => import("./tabs/equation"));
const TAccountsTab = lazy(() => import("./tabs/t-accounts"));
const JournalEntriesTab = lazy(() => import("./tabs/journal-entries"));
const AccountingCycleTab = lazy(() => import("./tabs/accounting-cycle"));
const IncomeStatementTab = lazy(() => import("./tabs/income-statement"));
const BalanceSheetTab = lazy(() => import("./tabs/balance-sheet"));
const CashFlowTab = lazy(() => import("./tabs/cash-flow"));
const RatioAnalysisTab = lazy(() => import("./tabs/ratio-analysis"));
const BreakEvenTab = lazy(() => import("./tabs/break-even"));
const DepreciationTab = lazy(() => import("./tabs/depreciation"));
const BankReconciliationTab = lazy(() => import("./tabs/bank-reconciliation"));
const AdjustingEntriesTab = lazy(() => import("./tabs/adjusting-entries"));

const TAB_GROUPS: TabGroup[] = [
  {
    label: "الأساسيات",
    icon: <BookOpen className="w-3.5 h-3.5" />,
    tabs: [
      { id: "equation", label: "المعادلة", icon: <Scale className="w-3 h-3" /> },
      { id: "t-accounts", label: "حسابات T", icon: <span className="text-[10px] font-bold">T</span> },
      { id: "journal", label: "القيود", icon: <BookOpen className="w-3 h-3" /> },
      { id: "cycle", label: "الدورة", icon: <span className="text-[10px]">🔄</span> },
    ],
  },
  {
    label: "القوائم والتحليل",
    icon: <FileText className="w-3.5 h-3.5" />,
    tabs: [
      { id: "income-statement", label: "الدخل", icon: <span className="text-[10px]">📊</span> },
      { id: "balance-sheet", label: "الميزانية", icon: <span className="text-[10px]">📋</span> },
      { id: "cash-flow", label: "التدفقات", icon: <span className="text-[10px]">💰</span> },
      { id: "ratios", label: "النسب", icon: <TrendingUp className="w-3 h-3" /> },
    ],
  },
  {
    label: "أدوات متقدمة",
    icon: <Calculator className="w-3.5 h-3.5" />,
    tabs: [
      { id: "break-even", label: "التعادل", icon: <span className="text-[10px]">📈</span> },
      { id: "depreciation", label: "الإهلاك", icon: <span className="text-[10px]">🏗️</span> },
      { id: "bank-recon", label: "التسوية البنكية", icon: <span className="text-[10px]">🏦</span> },
      { id: "adjusting", label: "التسوية والإقفال", icon: <span className="text-[10px]">⚙️</span> },
    ],
  },
];

function Loading() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="w-5 h-5 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
    </div>
  );
}

import { DynamicScenarioOverlay } from "../dynamic-lab/dynamic-scenario-overlay";
import type { DynamicScenario } from "../dynamic-lab/types";

interface AccountingLabProps {
  onShare: (data: string) => void;
  pendingScenario?: DynamicScenario | null;
  onClearScenario?: () => void;
  subjectId?: string;
}

// Recommended flow shown in the orientation banner
const FLOW_STEPS: { id: LabTab; label: string; hint: string }[] = [
  { id: "equation", label: "1. المعادلة", hint: "افهم أ = خ + حقوق" },
  { id: "journal", label: "2. القيود", hint: "سجّل ثم رحّل" },
  { id: "t-accounts", label: "3. حسابات T", hint: "شاهد الأرصدة" },
  { id: "income-statement", label: "4. الدخل", hint: "أرباح أم خسارة" },
  { id: "balance-sheet", label: "5. الميزانية", hint: "تأكد من التوازن" },
];

// Per-tab quick descriptions to orient the student
const TAB_HINTS: Record<string, { title: string; hint: string; needsData?: LabTab }> = {
  equation: { title: "المعادلة المحاسبية", hint: "ابدأ هنا. تعلّم القاعدة الذهبية: الأصول = الخصوم + حقوق الملكية." },
  "t-accounts": { title: "حسابات T", hint: "كل حساب يُعرض على شكل حرف T مع المدين والدائن. تظهر الأرصدة بعد ترحيل القيود." },
  journal: { title: "دفتر القيود اليومية", hint: "هنا تسجّل العمليات. كل قيد لازم يكون متوازناً (مدين = دائن)، ثم اضغط ترحيل." },
  cycle: { title: "الدورة المحاسبية", hint: "الخريطة الكاملة من تحليل العملية حتى الإقفال. اضغط الخطوة عند إكمالها." },
  "income-statement": { title: "قائمة الدخل", hint: "تظهر الأرباح/الخسائر تلقائياً من القيود المرحّلة (إيرادات − مصروفات).", needsData: "journal" },
  "balance-sheet": { title: "الميزانية العمومية", hint: "تظهر تلقائياً بعد ترحيل القيود. تتأكد أن الأصول = الخصوم + حقوق الملكية.", needsData: "journal" },
  "cash-flow": { title: "قائمة التدفقات النقدية", hint: "أدخل البنود يدوياً (تشغيلي، استثماري، تمويلي) أو استخدم القيم من القيود." },
  ratios: { title: "النسب المالية", hint: "تُحسب تلقائياً من الحسابات. سجّل قيود أولاً لرؤية أرقام حقيقية.", needsData: "journal" },
  "break-even": { title: "تحليل التعادل (CVP)", hint: "أدخل التكاليف والأسعار لمعرفة كم وحدة لازم تبيع لتغطي تكاليفك." },
  depreciation: { title: "حاسبة الإهلاك", hint: "احسب إهلاك الأصول الثابتة بالقسط الثابت أو المتناقص أو وحدات الإنتاج." },
  "bank-recon": { title: "التسوية البنكية", hint: "قارن رصيد كشف البنك برصيد دفاترك وعدّل الفروقات." },
  adjusting: { title: "قيود التسوية والإقفال", hint: "اختر قالباً جاهزاً (استحقاقات، تأجيلات، استهلاك) أو اكتب قيدك بنفسك." },
};

function AccountingLabInner({ onShare, pendingScenario, onClearScenario, subjectId }: AccountingLabProps) {
  const [activeTab, setActiveTab] = useState<LabTab>("equation");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(true);
  const tabBarRef = useRef<HTMLDivElement>(null);
  const { entries, loadDemoData, resetLab } = useLabContext();
  const hasData = entries.some(e => e.isPosted);

  const allTabs = TAB_GROUPS.flatMap(g => g.tabs);
  const activeGroup = TAB_GROUPS.find(g => g.tabs.some(t => t.id === activeTab));
  const currentHint = TAB_HINTS[activeTab];
  const flowIndex = FLOW_STEPS.findIndex(s => s.id === activeTab);

  const scrollToTab = (tabId: string) => {
    const el = tabBarRef.current?.querySelector(`[data-tab="${tabId}"]`);
    if (el) el.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  };

  const selectTab = (id: LabTab) => {
    setActiveTab(id);
    setSidebarOpen(false);
    setTimeout(() => scrollToTab(id), 50);
  };

  const renderTab = () => {
    switch (activeTab) {
      case "equation": return <EquationTab onShare={onShare} />;
      case "t-accounts": return <TAccountsTab onShare={onShare} />;
      case "journal": return <JournalEntriesTab onShare={onShare} />;
      case "cycle": return <AccountingCycleTab onShare={onShare} />;
      case "income-statement": return <IncomeStatementTab onShare={onShare} />;
      case "balance-sheet": return <BalanceSheetTab onShare={onShare} />;
      case "cash-flow": return <CashFlowTab onShare={onShare} />;
      case "ratios": return <RatioAnalysisTab onShare={onShare} />;
      case "break-even": return <BreakEvenTab onShare={onShare} />;
      case "depreciation": return <DepreciationTab onShare={onShare} />;
      case "bank-recon": return <BankReconciliationTab onShare={onShare} />;
      case "adjusting": return <AdjustingEntriesTab onShare={onShare} />;
      default: return null;
    }
  };

  return (
    <div className="flex h-full">
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`${sidebarOpen ? "translate-x-0" : "translate-x-full"} md:translate-x-0 fixed md:static right-0 top-0 bottom-0 z-50 w-56 bg-[#0d0d14] border-l border-white/5 overflow-y-auto transition-transform md:block shrink-0`}>
        <div className="p-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">مختبر المحاسبة</p>
              <p className="text-[9px] text-white/40">12 أداة تعليمية</p>
            </div>
          </div>
        </div>
        {TAB_GROUPS.map((group, gi) => (
          <div key={gi} className="p-2">
            <div className="flex items-center gap-1.5 px-2 py-1.5 text-[10px] font-bold text-amber-400/70">
              {group.icon}
              {group.label}
            </div>
            {group.tabs.map(tab => (
              <button key={tab.id} onClick={() => selectTab(tab.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all text-right ${activeTab === tab.id ? "bg-amber-500/15 text-amber-400 border border-amber-500/20" : "text-white/50 hover:text-white/80 hover:bg-white/5 border border-transparent"}`}>
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        ))}
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="md:hidden flex items-center gap-2 px-2 py-1.5 border-b border-white/5 bg-[#0d0d14]">
          <button onClick={() => setSidebarOpen(true)} className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-white">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div ref={tabBarRef} className="flex-1 flex gap-1 overflow-x-auto scrollbar-hide">
            {allTabs.map(tab => (
              <button key={tab.id} data-tab={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all whitespace-nowrap ${activeTab === tab.id ? "bg-amber-500/15 text-amber-400 border border-amber-500/20" : "text-white/40 bg-white/5 border border-white/10"}`}>
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
          {guideOpen && (
            <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-l from-amber-500/10 to-amber-600/5 p-3">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-amber-400">دليلك السريع داخل المختبر</p>
                    <p className="text-[10px] text-white/50">اتبع المسار، أو حمّل بيانات تجريبية لترى كل التبويبات تشتغل فوراً</p>
                  </div>
                </div>
                <button onClick={() => setGuideOpen(false)} className="text-white/40 hover:text-white/80 shrink-0" aria-label="إخفاء الدليل">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {FLOW_STEPS.map((s, i) => {
                  const isActive = activeTab === s.id;
                  const isPassed = flowIndex >= 0 && i < flowIndex;
                  return (
                    <button key={s.id} onClick={() => selectTab(s.id)}
                      className={`flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1.5 rounded-lg border transition-all ${
                        isActive ? "bg-amber-500/25 text-amber-300 border-amber-400/40" :
                        isPassed ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                        "bg-white/5 text-white/50 border-white/10 hover:text-white/80"
                      }`}>
                      {s.label}
                      <span className="text-[9px] opacity-70 hidden sm:inline">— {s.hint}</span>
                    </button>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={loadDemoData}
                  className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 transition-all">
                  <Sparkles className="w-3 h-3" /> {hasData ? "إضافة المزيد من البيانات التجريبية" : "تحميل بيانات تجريبية الآن"}
                </button>
                {hasData && (
                  <button onClick={() => { if (confirm("هل تريد إعادة تعيين كل بيانات المختبر؟")) resetLab(); }}
                    className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:text-red-400 hover:border-red-400/30 transition-all">
                    <RotateCcw className="w-3 h-3" /> إعادة تعيين
                  </button>
                )}
              </div>
            </div>
          )}

          {!guideOpen && (
            <button onClick={() => setGuideOpen(true)}
              className="flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/50 hover:text-amber-400 hover:border-amber-500/30 transition-all">
              <HelpCircle className="w-3 h-3" /> إظهار الدليل السريع
            </button>
          )}

          {currentHint && (
            <div className="rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2">
              <p className="text-[11px] font-bold text-white/80 mb-0.5">{currentHint.title}</p>
              <p className="text-[10px] text-white/50 leading-relaxed">{currentHint.hint}</p>
              {currentHint.needsData && !hasData && (
                <button onClick={() => selectTab(currentHint.needsData!)}
                  className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-md bg-blue-500/15 border border-blue-500/30 text-blue-300 hover:bg-blue-500/25 transition-all">
                  <ChevronLeft className="w-3 h-3" /> اذهب إلى تبويب القيود لتسجيل بيانات
                </button>
              )}
            </div>
          )}

          <Suspense fallback={<Loading />}>
            {renderTab()}
          </Suspense>
        </div>
      </div>

      {pendingScenario && onClearScenario && (
        <DynamicScenarioOverlay
          scenario={pendingScenario}
          subjectId={subjectId || "uni-accounting"}
          onClose={onClearScenario}
          onTaskJump={(t) => { if (allTabs.some(x => x.id === t)) setActiveTab(t as any); }}
          onShareWithTeacher={onShare}
        />
      )}
    </div>
  );
}

export default function AccountingLab({ onShare, pendingScenario, onClearScenario, subjectId }: AccountingLabProps) {
  return (
    <LabProvider>
      <AccountingLabInner
        onShare={onShare}
        pendingScenario={pendingScenario}
        onClearScenario={onClearScenario}
        subjectId={subjectId}
      />
    </LabProvider>
  );
}
