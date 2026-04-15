import { useState, useRef, useEffect } from "react";
import {
  BookOpen, List, FileText, Package, CreditCard, Landmark,
  Building, Target, Users, FileBarChart, BarChart3, Clock,
  Gauge, PieChart, Lock, Globe, Receipt, Shield, Crosshair,
  ChevronLeft, ChevronRight, Monitor, Menu, X,
} from "lucide-react";
import { SimulatorProvider } from "./context";
import type { SimTab } from "./types";
import { JournalTab } from "./tabs/journal";
import { AccountsTab } from "./tabs/accounts";
import { InvoicesTab } from "./tabs/invoices";
import { InventoryTab } from "./tabs/inventory";
import { ChequesTab } from "./tabs/cheques";
import { FixedAssetsTab } from "./tabs/fixed-assets";
import { BankReconciliationTab } from "./tabs/bank-reconciliation";
import { CostCentersTab } from "./tabs/cost-centers";
import { PayrollTab } from "./tabs/payroll";
import { FinancialStatementsTab } from "./tabs/financial-statements";
import { TrialBalanceTab } from "./tabs/trial-balance";
import { AgingTab } from "./tabs/aging";
import { FinancialRatiosTab } from "./tabs/financial-ratios";
import { BudgetingTab } from "./tabs/budgeting";
import { ClosingTab } from "./tabs/closing";
import { MultiCurrencyTab } from "./tabs/multi-currency";
import { VatTab } from "./tabs/vat";
import { AuditTrailTab } from "./tabs/audit-trail";
import { BreakEvenTab } from "./tabs/break-even";

interface TabDef {
  id: SimTab;
  label: string;
  shortLabel: string;
  icon: React.ReactNode;
  level: 1 | 2 | 3;
}

interface TabGroup {
  label: string;
  shortLabel: string;
  color: string;
  borderColor: string;
  tabs: TabDef[];
}

const TAB_GROUPS: TabGroup[] = [
  {
    label: "المستوى 1 — العمليات اليومية",
    shortLabel: "العمليات",
    color: "text-teal-400",
    borderColor: "border-teal-500/30",
    tabs: [
      { id: "journal", label: "القيود", shortLabel: "القيود", icon: <BookOpen className="w-3.5 h-3.5" />, level: 1 },
      { id: "accounts", label: "الحسابات", shortLabel: "الحسابات", icon: <List className="w-3.5 h-3.5" />, level: 1 },
      { id: "invoices", label: "الفواتير", shortLabel: "الفواتير", icon: <FileText className="w-3.5 h-3.5" />, level: 1 },
      { id: "inventory", label: "المخزون", shortLabel: "المخزون", icon: <Package className="w-3.5 h-3.5" />, level: 1 },
      { id: "cheques", label: "الشيكات", shortLabel: "الشيكات", icon: <CreditCard className="w-3.5 h-3.5" />, level: 1 },
      { id: "fixed-assets", label: "أصول ثابتة", shortLabel: "أصول", icon: <Landmark className="w-3.5 h-3.5" />, level: 1 },
      { id: "bank-reconciliation", label: "تسوية بنكية", shortLabel: "تسوية", icon: <Building className="w-3.5 h-3.5" />, level: 1 },
      { id: "cost-centers", label: "مراكز تكلفة", shortLabel: "تكلفة", icon: <Target className="w-3.5 h-3.5" />, level: 1 },
      { id: "payroll", label: "الرواتب", shortLabel: "الرواتب", icon: <Users className="w-3.5 h-3.5" />, level: 1 },
    ],
  },
  {
    label: "المستوى 2 — التقارير والتحليل",
    shortLabel: "التقارير",
    color: "text-blue-400",
    borderColor: "border-blue-500/30",
    tabs: [
      { id: "financial-statements", label: "القوائم المالية", shortLabel: "القوائم", icon: <FileBarChart className="w-3.5 h-3.5" />, level: 2 },
      { id: "trial-balance", label: "ميزان المراجعة", shortLabel: "الميزان", icon: <BarChart3 className="w-3.5 h-3.5" />, level: 2 },
      { id: "aging", label: "تقادم الذمم", shortLabel: "الذمم", icon: <Clock className="w-3.5 h-3.5" />, level: 2 },
      { id: "financial-ratios", label: "النسب المالية", shortLabel: "النسب", icon: <Gauge className="w-3.5 h-3.5" />, level: 2 },
      { id: "break-even", label: "نقطة التعادل", shortLabel: "التعادل", icon: <Crosshair className="w-3.5 h-3.5" />, level: 2 },
    ],
  },
  {
    label: "المستوى 3 — الإدارة المتقدمة",
    shortLabel: "المتقدم",
    color: "text-purple-400",
    borderColor: "border-purple-500/30",
    tabs: [
      { id: "budgeting", label: "الموازنات", shortLabel: "الموازنة", icon: <PieChart className="w-3.5 h-3.5" />, level: 3 },
      { id: "closing", label: "الإقفال", shortLabel: "الإقفال", icon: <Lock className="w-3.5 h-3.5" />, level: 3 },
      { id: "multi-currency", label: "العملات", shortLabel: "العملات", icon: <Globe className="w-3.5 h-3.5" />, level: 3 },
      { id: "vat", label: "الضريبة", shortLabel: "الضريبة", icon: <Receipt className="w-3.5 h-3.5" />, level: 3 },
      { id: "audit-trail", label: "سجل التدقيق", shortLabel: "التدقيق", icon: <Shield className="w-3.5 h-3.5" />, level: 3 },
    ],
  },
];

