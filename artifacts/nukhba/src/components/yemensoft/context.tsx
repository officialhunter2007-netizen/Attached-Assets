import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type {
  Account, JournalEntry, JournalLine, Invoice, InventoryItem, InventoryMovement,
  Cheque, FixedAsset, BankStatementLine, CostCenter, Employee, PayrollRun,
  Currency, ForexTransaction, BudgetLine, VATReturn, AuditEntry
} from "./types";
import { todayStr, nowStr } from "./utils";

const DEFAULT_ACCOUNTS: Account[] = [
  { code: "1000", name: "الأصول", type: "asset", balance: 0 },
  { code: "1100", name: "الصندوق", type: "asset", parent: "1000", balance: 50000 },
  { code: "1200", name: "البنك", type: "asset", parent: "1000", balance: 200000 },
  { code: "1300", name: "المدينون (ذمم العملاء)", type: "asset", parent: "1000", balance: 0 },
  { code: "1400", name: "المخزون", type: "asset", parent: "1000", balance: 0 },
  { code: "1500", name: "أصول ثابتة", type: "asset", parent: "1000", balance: 0 },
  { code: "1510", name: "مجمع الاستهلاك", type: "asset", parent: "1000", balance: 0 },
  { code: "1600", name: "أوراق قبض (شيكات)", type: "asset", parent: "1000", balance: 0 },
  { code: "1150", name: "عملات أجنبية", type: "asset", parent: "1000", balance: 0 },
  { code: "1700", name: "ضريبة مدخلات (VAT)", type: "asset", parent: "1000", balance: 0 },
  { code: "2000", name: "الخصوم", type: "liability", balance: 0 },
  { code: "2100", name: "الدائنون (ذمم الموردين)", type: "liability", parent: "2000", balance: 0 },
  { code: "2200", name: "قروض قصيرة الأجل", type: "liability", parent: "2000", balance: 0 },
  { code: "2300", name: "مصاريف مستحقة", type: "liability", parent: "2000", balance: 0 },
  { code: "2400", name: "أوراق دفع (شيكات)", type: "liability", parent: "2000", balance: 0 },
  { code: "2500", name: "رواتب مستحقة", type: "liability", parent: "2000", balance: 0 },
  { code: "2600", name: "ضريبة مخرجات (VAT)", type: "liability", parent: "2000", balance: 0 },
  { code: "2700", name: "تأمينات اجتماعية مستحقة", type: "liability", parent: "2000", balance: 0 },
  { code: "3000", name: "حقوق الملكية", type: "equity", balance: 0 },
  { code: "3100", name: "رأس المال", type: "equity", parent: "3000", balance: 250000 },
  { code: "3200", name: "أرباح مبقاة", type: "equity", parent: "3000", balance: 0 },
  { code: "3300", name: "ملخص الدخل", type: "equity", parent: "3000", balance: 0 },
  { code: "4000", name: "الإيرادات", type: "revenue", balance: 0 },
  { code: "4100", name: "إيرادات المبيعات", type: "revenue", parent: "4000", balance: 0 },
  { code: "4200", name: "إيرادات خدمات", type: "revenue", parent: "4000", balance: 0 },
  { code: "4300", name: "أرباح فروقات عملة", type: "revenue", parent: "4000", balance: 0 },
  { code: "5000", name: "المصروفات", type: "expense", balance: 0 },
  { code: "5100", name: "تكلفة البضاعة المباعة", type: "expense", parent: "5000", balance: 0 },
  { code: "5200", name: "رواتب وأجور", type: "expense", parent: "5000", balance: 0 },
  { code: "5300", name: "إيجارات", type: "expense", parent: "5000", balance: 0 },
  { code: "5400", name: "مصاريف إدارية وعمومية", type: "expense", parent: "5000", balance: 0 },
  { code: "5500", name: "مصاريف نقل", type: "expense", parent: "5000", balance: 0 },
  { code: "5600", name: "مصروف استهلاك", type: "expense", parent: "5000", balance: 0 },
  { code: "5700", name: "خسائر فروقات عملة", type: "expense", parent: "5000", balance: 0 },
  { code: "5800", name: "تأمينات اجتماعية", type: "expense", parent: "5000", balance: 0 },
  { code: "5900", name: "بدل سكن", type: "expense", parent: "5000", balance: 0 },
  { code: "5950", name: "بدل مواصلات", type: "expense", parent: "5000", balance: 0 },
];

