import { useState } from "react";
import {
  BookOpen, List, FileText, Package, CreditCard, Landmark,
  Building, Target, Users, FileBarChart, BarChart3, Clock,
  Gauge, PieChart, Lock, Globe, Receipt, Shield, Crosshair,
  RotateCcw, ChevronLeft, ChevronRight, Monitor,
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
  icon: React.ReactNode;
  level: 1 | 2 | 3;
}

interface TabGroup {
  label: string;
  color: string;
  tabs: TabDef[];
}

const TAB_GROUPS: TabGroup[] = [
  {
    label: "المستوى 1 — العمليات اليومية",
    color: "text-teal-400",
    tabs: [
      { id: "journal", label: "القيود", icon: <BookOpen className="w-3.5 h-3.5" />, level: 1 },
      { id: "accounts", label: "الحسابات", icon: <List className="w-3.5 h-3.5" />, level: 1 },
      { id: "invoices", label: "الفواتير", icon: <FileText className="w-3.5 h-3.5" />, level: 1 },
      { id: "inventory", label: "المخزون", icon: <Package className="w-3.5 h-3.5" />, level: 1 },
      { id: "cheques", label: "الشيكات", icon: <CreditCard className="w-3.5 h-3.5" />, level: 1 },
      { id: "fixed-assets", label: "أصول ثابتة", icon: <Landmark className="w-3.5 h-3.5" />, level: 1 },
      { id: "bank-reconciliation", label: "تسوية بنكية", icon: <Building className="w-3.5 h-3.5" />, level: 1 },
      { id: "cost-centers", label: "مراكز تكلفة", icon: <Target className="w-3.5 h-3.5" />, level: 1 },
      { id: "payroll", label: "الرواتب", icon: <Users className="w-3.5 h-3.5" />, level: 1 },
    ],
  },
  {
    label: "المستوى 2 — التقارير والتحليل",
    color: "text-blue-400",
    tabs: [
      { id: "financial-statements", label: "القوائم المالية", icon: <FileBarChart className="w-3.5 h-3.5" />, level: 2 },
      { id: "trial-balance", label: "ميزان المراجعة", icon: <BarChart3 className="w-3.5 h-3.5" />, level: 2 },
      { id: "aging", label: "تقادم الذمم", icon: <Clock className="w-3.5 h-3.5" />, level: 2 },
      { id: "financial-ratios", label: "النسب المالية", icon: <Gauge className="w-3.5 h-3.5" />, level: 2 },
      { id: "break-even", label: "نقطة التعادل", icon: <Crosshair className="w-3.5 h-3.5" />, level: 2 },
    ],
  },
  {
    label: "المستوى 3 — الإدارة المتقدمة",
    color: "text-purple-400",
    tabs: [
      { id: "budgeting", label: "الموازنات", icon: <PieChart className="w-3.5 h-3.5" />, level: 3 },
      { id: "closing", label: "الإقفال", icon: <Lock className="w-3.5 h-3.5" />, level: 3 },
      { id: "multi-currency", label: "العملات", icon: <Globe className="w-3.5 h-3.5" />, level: 3 },
      { id: "vat", label: "الضريبة", icon: <Receipt className="w-3.5 h-3.5" />, level: 3 },
      { id: "audit-trail", label: "سجل التدقيق", icon: <Shield className="w-3.5 h-3.5" />, level: 3 },
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
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const ActiveComponent = TAB_COMPONENTS[activeTab];
  const activeTabDef = ALL_TABS.find(t => t.id === activeTab);

  const currentIndex = ALL_TABS.findIndex(t => t.id === activeTab);
  const prevTab = currentIndex > 0 ? ALL_TABS[currentIndex - 1] : null;
  const nextTab = currentIndex < ALL_TABS.length - 1 ? ALL_TABS[currentIndex + 1] : null;

  return (
    <SimulatorProvider onShareWithTeacher={onShareWithTeacher}>
      <div className="rounded-2xl border border-white/10 bg-[#13131f] overflow-hidden" style={{ direction: "rtl" }}>
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10 bg-gradient-to-r from-teal-500/10 via-transparent to-transparent">
          <div className="flex items-center gap-2">
            <Monitor className="w-5 h-5 text-teal-400" />
            <h2 className="text-sm font-bold text-white">YemenSoft — بيئة المحاسبة المهنية</h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-400 font-bold">19 وحدة</span>
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-[11px] text-[#6e6a86] hover:text-white transition-colors sm:hidden"
          >
            {sidebarOpen ? "إخفاء القائمة" : "إظهار القائمة"}
          </button>
        </div>

        <div className="flex" style={{ minHeight: "500px" }}>
          <div className={`border-l border-white/5 bg-[#16162a] transition-all overflow-y-auto ${sidebarOpen ? "w-48 sm:w-52" : "w-0 overflow-hidden"}`} style={{ maxHeight: "calc(100vh - 200px)" }}>
            <div className="p-2 space-y-3">
              {TAB_GROUPS.map(group => (
                <div key={group.label}>
                  <div className={`text-[10px] font-bold ${group.color} px-2 py-1.5 mb-1`}>{group.label}</div>
                  {group.tabs.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => { setActiveTab(tab.id); if (window.innerWidth < 640) setSidebarOpen(false); }}
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

          <div className="flex-1 overflow-y-auto" style={{ maxHeight: "calc(100vh - 200px)" }}>
            <ActiveComponent />

            <div className="flex items-center justify-between px-4 py-3 border-t border-white/5 bg-white/[0.02]">
              {prevTab ? (
                <button onClick={() => setActiveTab(prevTab.id)} className="flex items-center gap-1 text-[11px] text-[#a6adc8] hover:text-teal-400 transition-colors">
                  <ChevronRight className="w-3.5 h-3.5" /> {prevTab.label}
                </button>
              ) : <div />}
              <span className="text-[10px] text-[#6e6a86]">{currentIndex + 1} / {ALL_TABS.length}</span>
              {nextTab ? (
                <button onClick={() => setActiveTab(nextTab.id)} className="flex items-center gap-1 text-[11px] text-[#a6adc8] hover:text-teal-400 transition-colors">
                  {nextTab.label} <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              ) : <div />}
            </div>
          </div>
        </div>
      </div>
    </SimulatorProvider>
  );
}