const ALL_TABS = TAB_GROUPS.flatMap(g => g.tabs);

const TAB_COMPONENTS: Record<SimTab, React.FC> = {
  "journal": JournalTab,
  "accounts": AccountsTab,
  "invoices": InvoicesTab,
  "inventory": InventoryTab,
  "cheques": ChequesTab,
  "fixed-assets": FixedAssetsTab,
  "bank-reconciliation": BankReconciliationTab,
  "cost-centers": CostCentersTab,
  "payroll": PayrollTab,
  "financial-statements": FinancialStatementsTab,
  "trial-balance": TrialBalanceTab,
  "aging": AgingTab,
  "financial-ratios": FinancialRatiosTab,
  "budgeting": BudgetingTab,
  "closing": ClosingTab,
  "multi-currency": MultiCurrencyTab,
  "vat": VatTab,
  "audit-trail": AuditTrailTab,
  "break-even": BreakEvenTab,
};

interface YemenSoftV2Props {
  onShareWithTeacher?: (content: string) => void;
}

export function YemenSoftSimulatorV2({ onShareWithTeacher }: YemenSoftV2Props) {
  const [activeTab, setActiveTab] = useState<SimTab>("journal");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const tabBarRef = useRef<HTMLDivElement>(null);

  const ActiveComponent = TAB_COMPONENTS[activeTab];
  const activeTabDef = ALL_TABS.find(t => t.id === activeTab);
  const activeGroup = TAB_GROUPS.find(g => g.tabs.some(t => t.id === activeTab));

  const currentIndex = ALL_TABS.findIndex(t => t.id === activeTab);
  const prevTab = currentIndex > 0 ? ALL_TABS[currentIndex - 1] : null;
  const nextTab = currentIndex < ALL_TABS.length - 1 ? ALL_TABS[currentIndex + 1] : null;

  useEffect(() => {
    if (tabBarRef.current) {
      const activeBtn = tabBarRef.current.querySelector(`[data-tab="${activeTab}"]`) as HTMLElement;
      if (activeBtn) {
        activeBtn.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      }
    }
  }, [activeTab]);

  const selectTab = (id: SimTab) => {
    setActiveTab(id);
    setMobileMenuOpen(false);
  };

  return (
    <SimulatorProvider onShareWithTeacher={onShareWithTeacher}>
      <div className="rounded-2xl sm:rounded-2xl border border-white/10 bg-[#13131f] overflow-hidden" style={{ direction: "rtl" }}>
        <div className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-2.5 border-b border-white/10 bg-gradient-to-r from-teal-500/10 via-transparent to-transparent gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Monitor className="w-4 h-4 sm:w-5 sm:h-5 text-teal-400 shrink-0" />
            <h2 className="text-xs sm:text-sm font-bold text-white truncate">YemenSoft</h2>
            <span className="hidden sm:inline text-xs text-[#6e6a86]">— بيئة المحاسبة المهنية</span>
            <span className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-400 font-bold shrink-0">19</span>
          </div>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="sm:hidden text-[#6e6a86] hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="sm:hidden border-b border-white/10 bg-[#16162a] max-h-[60vh] overflow-y-auto">
            <div className="p-3 space-y-3">
              {TAB_GROUPS.map(group => (
                <div key={group.label}>
                  <div className={`text-[10px] font-bold ${group.color} px-1 py-1 mb-1`}>{group.label}</div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {group.tabs.map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => selectTab(tab.id)}
                        className={`flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl text-[11px] transition-all ${activeTab === tab.id ? "bg-teal-500/15 text-teal-400 font-bold border border-teal-500/30" : "text-[#a6adc8] hover:bg-white/5 border border-transparent"}`}
                      >
                        {tab.icon}
                        <span className="truncate w-full text-center">{tab.shortLabel}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div
          ref={tabBarRef}
          className="sm:hidden flex items-center gap-1 px-2 py-1.5 border-b border-white/5 overflow-x-auto scrollbar-hide"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {TAB_GROUPS.map((group, gi) => (
            <div key={group.label} className="flex items-center gap-1 shrink-0">
              {gi > 0 && <div className="w-px h-5 bg-white/10 mx-1 shrink-0" />}
              {group.tabs.map(tab => (
                <button
                  key={tab.id}
                  data-tab={tab.id}
                  onClick={() => selectTab(tab.id)}
                  className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap shrink-0 transition-all ${activeTab === tab.id ? `bg-teal-500/15 text-teal-400 border border-teal-500/30` : "text-[#6e6a86] hover:text-[#a6adc8] border border-transparent"}`}
                >
                  {tab.icon}
                  {tab.shortLabel}
                </button>
              ))}
            </div>
          ))}
        </div>

        <div className="flex">
          <div className="hidden sm:block border-l border-white/5 bg-[#16162a] w-52 overflow-y-auto" style={{ maxHeight: "calc(100vh - 200px)" }}>
            <div className="p-2 space-y-3">
              {TAB_GROUPS.map(group => (
                <div key={group.label}>
                  <div className={`text-[10px] font-bold ${group.color} px-2 py-1.5 mb-1`}>{group.label}</div>
                  {group.tabs.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => selectTab(tab.id)}
                      className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs transition-all ${activeTab === tab.id ? "bg-teal-500/10 text-teal-400 font-bold border border-teal-500/20" : "text-[#a6adc8] hover:bg-white/5 hover:text-white border border-transparent"}`}
                    >
                      {tab.icon}
                      <span className="truncate">{tab.label}</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden" style={{ maxHeight: "calc(100vh - 200px)" }}>
            <ActiveComponent />

            <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 border-t border-white/5 bg-white/[0.02]">
              {prevTab ? (
                <button onClick={() => selectTab(prevTab.id)} className="flex items-center gap-1 text-[10px] sm:text-[11px] text-[#a6adc8] hover:text-teal-400 transition-colors min-w-0">
                  <ChevronRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                  <span className="truncate max-w-[80px] sm:max-w-none">{prevTab.shortLabel}</span>
                </button>
              ) : <div />}
              <span className="text-[10px] text-[#6e6a86] shrink-0 px-2">{currentIndex + 1} / {ALL_TABS.length}</span>
              {nextTab ? (
                <button onClick={() => selectTab(nextTab.id)} className="flex items-center gap-1 text-[10px] sm:text-[11px] text-[#a6adc8] hover:text-teal-400 transition-colors min-w-0">
                  <span className="truncate max-w-[80px] sm:max-w-none">{nextTab.shortLabel}</span>
                  <ChevronLeft className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                </button>
              ) : <div />}
            </div>
          </div>
        </div>
      </div>
    </SimulatorProvider>
  );
}