const DEFAULT_INVENTORY: InventoryItem[] = [
  { code: "ITM001", name: "لابتوب Dell", unit: "جهاز", qty: 10, avgCost: 150000, category: "إلكترونيات" },
  { code: "ITM002", name: "طابعة HP", unit: "جهاز", qty: 5, avgCost: 45000, category: "إلكترونيات" },
  { code: "ITM003", name: "ورق A4", unit: "رزمة", qty: 100, avgCost: 1500, category: "قرطاسية" },
  { code: "ITM004", name: "حبر طابعة", unit: "علبة", qty: 20, avgCost: 5000, category: "قرطاسية" },
];

const DEFAULT_CURRENCIES: Currency[] = [
  { code: "YER", name: "ريال يمني", rate: 1 },
  { code: "USD", name: "دولار أمريكي", rate: 530 },
  { code: "SAR", name: "ريال سعودي", rate: 141 },
  { code: "AED", name: "درهم إماراتي", rate: 144 },
  { code: "EUR", name: "يورو", rate: 580 },
];

const DEFAULT_COST_CENTERS: CostCenter[] = [
  { code: "CC01", name: "الإدارة العامة", budget: 500000, actual: 0 },
  { code: "CC02", name: "المبيعات", budget: 300000, actual: 0 },
  { code: "CC03", name: "المشتريات", budget: 200000, actual: 0 },
  { code: "CC04", name: "تقنية المعلومات", budget: 150000, actual: 0 },
];

export interface SimulatorState {
  accounts: Account[];
  setAccounts: (accs: Account[]) => void;
  entries: JournalEntry[];
  setEntries: (fn: (prev: JournalEntry[]) => JournalEntry[]) => void;
  invoices: Invoice[];
  setInvoices: (fn: (prev: Invoice[]) => Invoice[]) => void;
  inventory: InventoryItem[];
  setInventory: (fn: (prev: InventoryItem[]) => InventoryItem[]) => void;
  movements: InventoryMovement[];
  setMovements: (fn: (prev: InventoryMovement[]) => InventoryMovement[]) => void;
  cheques: Cheque[];
  setCheques: (fn: (prev: Cheque[]) => Cheque[]) => void;
  fixedAssets: FixedAsset[];
  setFixedAssets: (fn: (prev: FixedAsset[]) => FixedAsset[]) => void;
  bankLines: BankStatementLine[];
  setBankLines: (fn: (prev: BankStatementLine[]) => BankStatementLine[]) => void;
  costCenters: CostCenter[];
  setCostCenters: (fn: (prev: CostCenter[]) => CostCenter[]) => void;
  employees: Employee[];
  setEmployees: (fn: (prev: Employee[]) => Employee[]) => void;
  payrollRuns: PayrollRun[];
  setPayrollRuns: (fn: (prev: PayrollRun[]) => PayrollRun[]) => void;
  currencies: Currency[];
  setCurrencies: (fn: (prev: Currency[]) => Currency[]) => void;
  forexTransactions: ForexTransaction[];
  setForexTransactions: (fn: (prev: ForexTransaction[]) => ForexTransaction[]) => void;
  budgetLines: BudgetLine[];
  setBudgetLines: (fn: (prev: BudgetLine[]) => BudgetLine[]) => void;
  vatReturns: VATReturn[];
  setVatReturns: (fn: (prev: VATReturn[]) => VATReturn[]) => void;
  auditLog: AuditEntry[];
  addAudit: (action: string, module: string, description: string) => void;
  entryCounter: number;
  setEntryCounter: (fn: (prev: number) => number) => void;
  invoiceCounter: number;
  setInvoiceCounter: (fn: (prev: number) => number) => void;
  movementCounter: number;
  setMovementCounter: (fn: (prev: number) => number) => void;
  updateAccountBalance: (code: string, debitAmt: number, creditAmt: number, accs: Account[]) => Account[];
  postEntry: (entry: JournalEntry) => void;
  postInvoice: (invoice: Invoice) => void;
  addJournalEntry: (date: string, description: string, lines: JournalLine[], source?: string) => void;
  resetAll: () => void;
  onShareWithTeacher?: (content: string) => void;
}

const SimCtx = createContext<SimulatorState>(null!);
export const useSimulator = () => useContext(SimCtx);

