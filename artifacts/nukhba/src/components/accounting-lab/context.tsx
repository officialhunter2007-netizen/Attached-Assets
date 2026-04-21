import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { TAccount, LabJournalEntry, DepreciationAsset, BankReconciliationItem, AdjustingEntry, CycleStep } from "./types";

const DEFAULT_ACCOUNTS: TAccount[] = [
  { code: "101", name: "الصندوق (النقدية)", type: "asset", debits: [{ amount: 100000, desc: "رأس المال" }], credits: [] },
  { code: "102", name: "البنك", type: "asset", debits: [{ amount: 200000, desc: "رأس المال" }], credits: [] },
  { code: "103", name: "المدينون", type: "asset", debits: [], credits: [] },
  { code: "104", name: "المخزون", type: "asset", debits: [{ amount: 50000, desc: "بضاعة أول المدة" }], credits: [] },
  { code: "105", name: "لوازم مكتبية", type: "asset", debits: [{ amount: 5000, desc: "شراء لوازم" }], credits: [] },
  { code: "106", name: "تأمين مدفوع مقدماً", type: "asset", debits: [{ amount: 12000, desc: "تأمين سنوي" }], credits: [] },
  { code: "107", name: "إيجار مدفوع مقدماً", type: "asset", debits: [], credits: [] },
  { code: "110", name: "أصول ثابتة - معدات", type: "asset", debits: [{ amount: 80000, desc: "شراء معدات" }], credits: [] },
  { code: "111", name: "مجمع استهلاك المعدات", type: "asset", debits: [], credits: [] },
  { code: "201", name: "الدائنون", type: "liability", debits: [], credits: [] },
  { code: "202", name: "قروض قصيرة الأجل", type: "liability", debits: [], credits: [] },
  { code: "203", name: "إيرادات مقبوضة مقدماً", type: "liability", debits: [], credits: [] },
  { code: "204", name: "رواتب مستحقة", type: "liability", debits: [], credits: [] },
  { code: "301", name: "رأس المال", type: "equity", debits: [], credits: [{ amount: 447000, desc: "رأس مال المؤسس" }] },
  { code: "302", name: "أرباح مبقاة", type: "equity", debits: [], credits: [] },
  { code: "303", name: "ملخص الدخل", type: "equity", debits: [], credits: [] },
  { code: "401", name: "إيرادات المبيعات", type: "revenue", debits: [], credits: [] },
  { code: "402", name: "إيرادات خدمات", type: "revenue", debits: [], credits: [] },
  { code: "501", name: "تكلفة البضاعة المباعة", type: "expense", debits: [], credits: [] },
  { code: "502", name: "مصروف الرواتب", type: "expense", debits: [], credits: [] },
  { code: "503", name: "مصروف الإيجار", type: "expense", debits: [], credits: [] },
  { code: "504", name: "مصروف الكهرباء", type: "expense", debits: [], credits: [] },
  { code: "505", name: "مصروف اللوازم", type: "expense", debits: [], credits: [] },
  { code: "506", name: "مصروف الاستهلاك", type: "expense", debits: [], credits: [] },
  { code: "507", name: "مصروف التأمين", type: "expense", debits: [], credits: [] },
];

const DEFAULT_CYCLE_STEPS: CycleStep[] = [
  { id: 1, name: "تحليل العمليات", description: "تحليل العمليات المالية وتحديد الحسابات المتأثرة", isComplete: false },
  { id: 2, name: "القيود اليومية", description: "تسجيل القيود في دفتر اليومية", isComplete: false },
  { id: 3, name: "الترحيل لدفتر الأستاذ", description: "ترحيل القيود إلى حسابات T", isComplete: false },
  { id: 4, name: "ميزان المراجعة (قبل التسوية)", description: "إعداد ميزان المراجعة للتحقق من التوازن", isComplete: false },
  { id: 5, name: "قيود التسوية", description: "إعداد قيود التسوية لنهاية الفترة", isComplete: false },
  { id: 6, name: "ميزان المراجعة المعدّل", description: "إعداد ميزان المراجعة بعد التسويات", isComplete: false },
  { id: 7, name: "القوائم المالية", description: "إعداد قائمة الدخل والميزانية", isComplete: false },
  { id: 8, name: "قيود الإقفال", description: "إقفال الحسابات المؤقتة", isComplete: false },
  { id: 9, name: "ميزان المراجعة بعد الإقفال", description: "التأكد من صحة الإقفال", isComplete: false },
];

