import { useState, lazy, Suspense, useRef } from "react";
import { LabProvider } from "./context";
import type { LabTab, TabGroup } from "./types";
import { Scale, BookOpen, FileText, TrendingUp, Calculator, ChevronRight, ChevronLeft, ArrowLeftRight, GraduationCap } from "lucide-react";

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

function AccountingLabInner({ onShare }: { onShare: (data: string) => void }) {
  const [activeTab, setActiveTab] = useState<LabTab>("equation");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const tabBarRef = useRef<HTMLDivElement>(null);

  const allTabs = TAB_GROUPS.flatMap(g => g.tabs);
  const activeGroup = TAB_GROUPS.find(g => g.tabs.some(t => t.id === activeTab));

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

        <div className="flex-1 overflow-y-auto p-3 sm:p-4">
          <Suspense fallback={<Loading />}>
            {renderTab()}
          </Suspense>
        </div>
      </div>
    </div>
  );
}

export default function AccountingLab({ onShare }: { onShare: (data: string) => void }) {
  return (
    <LabProvider>
      <AccountingLabInner onShare={onShare} />
    </LabProvider>
  );
}