export function SimulatorProvider({ children, onShareWithTeacher }: { children: ReactNode; onShareWithTeacher?: (content: string) => void }) {
  const [accounts, setAccounts] = useState<Account[]>(DEFAULT_ACCOUNTS);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>(DEFAULT_INVENTORY);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [cheques, setCheques] = useState<Cheque[]>([]);
  const [fixedAssets, setFixedAssets] = useState<FixedAsset[]>([]);
  const [bankLines, setBankLines] = useState<BankStatementLine[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>(DEFAULT_COST_CENTERS);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>(DEFAULT_CURRENCIES);
  const [forexTransactions, setForexTransactions] = useState<ForexTransaction[]>([]);
  const [budgetLines, setBudgetLines] = useState<BudgetLine[]>([]);
  const [vatReturns, setVatReturns] = useState<VATReturn[]>([]);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [entryCounter, setEntryCounter] = useState(1);
  const [invoiceCounter, setInvoiceCounter] = useState(1);
  const [movementCounter, setMovementCounter] = useState(1);

  const addAudit = useCallback((action: string, module: string, description: string) => {
    setAuditLog(prev => [...prev, {
      id: prev.length + 1,
      timestamp: nowStr(),
      action,
      module,
      description,
      user: "الطالب",
    }]);
  }, []);

  const updateAccountBalance = useCallback((code: string, debitAmt: number, creditAmt: number, accs: Account[]): Account[] => {
    return accs.map(acc => {
      if (acc.code !== code) return acc;
      const isDebitNormal = acc.type === "asset" || acc.type === "expense";
      const change = isDebitNormal ? (debitAmt - creditAmt) : (creditAmt - debitAmt);
      return { ...acc, balance: acc.balance + change };
    });
  }, []);

  const addJournalEntry = useCallback((date: string, description: string, lines: JournalLine[], source?: string) => {
    const newEntry: JournalEntry = {
      id: entryCounter,
      date,
      description,
      lines,
      isPosted: true,
      source,
      createdAt: nowStr(),
    };
    let updatedAccounts = [...accounts];
    for (const line of lines) {
      updatedAccounts = updateAccountBalance(line.accountCode, line.debit, line.credit, updatedAccounts);
    }
    setAccounts(updatedAccounts);
    setEntries(prev => [...prev, newEntry]);
    setEntryCounter(prev => prev + 1);
    addAudit("إنشاء قيد", source || "القيود", description);
  }, [entryCounter, accounts, updateAccountBalance, addAudit]);

  const postEntry = useCallback((entry: JournalEntry) => {
    let updatedAccounts = [...accounts];
    for (const line of entry.lines) {
      updatedAccounts = updateAccountBalance(line.accountCode, line.debit, line.credit, updatedAccounts);
    }
    setAccounts(updatedAccounts);
    setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, isPosted: true } : e));
    addAudit("ترحيل قيد", "القيود", `ترحيل قيد #${entry.id}: ${entry.description}`);
  }, [accounts, updateAccountBalance, addAudit]);

  const postInvoice = useCallback((invoice: Invoice) => {
    const subtotal = invoice.items.reduce((s, it) => s + it.qty * it.unitPrice, 0);
    const totalVAT = invoice.items.reduce((s, it) => s + it.qty * it.unitPrice * (it.vatRate / 100), 0);
    const total = subtotal + totalVAT;
    let updatedAccounts = [...accounts];
    let costOfGoodsSold = 0;

    if (invoice.type === "sale") {
      const cashOrReceivable = invoice.paymentType === "cash" ? "1100" : "1300";
      updatedAccounts = updateAccountBalance(cashOrReceivable, total, 0, updatedAccounts);
      updatedAccounts = updateAccountBalance("4100", 0, subtotal, updatedAccounts);
      if (totalVAT > 0) {
        updatedAccounts = updateAccountBalance("2600", 0, totalVAT, updatedAccounts);
      }

      const currentInventory = [...inventory];
      for (const item of invoice.items) {
        const invItem = currentInventory.find(i => i.name === item.itemName);
        if (invItem && invItem.qty > 0) {
          const qtyToDeduct = Math.min(item.qty, invItem.qty);
          costOfGoodsSold += qtyToDeduct * invItem.avgCost;
        }
      }
      if (costOfGoodsSold > 0) {
        updatedAccounts = updateAccountBalance("5100", costOfGoodsSold, 0, updatedAccounts);
        updatedAccounts = updateAccountBalance("1400", 0, costOfGoodsSold, updatedAccounts);
      }
    } else {
      const cashOrPayable = invoice.paymentType === "cash" ? "1100" : "2100";
      updatedAccounts = updateAccountBalance("1400", subtotal, 0, updatedAccounts);
      updatedAccounts = updateAccountBalance(cashOrPayable, 0, total, updatedAccounts);
      if (totalVAT > 0) {
        updatedAccounts = updateAccountBalance("1700", totalVAT, 0, updatedAccounts);
      }
    }

    setAccounts(updatedAccounts);
    setInvoices(prev => prev.map(inv => inv.id === invoice.id ? { ...inv, isPosted: true } : inv));

    const lines: JournalLine[] = invoice.type === "sale" ? [
      { accountCode: invoice.paymentType === "cash" ? "1100" : "1300", debit: total, credit: 0, description: invoice.paymentType === "cash" ? "الصندوق" : "المدينون" },
      { accountCode: "4100", debit: 0, credit: subtotal, description: "إيرادات المبيعات" },
      ...(totalVAT > 0 ? [{ accountCode: "2600", debit: 0, credit: totalVAT, description: "ضريبة مخرجات" }] : []),
      ...(costOfGoodsSold > 0 ? [
        { accountCode: "5100", debit: costOfGoodsSold, credit: 0, description: "تكلفة البضاعة المباعة" },
        { accountCode: "1400", debit: 0, credit: costOfGoodsSold, description: "المخزون" },
      ] : []),
    ] : [
      { accountCode: "1400", debit: subtotal, credit: 0, description: "المخزون" },
      ...(totalVAT > 0 ? [{ accountCode: "1700", debit: totalVAT, credit: 0, description: "ضريبة مدخلات" }] : []),
      { accountCode: invoice.paymentType === "cash" ? "1100" : "2100", debit: 0, credit: total, description: invoice.paymentType === "cash" ? "الصندوق" : "الدائنون" },
    ];

    const autoEntry: JournalEntry = {
      id: entryCounter,
      date: invoice.date,
      description: invoice.type === "sale"
        ? `فاتورة مبيعات #${invoice.id} — ${invoice.counterparty}`
        : `فاتورة مشتريات #${invoice.id} — ${invoice.counterparty}`,
      lines,
      isPosted: true,
      source: "الفواتير",
      createdAt: nowStr(),
    };
    setEntries(prev => [...prev, autoEntry]);
    setEntryCounter(prev => prev + 1);

    if (invoice.type === "sale") {
      setInventory(prev => {
        let updated = [...prev];
        for (const item of invoice.items) {
          const existing = updated.find(i => i.name === item.itemName);
          if (existing) {
            const qtyToDeduct = Math.min(item.qty, existing.qty);
            updated = updated.map(i => i.code === existing.code ? { ...i, qty: i.qty - qtyToDeduct } : i);
          }
        }
        return updated;
      });
    } else {
      setInventory(prev => {
        let updated = [...prev];
        for (const item of invoice.items) {
          const existing = updated.find(i => i.name === item.itemName);
          if (existing) {
            const totalCost = existing.qty * existing.avgCost + item.qty * item.unitPrice;
            const totalQty = existing.qty + item.qty;
            updated = updated.map(i => i.code === existing.code ? { ...i, qty: totalQty, avgCost: totalQty > 0 ? totalCost / totalQty : 0 } : i);
          } else {
            updated.push({
              code: `ITM${String(updated.length + 1).padStart(3, "0")}`,
              name: item.itemName, unit: "وحدة", qty: item.qty, avgCost: item.unitPrice, category: "عام",
            });
          }
        }
        return updated;
      });
    }

    addAudit("ترحيل فاتورة", "الفواتير", `${invoice.type === "sale" ? "مبيعات" : "مشتريات"} #${invoice.id} — ${invoice.counterparty}`);
  }, [accounts, inventory, entryCounter, updateAccountBalance, addAudit]);

  const resetAll = useCallback(() => {
    setAccounts(DEFAULT_ACCOUNTS);
    setEntries([]);
    setInvoices([]);
    setInventory(DEFAULT_INVENTORY);
    setMovements([]);
    setCheques([]);
    setFixedAssets([]);
    setBankLines([]);
    setCostCenters(DEFAULT_COST_CENTERS);
    setEmployees([]);
    setPayrollRuns([]);
    setCurrencies(DEFAULT_CURRENCIES);
    setForexTransactions([]);
    setBudgetLines([]);
    setVatReturns([]);
    setAuditLog([]);
    setEntryCounter(1);
    setInvoiceCounter(1);
    setMovementCounter(1);
  }, []);

  const value: SimulatorState = {
    accounts, setAccounts,
    entries, setEntries,
    invoices, setInvoices,
    inventory, setInventory,
    movements, setMovements,
    cheques, setCheques,
    fixedAssets, setFixedAssets,
    bankLines, setBankLines,
    costCenters, setCostCenters,
    employees, setEmployees,
    payrollRuns, setPayrollRuns,
    currencies, setCurrencies,
    forexTransactions, setForexTransactions,
    budgetLines, setBudgetLines,
    vatReturns, setVatReturns,
    auditLog, addAudit,
    entryCounter, setEntryCounter,
    invoiceCounter, setInvoiceCounter,
    movementCounter, setMovementCounter,
    updateAccountBalance,
    postEntry, postInvoice, addJournalEntry,
    resetAll,
    onShareWithTeacher,
  };

  return <SimCtx.Provider value={value}>{children}</SimCtx.Provider>;
}