const DEFAULT_BANK_ITEMS: BankReconciliationItem[] = [
  { id: 1, description: "إيداع نقدي", amount: 50000, type: "deposit", inBank: true, inBooks: true },
  { id: 2, description: "شيك رقم 1001 - إيجار", amount: 15000, type: "withdrawal", inBank: true, inBooks: true },
  { id: 3, description: "تحويل من عميل أحمد", amount: 30000, type: "deposit", inBank: true, inBooks: false },
  { id: 4, description: "شيك رقم 1005 - مورد", amount: 22000, type: "withdrawal", inBank: false, inBooks: true },
  { id: 5, description: "عمولة بنكية", amount: 500, type: "withdrawal", inBank: true, inBooks: false },
  { id: 6, description: "فوائد بنكية مكتسبة", amount: 1200, type: "deposit", inBank: true, inBooks: false },
  { id: 7, description: "شيك رقم 1003 - كهرباء", amount: 8000, type: "withdrawal", inBank: true, inBooks: true },
];

export interface LabState {
  tAccounts: TAccount[];
  setTAccounts: (accs: TAccount[]) => void;
  entries: LabJournalEntry[];
  setEntries: (fn: (prev: LabJournalEntry[]) => LabJournalEntry[]) => void;
  depAssets: DepreciationAsset[];
  setDepAssets: (fn: (prev: DepreciationAsset[]) => DepreciationAsset[]) => void;
  bankItems: BankReconciliationItem[];
  setBankItems: (items: BankReconciliationItem[]) => void;
  adjustingEntries: AdjustingEntry[];
  setAdjustingEntries: (fn: (prev: AdjustingEntry[]) => AdjustingEntry[]) => void;
  cycleSteps: CycleStep[];
  setCycleSteps: (steps: CycleStep[]) => void;
  auditLog: (action: string) => void;
  logs: string[];
  getAccountBalance: (code: string) => number;
  postEntryToTAccounts: (entry: LabJournalEntry) => void;
  loadDemoData: () => void;
  resetLab: () => void;
}

const LabContext = createContext<LabState | null>(null);

export function useLabContext() {
  const ctx = useContext(LabContext);
  if (!ctx) throw new Error("useLabContext must be within LabProvider");
  return ctx;
}

export function LabProvider({ children }: { children: ReactNode }) {
  const [tAccounts, setTAccounts] = useState<TAccount[]>(DEFAULT_ACCOUNTS);
  const [entries, setEntries] = useState<LabJournalEntry[]>([]);
  const [depAssets, setDepAssets] = useState<DepreciationAsset[]>([
    { id: 1, name: "سيارة نقل", cost: 120000, salvageValue: 20000, usefulLife: 5, method: "straight-line" },
    { id: 2, name: "معدات مكتبية", cost: 80000, salvageValue: 5000, usefulLife: 10, method: "declining" },
  ]);
  const [bankItems, setBankItems] = useState<BankReconciliationItem[]>(DEFAULT_BANK_ITEMS);
  const [adjustingEntries, setAdjustingEntries] = useState<AdjustingEntry[]>([]);
  const [cycleSteps, setCycleSteps] = useState<CycleStep[]>(DEFAULT_CYCLE_STEPS);
  const [logs, setLogs] = useState<string[]>([]);

  const auditLog = useCallback((action: string) => {
    setLogs(prev => [`${new Date().toLocaleTimeString("ar-YE")} — ${action}`, ...prev].slice(0, 50));
  }, []);

  const getAccountBalance = useCallback((code: string) => {
    const acc = tAccounts.find(a => a.code === code);
    if (!acc) return 0;
    const totalDebits = acc.debits.reduce((s, d) => s + d.amount, 0);
    const totalCredits = acc.credits.reduce((s, c) => s + c.amount, 0);
    if (acc.type === "asset" || acc.type === "expense") return totalDebits - totalCredits;
    return totalCredits - totalDebits;
  }, [tAccounts]);

  const postEntryToTAccounts = useCallback((entry: LabJournalEntry) => {
    setTAccounts(prev => {
      const next = prev.map(a => ({ ...a, debits: [...a.debits], credits: [...a.credits] }));
      for (const line of entry.lines) {
        const acc = next.find(a => a.code === line.accountCode);
        if (!acc) continue;
        if (line.debit > 0) acc.debits.push({ amount: line.debit, desc: entry.description });
        if (line.credit > 0) acc.credits.push({ amount: line.credit, desc: entry.description });
      }
      return next;
    });
    setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, isPosted: true } : e));
    auditLog(`ترحيل قيد #${entry.id} إلى حسابات T`);
  }, [auditLog]);

  const loadDemoData = useCallback(() => {
    const today = new Date().toISOString().slice(0, 10);
    const demo: LabJournalEntry[] = [
      {
        id: Date.now(),
        date: today,
        description: "بيع بضاعة نقداً",
        lines: [
          { accountCode: "101", accountName: "الصندوق (النقدية)", debit: 80000, credit: 0 },
          { accountCode: "401", accountName: "إيرادات المبيعات", debit: 0, credit: 80000 },
        ],
        isPosted: false,
      },
      {
        id: Date.now() + 1,
        date: today,
        description: "تكلفة البضاعة المباعة",
        lines: [
          { accountCode: "501", accountName: "تكلفة البضاعة المباعة", debit: 35000, credit: 0 },
          { accountCode: "104", accountName: "المخزون", debit: 0, credit: 35000 },
        ],
        isPosted: false,
      },
      {
        id: Date.now() + 2,
        date: today,
        description: "دفع رواتب الموظفين",
        lines: [
          { accountCode: "502", accountName: "مصروف الرواتب", debit: 18000, credit: 0 },
          { accountCode: "102", accountName: "البنك", debit: 0, credit: 18000 },
        ],
        isPosted: false,
      },
      {
        id: Date.now() + 3,
        date: today,
        description: "دفع إيجار الشهر",
        lines: [
          { accountCode: "503", accountName: "مصروف الإيجار", debit: 7000, credit: 0 },
          { accountCode: "102", accountName: "البنك", debit: 0, credit: 7000 },
        ],
        isPosted: false,
      },
      {
        id: Date.now() + 4,
        date: today,
        description: "تقديم خدمات بالأجل",
        lines: [
          { accountCode: "103", accountName: "المدينون", debit: 25000, credit: 0 },
          { accountCode: "402", accountName: "إيرادات خدمات", debit: 0, credit: 25000 },
        ],
        isPosted: false,
      },
    ];
    // Apply directly: post each demo entry to T accounts and mark as posted.
    setTAccounts(prev => {
      const next = prev.map(a => ({ ...a, debits: [...a.debits], credits: [...a.credits] }));
      for (const entry of demo) {
        for (const line of entry.lines) {
          const acc = next.find(a => a.code === line.accountCode);
          if (!acc) continue;
          if (line.debit > 0) acc.debits.push({ amount: line.debit, desc: entry.description });
          if (line.credit > 0) acc.credits.push({ amount: line.credit, desc: entry.description });
        }
      }
      return next;
    });
    setEntries(prev => [...prev, ...demo.map(e => ({ ...e, isPosted: true }))]);
    auditLog(`تحميل بيانات تجريبية: ${demo.length} قيود مُرحّلة`);
  }, [auditLog]);

  const resetLab = useCallback(() => {
    setTAccounts(DEFAULT_ACCOUNTS);
    setEntries([]);
    setBankItems(DEFAULT_BANK_ITEMS);
    setAdjustingEntries([]);
    setCycleSteps(DEFAULT_CYCLE_STEPS);
    auditLog("إعادة تعيين المختبر");
  }, [auditLog]);

  return (
    <LabContext.Provider value={{
      tAccounts, setTAccounts,
      entries, setEntries,
      depAssets, setDepAssets,
      bankItems, setBankItems,
      adjustingEntries, setAdjustingEntries,
      cycleSteps, setCycleSteps,
      auditLog, logs,
      getAccountBalance, postEntryToTAccounts,
      loadDemoData, resetLab,
    }}>
      {children}
    </LabContext.Provider>
  );
}
