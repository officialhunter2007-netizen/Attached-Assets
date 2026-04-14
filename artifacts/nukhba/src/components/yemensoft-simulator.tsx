import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen, FileText, ShoppingCart, Package, Landmark, BarChart3,
  Plus, Trash2, ChevronDown, ChevronUp, Check, X, ArrowLeftRight,
  Calculator, AlertTriangle, TrendingUp, TrendingDown, Building2,
  Receipt, Wallet, Search, RotateCcw
} from "lucide-react";

type SimTab = "journal" | "accounts" | "invoices" | "inventory" | "trial-balance";

interface Account {
  code: string;
  name: string;
  type: "asset" | "liability" | "equity" | "revenue" | "expense";
  parent?: string;
  balance: number;
}

interface JournalLine {
  accountCode: string;
  debit: number;
  credit: number;
  description: string;
}

interface JournalEntry {
  id: number;
  date: string;
  description: string;
  lines: JournalLine[];
  isPosted: boolean;
}

interface InvoiceItem {
  itemName: string;
  qty: number;
  unitPrice: number;
}

interface Invoice {
  id: number;
  type: "sale" | "purchase";
  date: string;
  counterparty: string;
  items: InvoiceItem[];
  paymentType: "cash" | "credit";
  isPosted: boolean;
}

interface InventoryItem {
  code: string;
  name: string;
  unit: string;
  qty: number;
  avgCost: number;
  category: string;
}

interface InventoryMovement {
  id: number;
  date: string;
  type: "in" | "out" | "transfer";
  itemCode: string;
  qty: number;
  unitCost: number;
  warehouse: string;
  note: string;
}

const DEFAULT_ACCOUNTS: Account[] = [
  { code: "1000", name: "الأصول", type: "asset", balance: 0 },
  { code: "1100", name: "الصندوق", type: "asset", parent: "1000", balance: 50000 },
  { code: "1200", name: "البنك", type: "asset", parent: "1000", balance: 200000 },
  { code: "1300", name: "المدينون (ذمم العملاء)", type: "asset", parent: "1000", balance: 0 },
  { code: "1400", name: "المخزون", type: "asset", parent: "1000", balance: 0 },
  { code: "1500", name: "أصول ثابتة", type: "asset", parent: "1000", balance: 0 },
  { code: "2000", name: "الخصوم", type: "liability", balance: 0 },
  { code: "2100", name: "الدائنون (ذمم الموردين)", type: "liability", parent: "2000", balance: 0 },
  { code: "2200", name: "قروض قصيرة الأجل", type: "liability", parent: "2000", balance: 0 },
  { code: "2300", name: "مصاريف مستحقة", type: "liability", parent: "2000", balance: 0 },
  { code: "3000", name: "حقوق الملكية", type: "equity", balance: 0 },
  { code: "3100", name: "رأس المال", type: "equity", parent: "3000", balance: 250000 },
  { code: "3200", name: "أرباح مبقاة", type: "equity", parent: "3000", balance: 0 },
  { code: "4000", name: "الإيرادات", type: "revenue", balance: 0 },
  { code: "4100", name: "إيرادات المبيعات", type: "revenue", parent: "4000", balance: 0 },
  { code: "4200", name: "إيرادات خدمات", type: "revenue", parent: "4000", balance: 0 },
  { code: "5000", name: "المصروفات", type: "expense", balance: 0 },
  { code: "5100", name: "تكلفة البضاعة المباعة", type: "expense", parent: "5000", balance: 0 },
  { code: "5200", name: "رواتب وأجور", type: "expense", parent: "5000", balance: 0 },
  { code: "5300", name: "إيجارات", type: "expense", parent: "5000", balance: 0 },
  { code: "5400", name: "مصاريف إدارية وعمومية", type: "expense", parent: "5000", balance: 0 },
  { code: "5500", name: "مصاريف نقل", type: "expense", parent: "5000", balance: 0 },
];

const DEFAULT_INVENTORY: InventoryItem[] = [
  { code: "ITM001", name: "لابتوب Dell", unit: "جهاز", qty: 10, avgCost: 150000, category: "إلكترونيات" },
  { code: "ITM002", name: "طابعة HP", unit: "جهاز", qty: 5, avgCost: 45000, category: "إلكترونيات" },
  { code: "ITM003", name: "ورق A4", unit: "رزمة", qty: 100, avgCost: 1500, category: "قرطاسية" },
  { code: "ITM004", name: "حبر طابعة", unit: "علبة", qty: 20, avgCost: 5000, category: "قرطاسية" },
];

const typeColors: Record<string, string> = {
  asset: "text-blue-400",
  liability: "text-red-400",
  equity: "text-purple-400",
  revenue: "text-emerald-400",
  expense: "text-amber-400",
};

const typeLabels: Record<string, string> = {
  asset: "أصول",
  liability: "خصوم",
  equity: "حقوق ملكية",
  revenue: "إيرادات",
  expense: "مصروفات",
};

const typeIcons: Record<string, React.ReactNode> = {
  asset: <TrendingUp className="w-3.5 h-3.5" />,
  liability: <TrendingDown className="w-3.5 h-3.5" />,
  equity: <Building2 className="w-3.5 h-3.5" />,
  revenue: <Wallet className="w-3.5 h-3.5" />,
  expense: <Receipt className="w-3.5 h-3.5" />,
};

function formatNum(n: number): string {
  return n.toLocaleString("ar-SA");
}

interface Props {
  onShareWithTeacher?: (content: string) => void;
}

export function YemenSoftSimulator({ onShareWithTeacher }: Props) {
  const [activeTab, setActiveTab] = useState<SimTab>("journal");
  const [accounts, setAccounts] = useState<Account[]>(DEFAULT_ACCOUNTS);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>(DEFAULT_INVENTORY);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [entryCounter, setEntryCounter] = useState(1);
  const [invoiceCounter, setInvoiceCounter] = useState(1);
  const [movementCounter, setMovementCounter] = useState(1);

  const updateAccountBalance = useCallback((code: string, debitAmt: number, creditAmt: number, accs: Account[]): Account[] => {
    return accs.map(acc => {
      if (acc.code !== code) return acc;
      const isDebitNormal = acc.type === "asset" || acc.type === "expense";
      const change = isDebitNormal ? (debitAmt - creditAmt) : (creditAmt - debitAmt);
      return { ...acc, balance: acc.balance + change };
    });
  }, []);

  const postEntry = useCallback((entry: JournalEntry) => {
    let updatedAccounts = [...accounts];
    for (const line of entry.lines) {
      updatedAccounts = updateAccountBalance(line.accountCode, line.debit, line.credit, updatedAccounts);
    }
    setAccounts(updatedAccounts);
    setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, isPosted: true } : e));
  }, [accounts, updateAccountBalance]);

  const postInvoice = useCallback((invoice: Invoice) => {
    const total = invoice.items.reduce((s, it) => s + it.qty * it.unitPrice, 0);
    let updatedAccounts = [...accounts];

    let costOfGoodsSold = 0;
    if (invoice.type === "sale") {
      const cashOrReceivable = invoice.paymentType === "cash" ? "1100" : "1300";
      updatedAccounts = updateAccountBalance(cashOrReceivable, total, 0, updatedAccounts);
      updatedAccounts = updateAccountBalance("4100", 0, total, updatedAccounts);

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
      updatedAccounts = updateAccountBalance("1400", total, 0, updatedAccounts);
      updatedAccounts = updateAccountBalance(cashOrPayable, 0, total, updatedAccounts);
    }

    setAccounts(updatedAccounts);
    setInvoices(prev => prev.map(inv => inv.id === invoice.id ? { ...inv, isPosted: true } : inv));

    const autoEntry: JournalEntry = {
      id: entryCounter,
      date: invoice.date,
      description: invoice.type === "sale" 
        ? `فاتورة مبيعات رقم ${invoice.id} — ${invoice.counterparty}`
        : `فاتورة مشتريات رقم ${invoice.id} — ${invoice.counterparty}`,
      lines: invoice.type === "sale" ? [
        { accountCode: invoice.paymentType === "cash" ? "1100" : "1300", debit: total, credit: 0, description: invoice.paymentType === "cash" ? "الصندوق" : "المدينون" },
        { accountCode: "4100", debit: 0, credit: total, description: "إيرادات المبيعات" },
        ...(costOfGoodsSold > 0 ? [
          { accountCode: "5100", debit: costOfGoodsSold, credit: 0, description: "تكلفة البضاعة المباعة" },
          { accountCode: "1400", debit: 0, credit: costOfGoodsSold, description: "المخزون" },
        ] : []),
      ] : [
        { accountCode: "1400", debit: total, credit: 0, description: "المخزون" },
        { accountCode: invoice.paymentType === "cash" ? "1100" : "2100", debit: 0, credit: total, description: invoice.paymentType === "cash" ? "الصندوق" : "الدائنون" },
      ],
      isPosted: true,
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
            updated = updated.map(i => i.code === existing.code
              ? { ...i, qty: i.qty - qtyToDeduct }
              : i
            );
          }
        }
        return updated;
      });
    }

    if (invoice.type === "purchase") {
      setInventory(prev => {
        let updated = [...prev];
        for (const item of invoice.items) {
          const existing = updated.find(i => i.name === item.itemName);
          if (existing) {
            const totalCost = existing.qty * existing.avgCost + item.qty * item.unitPrice;
            const totalQty = existing.qty + item.qty;
            updated = updated.map(i => i.code === existing.code 
              ? { ...i, qty: totalQty, avgCost: totalQty > 0 ? totalCost / totalQty : 0 }
              : i
            );
          } else {
            updated.push({
              code: `ITM${String(updated.length + 1).padStart(3, "0")}`,
              name: item.itemName,
              unit: "وحدة",
              qty: item.qty,
              avgCost: item.unitPrice,
              category: "عام",
            });
          }
        }
        return updated;
      });
    }
  }, [accounts, inventory, entryCounter, updateAccountBalance]);

  const resetAll = useCallback(() => {
    setAccounts(DEFAULT_ACCOUNTS);
    setEntries([]);
    setInvoices([]);
    setInventory(DEFAULT_INVENTORY);
    setMovements([]);
    setEntryCounter(1);
    setInvoiceCounter(1);
    setMovementCounter(1);
  }, []);

  const tabs: { id: SimTab; label: string; icon: React.ReactNode }[] = [
    { id: "journal", label: "القيود", icon: <BookOpen className="w-4 h-4" /> },
    { id: "accounts", label: "الحسابات", icon: <FileText className="w-4 h-4" /> },
    { id: "invoices", label: "الفواتير", icon: <ShoppingCart className="w-4 h-4" /> },
    { id: "inventory", label: "المخزون", icon: <Package className="w-4 h-4" /> },
    { id: "trial-balance", label: "ميزان المراجعة", icon: <BarChart3 className="w-4 h-4" /> },
  ];

  return (
    <div className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-black/40 w-full min-w-0" style={{ direction: "rtl" }}>
      <div className="bg-[#1e1e2e] px-4 py-2 flex items-center gap-3 border-b border-white/5">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
          <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
          <div className="w-3 h-3 rounded-full bg-[#28c840]" />
        </div>
        <Building2 className="w-3.5 h-3.5 text-teal-400" />
        <span className="text-xs text-[#6e6a86] font-mono flex-1">بيئة يمن سوفت التطبيقية</span>
        <button onClick={resetAll} className="text-[10px] text-red-400/60 hover:text-red-400 flex items-center gap-1 transition-colors" title="إعادة تعيين">
          <RotateCcw className="w-3 h-3" />
        </button>
      </div>

      <div className="bg-[#181825] border-b border-white/5 flex items-center overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? "border-teal-400 text-white bg-[#1e1e2e]"
                : "border-transparent text-[#6e6a86] hover:text-white/60 hover:bg-white/5"
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="bg-[#0d1117] min-h-[300px] max-h-[70vh] sm:max-h-[75vh] overflow-y-auto">
        <AnimatePresence mode="wait">
          {activeTab === "journal" && (
            <motion.div key="journal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <JournalTab
                accounts={accounts}
                entries={entries}
                setEntries={setEntries}
                entryCounter={entryCounter}
                setEntryCounter={setEntryCounter}
                postEntry={postEntry}
                onShareWithTeacher={onShareWithTeacher}
              />
            </motion.div>
          )}
          {activeTab === "accounts" && (
            <motion.div key="accounts" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <AccountsTab
                accounts={accounts}
                setAccounts={setAccounts}
                entries={entries}
                onShareWithTeacher={onShareWithTeacher}
              />
            </motion.div>
          )}
          {activeTab === "invoices" && (
            <motion.div key="invoices" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <InvoicesTab
                invoices={invoices}
                setInvoices={setInvoices}
                invoiceCounter={invoiceCounter}
                setInvoiceCounter={setInvoiceCounter}
                postInvoice={postInvoice}
                inventory={inventory}
                onShareWithTeacher={onShareWithTeacher}
              />
            </motion.div>
          )}
          {activeTab === "inventory" && (
            <motion.div key="inventory" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <InventoryTab
                inventory={inventory}
                setInventory={setInventory}
                movements={movements}
                setMovements={setMovements}
                movementCounter={movementCounter}
                setMovementCounter={setMovementCounter}
                accounts={accounts}
                setAccounts={setAccounts}
                updateAccountBalance={updateAccountBalance}
                onShareWithTeacher={onShareWithTeacher}
              />
            </motion.div>
          )}
          {activeTab === "trial-balance" && (
            <motion.div key="trial" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <TrialBalanceTab
                accounts={accounts}
                entries={entries}
                onShareWithTeacher={onShareWithTeacher}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="bg-teal-700 px-4 py-0.5 flex items-center gap-4">
        <span className="text-[10px] text-white/80 font-mono">🏢 بيئة يمن سوفت التطبيقية</span>
        <div className="flex-1" />
        <span className="text-[10px] text-white/80 font-mono">YemenSoft Simulator</span>
      </div>
    </div>
  );
}

function SimField({ label, value, onChange, type = "text", placeholder, dir }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; dir?: "rtl" | "ltr";
}) {
  return (
    <div>
      <label className="text-xs text-[#a6adc8] mb-1 block">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-[#1e1e2e] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-teal-400/50 transition-colors"
        style={{ direction: dir || "rtl" }}
      />
    </div>
  );
}

function SimSelect({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="text-xs text-[#a6adc8] mb-1 block">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-[#1e1e2e] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-teal-400/50 transition-colors"
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function ShareButton({ onClick, label = "شارك مع المعلم" }: { onClick: () => void; label?: string }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-teal-500/10 border border-teal-500/25 text-teal-400 hover:bg-teal-500/20 transition-all"
    >
      <ArrowLeftRight className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}

function JournalTab({ accounts, entries, setEntries, entryCounter, setEntryCounter, postEntry, onShareWithTeacher }: {
  accounts: Account[];
  entries: JournalEntry[];
  setEntries: (fn: (prev: JournalEntry[]) => JournalEntry[]) => void;
  entryCounter: number;
  setEntryCounter: (fn: (prev: number) => number) => void;
  postEntry: (entry: JournalEntry) => void;
  onShareWithTeacher?: (content: string) => void;
}) {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  const [lines, setLines] = useState<JournalLine[]>([
    { accountCode: "", debit: 0, credit: 0, description: "" },
    { accountCode: "", debit: 0, credit: 0, description: "" },
  ]);
  const [showEntries, setShowEntries] = useState(false);

  const leafAccounts = accounts.filter(a => a.parent);
  const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = lines.reduce((s, l) => s + l.credit, 0);
  const isBalanced = totalDebit > 0 && totalDebit === totalCredit;
  const hasAccounts = lines.every(l => l.accountCode !== "");

  const addLine = () => setLines(prev => [...prev, { accountCode: "", debit: 0, credit: 0, description: "" }]);
  const removeLine = (idx: number) => {
    if (lines.length <= 2) return;
    setLines(prev => prev.filter((_, i) => i !== idx));
  };

  const updateLine = (idx: number, field: keyof JournalLine, val: string | number) => {
    setLines(prev => prev.map((l, i) => {
      if (i !== idx) return l;
      if (field === "debit" && Number(val) > 0) return { ...l, debit: Number(val), credit: 0 };
      if (field === "credit" && Number(val) > 0) return { ...l, credit: Number(val), debit: 0 };
      return { ...l, [field]: val };
    }));
  };

  const saveEntry = () => {
    if (!isBalanced || !hasAccounts || !description.trim()) return;
    const newEntry: JournalEntry = {
      id: entryCounter,
      date,
      description,
      lines: lines.filter(l => l.debit > 0 || l.credit > 0),
      isPosted: false,
    };
    setEntries(prev => [...prev, newEntry]);
    setEntryCounter(prev => prev + 1);
    setDescription("");
    setLines([
      { accountCode: "", debit: 0, credit: 0, description: "" },
      { accountCode: "", debit: 0, credit: 0, description: "" },
    ]);
  };

  const shareEntry = () => {
    if (!onShareWithTeacher) return;
    const lineDetails = lines.filter(l => l.debit > 0 || l.credit > 0).map(l => {
      const acc = accounts.find(a => a.code === l.accountCode);
      return `  ${acc?.name || l.accountCode}: مدين ${formatNum(l.debit)} / دائن ${formatNum(l.credit)}`;
    }).join("\n");

    onShareWithTeacher(
      `قيد محاسبي جديد:\n` +
      `• الوصف: ${description || "(بدون وصف)"}\n` +
      `• التاريخ: ${date}\n` +
      `• التفاصيل:\n${lineDetails}\n` +
      `• إجمالي المدين: ${formatNum(totalDebit)} ريال\n` +
      `• إجمالي الدائن: ${formatNum(totalCredit)} ريال\n` +
      `• متوازن: ${isBalanced ? "نعم ✓" : "لا ✗"}`
    );
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-teal-400" />
          إنشاء قيد محاسبي
        </h3>
        {entries.length > 0 && (
          <button
            onClick={() => setShowEntries(!showEntries)}
            className="text-[11px] text-teal-400 flex items-center gap-1"
          >
            القيود المسجلة ({entries.length})
            {showEntries ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        )}
      </div>

      {showEntries && entries.length > 0 && (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {entries.map(entry => (
            <div key={entry.id} className={`rounded-xl border p-3 text-xs ${entry.isPosted ? "border-emerald-500/20 bg-emerald-500/5" : "border-amber-500/20 bg-amber-500/5"}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-white">قيد #{entry.id} — {entry.description}</span>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${entry.isPosted ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"}`}>
                    {entry.isPosted ? "مرحّل ✓" : "غير مرحّل"}
                  </span>
                  {!entry.isPosted && (
                    <button onClick={() => postEntry(entry)} className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-400 hover:bg-teal-500/30 transition-colors font-bold">
                      ترحيل
                    </button>
                  )}
                </div>
              </div>
              <div className="text-[#a6adc8]">{entry.date}</div>
              {entry.lines.map((l, i) => {
                const acc = accounts.find(a => a.code === l.accountCode);
                return (
                  <div key={i} className="flex items-center gap-3 mt-1 text-[#a6adc8]">
                    <span className="font-mono text-[10px]">{l.accountCode}</span>
                    <span className="flex-1">{acc?.name}</span>
                    {l.debit > 0 && <span className="text-blue-400">{formatNum(l.debit)} مدين</span>}
                    {l.credit > 0 && <span className="text-red-400">{formatNum(l.credit)} دائن</span>}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <SimField label="التاريخ" value={date} onChange={setDate} type="date" dir="ltr" />
        <SimField label="وصف القيد" value={description} onChange={setDescription} placeholder="مثال: شراء بضاعة نقداً" />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-[#a6adc8] font-bold">بنود القيد</span>
          <button onClick={addLine} className="text-[11px] text-teal-400 flex items-center gap-1 hover:text-teal-300 transition-colors">
            <Plus className="w-3 h-3" /> إضافة بند
          </button>
        </div>

        <div className="hidden sm:grid grid-cols-12 gap-2 text-[10px] text-[#6e6a86] font-bold px-1">
          <span className="col-span-4">الحساب</span>
          <span className="col-span-3">مدين</span>
          <span className="col-span-3">دائن</span>
          <span className="col-span-2">البيان</span>
        </div>

        {lines.map((line, idx) => (
          <div key={idx} className="grid grid-cols-12 gap-2 items-center">
            <div className="col-span-12 sm:col-span-4">
              <select
                value={line.accountCode}
                onChange={e => updateLine(idx, "accountCode", e.target.value)}
                className="w-full bg-[#1e1e2e] border border-white/10 rounded-lg px-2 py-2 text-xs text-white outline-none focus:border-teal-400/50"
              >
                <option value="">اختر حساب...</option>
                {leafAccounts.map(a => (
                  <option key={a.code} value={a.code}>{a.code} — {a.name}</option>
                ))}
              </select>
            </div>
            <div className="col-span-5 sm:col-span-3">
              <input
                type="number"
                min={0}
                value={line.debit || ""}
                onChange={e => updateLine(idx, "debit", e.target.value)}
                placeholder="مدين"
                className="w-full bg-[#1e1e2e] border border-white/10 rounded-lg px-2 py-2 text-xs text-blue-400 outline-none focus:border-blue-400/50 text-center"
                style={{ direction: "ltr" }}
              />
            </div>
            <div className="col-span-5 sm:col-span-3">
              <input
                type="number"
                min={0}
                value={line.credit || ""}
                onChange={e => updateLine(idx, "credit", e.target.value)}
                placeholder="دائن"
                className="w-full bg-[#1e1e2e] border border-white/10 rounded-lg px-2 py-2 text-xs text-red-400 outline-none focus:border-red-400/50 text-center"
                style={{ direction: "ltr" }}
              />
            </div>
            <div className="col-span-2 flex items-center gap-1">
              <input
                value={line.description}
                onChange={e => updateLine(idx, "description", e.target.value)}
                placeholder="بيان"
                className="hidden sm:block flex-1 bg-[#1e1e2e] border border-white/10 rounded-lg px-2 py-2 text-xs text-white outline-none focus:border-teal-400/50"
              />
              {lines.length > 2 && (
                <button onClick={() => removeLine(idx)} className="text-red-400/40 hover:text-red-400 transition-colors shrink-0">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className={`rounded-xl p-3 border ${isBalanced ? "border-emerald-500/20 bg-emerald-500/5" : totalDebit > 0 || totalCredit > 0 ? "border-red-500/20 bg-red-500/5" : "border-white/5 bg-white/3"}`}>
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <span className="text-blue-400 font-bold text-xs">مدين: {formatNum(totalDebit)}</span>
            <span className="text-red-400 font-bold text-xs">دائن: {formatNum(totalCredit)}</span>
          </div>
          <div className="flex items-center gap-2">
            {isBalanced ? (
              <span className="text-emerald-400 text-xs flex items-center gap-1"><Check className="w-3.5 h-3.5" /> متوازن</span>
            ) : (totalDebit > 0 || totalCredit > 0) ? (
              <span className="text-red-400 text-xs flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> غير متوازن (فرق: {formatNum(Math.abs(totalDebit - totalCredit))})</span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 justify-end">
        {onShareWithTeacher && (totalDebit > 0 || totalCredit > 0) && (
          <ShareButton onClick={shareEntry} />
        )}
        <button
          onClick={saveEntry}
          disabled={!isBalanced || !hasAccounts || !description.trim()}
          className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl bg-teal-600 text-white hover:bg-teal-500 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Check className="w-3.5 h-3.5" />
          حفظ القيد
        </button>
      </div>
    </div>
  );
}

function AccountsTab({ accounts, setAccounts, entries, onShareWithTeacher }: {
  accounts: Account[];
  setAccounts: (accs: Account[]) => void;
  entries: JournalEntry[];
  onShareWithTeacher?: (content: string) => void;
}) {
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set(["asset", "liability", "equity", "revenue", "expense"]));
  const [showAdd, setShowAdd] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<Account["type"]>("asset");
  const [newParent, setNewParent] = useState("");

  const toggleType = (type: string) => {
    setExpandedTypes(prev => {
      const next = new Set(prev);
      next.has(type) ? next.delete(type) : next.add(type);
      return next;
    });
  };

  const addAccount = () => {
    if (!newCode.trim() || !newName.trim()) return;
    if (accounts.find(a => a.code === newCode)) return;
    setAccounts([...accounts, {
      code: newCode,
      name: newName,
      type: newType,
      parent: newParent || undefined,
      balance: 0,
    }]);
    setNewCode("");
    setNewName("");
    setShowAdd(false);
  };

  const groupedAccounts = useMemo(() => {
    const groups: Record<string, Account[]> = {};
    for (const type of ["asset", "liability", "equity", "revenue", "expense"]) {
      groups[type] = accounts.filter(a => a.type === type);
    }
    return groups;
  }, [accounts]);

  const shareAccounts = () => {
    if (!onShareWithTeacher) return;
    let text = "شجرة الحسابات الحالية:\n";
    for (const [type, accs] of Object.entries(groupedAccounts)) {
      text += `\n📂 ${typeLabels[type]}:\n`;
      const parents = accs.filter(a => !a.parent);
      for (const p of parents) {
        text += `  ${p.code} — ${p.name} (رصيد: ${formatNum(p.balance)} ريال)\n`;
        const children = accs.filter(a => a.parent === p.code);
        for (const c of children) {
          text += `    ${c.code} — ${c.name} (رصيد: ${formatNum(c.balance)} ريال)\n`;
        }
      }
    }
    onShareWithTeacher(text);
  };

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <FileText className="w-4 h-4 text-teal-400" />
          شجرة الحسابات
        </h3>
        <div className="flex items-center gap-2">
          {onShareWithTeacher && <ShareButton onClick={shareAccounts} />}
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="text-[11px] text-teal-400 flex items-center gap-1 hover:text-teal-300 transition-colors"
          >
            <Plus className="w-3 h-3" /> حساب جديد
          </button>
        </div>
      </div>

      {showAdd && (
        <div className="rounded-xl border border-teal-500/20 bg-teal-500/5 p-3 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <SimField label="رقم الحساب" value={newCode} onChange={setNewCode} placeholder="مثال: 1600" dir="ltr" />
            <SimField label="اسم الحساب" value={newName} onChange={setNewName} placeholder="مثال: استثمارات" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <SimSelect
              label="نوع الحساب"
              value={newType}
              onChange={v => setNewType(v as Account["type"])}
              options={Object.entries(typeLabels).map(([v, l]) => ({ value: v, label: l }))}
            />
            <SimSelect
              label="الحساب الرئيسي"
              value={newParent}
              onChange={setNewParent}
              options={[
                { value: "", label: "بدون (حساب رئيسي)" },
                ...accounts.filter(a => !a.parent).map(a => ({ value: a.code, label: `${a.code} — ${a.name}` })),
              ]}
            />
          </div>
          <div className="flex justify-end">
            <button onClick={addAccount} disabled={!newCode.trim() || !newName.trim()} className="text-xs font-bold px-4 py-2 rounded-xl bg-teal-600 text-white hover:bg-teal-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
              إضافة
            </button>
          </div>
        </div>
      )}

      {Object.entries(groupedAccounts).map(([type, accs]) => {
        const parents = accs.filter(a => !a.parent);
        const isExpanded = expandedTypes.has(type);
        const totalBalance = accs.filter(a => a.parent).reduce((s, a) => s + a.balance, 0);

        return (
          <div key={type} className="rounded-xl border border-white/5 overflow-hidden">
            <button
              onClick={() => toggleType(type)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors"
            >
              <span className={typeColors[type]}>{typeIcons[type]}</span>
              <span className={`text-sm font-bold ${typeColors[type]}`}>{typeLabels[type]}</span>
              <span className="text-[11px] text-[#6e6a86] mr-auto font-mono">{formatNum(totalBalance)} ريال</span>
              {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-[#6e6a86]" /> : <ChevronDown className="w-3.5 h-3.5 text-[#6e6a86]" />}
            </button>

            {isExpanded && (
              <div className="border-t border-white/5">
                {parents.map(parent => {
                  const children = accs.filter(a => a.parent === parent.code);
                  return (
                    <div key={parent.code}>
                      <div className="flex items-center gap-3 px-4 py-2 bg-white/3">
                        <span className="text-[11px] font-mono text-[#6e6a86] w-12">{parent.code}</span>
                        <span className="text-xs font-bold text-white flex-1">{parent.name}</span>
                      </div>
                      {children.map(child => (
                        <div key={child.code} className="flex items-center gap-3 px-4 py-2 pr-10 hover:bg-white/3 transition-colors">
                          <span className="text-[11px] font-mono text-[#6e6a86] w-12">{child.code}</span>
                          <span className="text-xs text-[#a6adc8] flex-1">{child.name}</span>
                          <span className={`text-xs font-mono font-bold ${child.balance >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                            {formatNum(child.balance)}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function InvoicesTab({ invoices, setInvoices, invoiceCounter, setInvoiceCounter, postInvoice, inventory, onShareWithTeacher }: {
  invoices: Invoice[];
  setInvoices: (fn: (prev: Invoice[]) => Invoice[]) => void;
  invoiceCounter: number;
  setInvoiceCounter: (fn: (prev: number) => number) => void;
  postInvoice: (invoice: Invoice) => void;
  inventory: InventoryItem[];
  onShareWithTeacher?: (content: string) => void;
}) {
  const [invType, setInvType] = useState<"sale" | "purchase">("sale");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [counterparty, setCounterparty] = useState("");
  const [paymentType, setPaymentType] = useState<"cash" | "credit">("cash");
  const [items, setItems] = useState<InvoiceItem[]>([{ itemName: "", qty: 1, unitPrice: 0 }]);
  const [showInvoices, setShowInvoices] = useState(false);

  const total = items.reduce((s, it) => s + it.qty * it.unitPrice, 0);

  const addItem = () => setItems(prev => [...prev, { itemName: "", qty: 1, unitPrice: 0 }]);
  const removeItem = (idx: number) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  const updateItem = (idx: number, field: keyof InvoiceItem, val: string | number) => {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: field === "itemName" ? val : Number(val) } : it));
  };

  const saveInvoice = () => {
    if (!counterparty.trim() || items.some(it => !it.itemName.trim() || it.qty <= 0 || it.unitPrice <= 0)) return;
    const newInv: Invoice = {
      id: invoiceCounter,
      type: invType,
      date,
      counterparty,
      items: [...items],
      paymentType,
      isPosted: false,
    };
    setInvoices(prev => [...prev, newInv]);
    setInvoiceCounter(prev => prev + 1);
    setCounterparty("");
    setItems([{ itemName: "", qty: 1, unitPrice: 0 }]);
  };

  const shareInvoice = () => {
    if (!onShareWithTeacher) return;
    const itemsText = items.map(it => `  - ${it.itemName}: ${it.qty} × ${formatNum(it.unitPrice)} = ${formatNum(it.qty * it.unitPrice)} ريال`).join("\n");
    onShareWithTeacher(
      `فاتورة ${invType === "sale" ? "مبيعات" : "مشتريات"} جديدة:\n` +
      `• ${invType === "sale" ? "العميل" : "المورد"}: ${counterparty || "(غير محدد)"}\n` +
      `• التاريخ: ${date}\n` +
      `• طريقة الدفع: ${paymentType === "cash" ? "نقدي" : "آجل"}\n` +
      `• الأصناف:\n${itemsText}\n` +
      `• الإجمالي: ${formatNum(total)} ريال`
    );
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <ShoppingCart className="w-4 h-4 text-teal-400" />
          إنشاء فاتورة
        </h3>
        {invoices.length > 0 && (
          <button onClick={() => setShowInvoices(!showInvoices)} className="text-[11px] text-teal-400 flex items-center gap-1">
            الفواتير ({invoices.length})
            {showInvoices ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        )}
      </div>

      {showInvoices && invoices.length > 0 && (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {invoices.map(inv => (
            <div key={inv.id} className={`rounded-xl border p-3 text-xs ${inv.isPosted ? "border-emerald-500/20 bg-emerald-500/5" : "border-amber-500/20 bg-amber-500/5"}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-white">
                  {inv.type === "sale" ? "فاتورة مبيعات" : "فاتورة مشتريات"} #{inv.id} — {inv.counterparty}
                </span>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${inv.isPosted ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"}`}>
                    {inv.isPosted ? "مرحّلة ✓" : "غير مرحّلة"}
                  </span>
                  {!inv.isPosted && (
                    <button onClick={() => postInvoice(inv)} className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-400 hover:bg-teal-500/30 transition-colors font-bold">
                      ترحيل
                    </button>
                  )}
                </div>
              </div>
              <div className="text-[#a6adc8]">
                {inv.date} · {inv.paymentType === "cash" ? "نقدي" : "آجل"} · إجمالي: {formatNum(inv.items.reduce((s, it) => s + it.qty * it.unitPrice, 0))} ريال
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => setInvType("sale")}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all ${invType === "sale" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "border-white/5 text-[#6e6a86] hover:bg-white/5"}`}
        >
          فاتورة مبيعات
        </button>
        <button
          onClick={() => setInvType("purchase")}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all ${invType === "purchase" ? "bg-blue-500/10 border-blue-500/30 text-blue-400" : "border-white/5 text-[#6e6a86] hover:bg-white/5"}`}
        >
          فاتورة مشتريات
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <SimField label="التاريخ" value={date} onChange={setDate} type="date" dir="ltr" />
        <SimField label={invType === "sale" ? "اسم العميل" : "اسم المورد"} value={counterparty} onChange={setCounterparty} placeholder={invType === "sale" ? "مثال: شركة النور" : "مثال: مؤسسة التقنية"} />
        <SimSelect
          label="طريقة الدفع"
          value={paymentType}
          onChange={v => setPaymentType(v as "cash" | "credit")}
          options={[{ value: "cash", label: "نقدي" }, { value: "credit", label: "آجل (على الحساب)" }]}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-[#a6adc8] font-bold">الأصناف</span>
          <button onClick={addItem} className="text-[11px] text-teal-400 flex items-center gap-1 hover:text-teal-300 transition-colors">
            <Plus className="w-3 h-3" /> إضافة صنف
          </button>
        </div>

        {items.map((item, idx) => (
          <div key={idx} className="grid grid-cols-12 gap-2 items-center">
            <div className="col-span-12 sm:col-span-5">
              <input
                value={item.itemName}
                onChange={e => updateItem(idx, "itemName", e.target.value)}
                placeholder="اسم الصنف"
                className="w-full bg-[#1e1e2e] border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-teal-400/50"
              />
            </div>
            <div className="col-span-4 sm:col-span-2">
              <input
                type="number"
                min={1}
                value={item.qty}
                onChange={e => updateItem(idx, "qty", e.target.value)}
                placeholder="الكمية"
                className="w-full bg-[#1e1e2e] border border-white/10 rounded-lg px-2 py-2 text-xs text-white outline-none focus:border-teal-400/50 text-center"
                style={{ direction: "ltr" }}
              />
            </div>
            <div className="col-span-5 sm:col-span-3">
              <input
                type="number"
                min={0}
                value={item.unitPrice || ""}
                onChange={e => updateItem(idx, "unitPrice", e.target.value)}
                placeholder="سعر الوحدة"
                className="w-full bg-[#1e1e2e] border border-white/10 rounded-lg px-2 py-2 text-xs text-white outline-none focus:border-teal-400/50 text-center"
                style={{ direction: "ltr" }}
              />
            </div>
            <div className="col-span-3 sm:col-span-2 flex items-center justify-between gap-1">
              <span className="text-[11px] text-amber-400 font-mono font-bold">{formatNum(item.qty * item.unitPrice)}</span>
              {items.length > 1 && (
                <button onClick={() => removeItem(idx)} className="text-red-400/40 hover:text-red-400 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl p-3 border border-white/5 bg-white/3 flex items-center justify-between">
        <span className="text-xs text-[#a6adc8]">الإجمالي</span>
        <span className="text-base font-bold text-amber-400 font-mono">{formatNum(total)} <span className="text-[10px] text-[#6e6a86]">ريال</span></span>
      </div>

      <div className="flex items-center gap-2 justify-end">
        {onShareWithTeacher && total > 0 && <ShareButton onClick={shareInvoice} />}
        <button
          onClick={saveInvoice}
          disabled={!counterparty.trim() || items.some(it => !it.itemName.trim() || it.qty <= 0 || it.unitPrice <= 0)}
          className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl bg-teal-600 text-white hover:bg-teal-500 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Check className="w-3.5 h-3.5" />
          حفظ الفاتورة
        </button>
      </div>
    </div>
  );
}

function InventoryTab({ inventory, setInventory, movements, setMovements, movementCounter, setMovementCounter, accounts, setAccounts, updateAccountBalance, onShareWithTeacher }: {
  inventory: InventoryItem[];
  setInventory: (fn: (prev: InventoryItem[]) => InventoryItem[]) => void;
  movements: InventoryMovement[];
  setMovements: (fn: (prev: InventoryMovement[]) => InventoryMovement[]) => void;
  movementCounter: number;
  setMovementCounter: (fn: (prev: number) => number) => void;
  accounts: Account[];
  setAccounts: (accs: Account[]) => void;
  updateAccountBalance: (code: string, debit: number, credit: number, accs: Account[]) => Account[];
  onShareWithTeacher?: (content: string) => void;
}) {
  const [showAddItem, setShowAddItem] = useState(false);
  const [showMovement, setShowMovement] = useState(false);
  const [newItem, setNewItem] = useState({ code: "", name: "", unit: "وحدة", qty: 0, avgCost: 0, category: "" });
  const [movType, setMovType] = useState<"in" | "out">("in");
  const [movItemCode, setMovItemCode] = useState("");
  const [movQty, setMovQty] = useState("");
  const [movCost, setMovCost] = useState("");
  const [movWarehouse, setMovWarehouse] = useState("المخزن الرئيسي");
  const [movNote, setMovNote] = useState("");
  const [movDate, setMovDate] = useState(new Date().toISOString().split("T")[0]);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredInventory = inventory.filter(item =>
    item.name.includes(searchTerm) || item.code.includes(searchTerm)
  );

  const totalInventoryValue = inventory.reduce((s, it) => s + it.qty * it.avgCost, 0);

  const addNewItem = () => {
    if (!newItem.code.trim() || !newItem.name.trim()) return;
    if (inventory.find(i => i.code === newItem.code)) return;
    setInventory(prev => [...prev, { ...newItem }]);
    setNewItem({ code: "", name: "", unit: "وحدة", qty: 0, avgCost: 0, category: "" });
    setShowAddItem(false);
  };

  const processMovement = () => {
    const qty = Number(movQty);
    const cost = Number(movCost);
    if (!movItemCode || qty <= 0) return;

    const item = inventory.find(i => i.code === movItemCode);
    if (!item) return;
    if (movType === "out" && qty > item.qty) return;

    const mov: InventoryMovement = {
      id: movementCounter,
      date: movDate,
      type: movType,
      itemCode: movItemCode,
      qty,
      unitCost: cost || item.avgCost,
      warehouse: movWarehouse,
      note: movNote,
    };
    setMovements(prev => [...prev, mov]);
    setMovementCounter(prev => prev + 1);

    setInventory(prev => prev.map(it => {
      if (it.code !== movItemCode) return it;
      if (movType === "in") {
        const totalCost = it.qty * it.avgCost + qty * (cost || it.avgCost);
        const totalQty = it.qty + qty;
        return { ...it, qty: totalQty, avgCost: totalQty > 0 ? totalCost / totalQty : 0 };
      } else {
        return { ...it, qty: it.qty - qty };
      }
    }));

    if (movType === "in" && cost > 0) {
      let updated = updateAccountBalance("1400", qty * cost, 0, accounts);
      updated = updateAccountBalance("1100", 0, qty * cost, updated);
      setAccounts(updated);
    } else if (movType === "out") {
      const costOfGoods = qty * (item.avgCost);
      let updated = updateAccountBalance("5100", costOfGoods, 0, accounts);
      updated = updateAccountBalance("1400", 0, costOfGoods, updated);
      setAccounts(updated);
    }

    setMovQty("");
    setMovCost("");
    setMovNote("");
    setShowMovement(false);
  };

  const shareInventory = () => {
    if (!onShareWithTeacher) return;
    let text = "تقرير المخزون الحالي:\n\n";
    text += `إجمالي قيمة المخزون: ${formatNum(totalInventoryValue)} ريال\n\n`;
    for (const item of inventory) {
      text += `• ${item.code} — ${item.name}: ${item.qty} ${item.unit} × ${formatNum(item.avgCost)} = ${formatNum(item.qty * item.avgCost)} ريال\n`;
    }
    if (movements.length > 0) {
      text += `\nآخر الحركات:\n`;
      for (const m of movements.slice(-5)) {
        const item = inventory.find(i => i.code === m.itemCode);
        text += `  ${m.date} — ${m.type === "in" ? "إدخال" : "إخراج"} ${m.qty} ${item?.name || m.itemCode} (${m.warehouse})\n`;
      }
    }
    onShareWithTeacher(text);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Package className="w-4 h-4 text-teal-400" />
          إدارة المخزون
        </h3>
        <div className="flex items-center gap-2">
          {onShareWithTeacher && <ShareButton onClick={shareInventory} />}
          <button onClick={() => setShowMovement(!showMovement)} className="text-[11px] text-amber-400 flex items-center gap-1 hover:text-amber-300 transition-colors">
            <ArrowLeftRight className="w-3 h-3" /> حركة مخزنية
          </button>
          <button onClick={() => setShowAddItem(!showAddItem)} className="text-[11px] text-teal-400 flex items-center gap-1 hover:text-teal-300 transition-colors">
            <Plus className="w-3 h-3" /> صنف جديد
          </button>
        </div>
      </div>

      {showAddItem && (
        <div className="rounded-xl border border-teal-500/20 bg-teal-500/5 p-3 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <SimField label="رمز الصنف" value={newItem.code} onChange={v => setNewItem(p => ({ ...p, code: v }))} placeholder="ITM005" dir="ltr" />
            <SimField label="اسم الصنف" value={newItem.name} onChange={v => setNewItem(p => ({ ...p, name: v }))} placeholder="مثال: شاشة عرض" />
            <SimField label="الوحدة" value={newItem.unit} onChange={v => setNewItem(p => ({ ...p, unit: v }))} placeholder="جهاز / كيلو / رزمة" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <SimField label="الكمية الافتتاحية" value={String(newItem.qty)} onChange={v => setNewItem(p => ({ ...p, qty: Number(v) }))} type="number" dir="ltr" />
            <SimField label="التكلفة (ريال)" value={String(newItem.avgCost)} onChange={v => setNewItem(p => ({ ...p, avgCost: Number(v) }))} type="number" dir="ltr" />
            <SimField label="التصنيف" value={newItem.category} onChange={v => setNewItem(p => ({ ...p, category: v }))} placeholder="إلكترونيات" />
          </div>
          <div className="flex justify-end">
            <button onClick={addNewItem} disabled={!newItem.code.trim() || !newItem.name.trim()} className="text-xs font-bold px-4 py-2 rounded-xl bg-teal-600 text-white hover:bg-teal-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
              إضافة
            </button>
          </div>
        </div>
      )}

      {showMovement && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 space-y-3">
          <div className="flex gap-2 mb-2">
            <button
              onClick={() => setMovType("in")}
              className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${movType === "in" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "border-white/5 text-[#6e6a86]"}`}
            >
              سند إدخال
            </button>
            <button
              onClick={() => setMovType("out")}
              className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${movType === "out" ? "bg-red-500/10 border-red-500/30 text-red-400" : "border-white/5 text-[#6e6a86]"}`}
            >
              سند إخراج
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <SimField label="التاريخ" value={movDate} onChange={setMovDate} type="date" dir="ltr" />
            <SimSelect
              label="الصنف"
              value={movItemCode}
              onChange={setMovItemCode}
              options={[
                { value: "", label: "اختر صنف..." },
                ...inventory.map(i => ({ value: i.code, label: `${i.code} — ${i.name} (${i.qty} ${i.unit})` })),
              ]}
            />
            <SimField label="الكمية" value={movQty} onChange={setMovQty} type="number" dir="ltr" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {movType === "in" && (
              <SimField label="تكلفة الوحدة (ريال)" value={movCost} onChange={setMovCost} type="number" dir="ltr" />
            )}
            <SimField label="المخزن" value={movWarehouse} onChange={setMovWarehouse} placeholder="المخزن الرئيسي" />
            <SimField label="ملاحظة" value={movNote} onChange={setMovNote} placeholder="سبب الحركة" />
          </div>
          <div className="flex justify-end">
            <button onClick={processMovement} disabled={!movItemCode || Number(movQty) <= 0} className="text-xs font-bold px-4 py-2 rounded-xl bg-amber-600 text-white hover:bg-amber-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
              تنفيذ الحركة
            </button>
          </div>
        </div>
      )}

      <div className="relative">
        <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-[#6e6a86]" />
        <input
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="بحث بالاسم أو الرمز..."
          className="w-full bg-[#1e1e2e] border border-white/10 rounded-lg pr-9 pl-3 py-2 text-xs text-white outline-none focus:border-teal-400/50"
        />
      </div>

      <div className="rounded-xl border border-white/5 overflow-hidden">
        <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-white/5 text-[10px] text-[#6e6a86] font-bold">
          <span className="col-span-2">الرمز</span>
          <span className="col-span-3">الصنف</span>
          <span className="col-span-2">الكمية</span>
          <span className="col-span-2">المتوسط</span>
          <span className="col-span-3">القيمة</span>
        </div>
        {filteredInventory.map(item => (
          <div key={item.code} className="grid grid-cols-12 gap-2 px-4 py-2.5 border-t border-white/5 hover:bg-white/3 transition-colors text-xs">
            <span className="col-span-2 font-mono text-[#6e6a86]">{item.code}</span>
            <span className="col-span-3 text-white">{item.name}</span>
            <span className={`col-span-2 font-mono font-bold ${item.qty <= 0 ? "text-red-400" : item.qty <= 3 ? "text-amber-400" : "text-emerald-400"}`}>
              {item.qty} {item.unit}
            </span>
            <span className="col-span-2 font-mono text-[#a6adc8]">{formatNum(item.avgCost)}</span>
            <span className="col-span-3 font-mono font-bold text-amber-400">{formatNum(item.qty * item.avgCost)}</span>
          </div>
        ))}
      </div>

      <div className="rounded-xl p-3 border border-white/5 bg-white/3 flex items-center justify-between">
        <span className="text-xs text-[#a6adc8]">إجمالي قيمة المخزون</span>
        <span className="text-base font-bold text-amber-400 font-mono">{formatNum(totalInventoryValue)} <span className="text-[10px] text-[#6e6a86]">ريال</span></span>
      </div>

      {movements.length > 0 && (
        <div className="space-y-1">
          <span className="text-xs text-[#a6adc8] font-bold">آخر الحركات المخزنية</span>
          {movements.slice(-5).reverse().map(m => {
            const item = inventory.find(i => i.code === m.itemCode);
            return (
              <div key={m.id} className="flex items-center gap-3 text-[11px] text-[#a6adc8] px-2 py-1.5 rounded-lg bg-white/3">
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${m.type === "in" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
                  {m.type === "in" ? "إدخال" : "إخراج"}
                </span>
                <span>{m.qty} {item?.name}</span>
                <span className="text-[#6e6a86]">— {m.warehouse}</span>
                <span className="mr-auto text-[#6e6a86]">{m.date}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TrialBalanceTab({ accounts, entries, onShareWithTeacher }: {
  accounts: Account[];
  entries: JournalEntry[];
  onShareWithTeacher?: (content: string) => void;
}) {
  const leafAccounts = accounts.filter(a => a.parent && a.balance !== 0);
  const totalDebit = leafAccounts.filter(a => {
    const isDebitNormal = a.type === "asset" || a.type === "expense";
    return isDebitNormal ? a.balance > 0 : a.balance < 0;
  }).reduce((s, a) => s + Math.abs(a.balance), 0);

  const totalCredit = leafAccounts.filter(a => {
    const isDebitNormal = a.type === "asset" || a.type === "expense";
    return isDebitNormal ? a.balance < 0 : a.balance > 0;
  }).reduce((s, a) => s + Math.abs(a.balance), 0);

  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  const totalRevenue = accounts.filter(a => a.type === "revenue" && a.parent).reduce((s, a) => s + a.balance, 0);
  const totalExpense = accounts.filter(a => a.type === "expense" && a.parent).reduce((s, a) => s + a.balance, 0);
  const netIncome = totalRevenue - totalExpense;

  const totalAssets = accounts.filter(a => a.type === "asset" && a.parent).reduce((s, a) => s + a.balance, 0);
  const totalLiabilities = accounts.filter(a => a.type === "liability" && a.parent).reduce((s, a) => s + a.balance, 0);
  const totalEquity = accounts.filter(a => a.type === "equity" && a.parent).reduce((s, a) => s + a.balance, 0);

  const shareTrialBalance = () => {
    if (!onShareWithTeacher) return;
    let text = "ميزان المراجعة:\n\n";
    text += "| الحساب | مدين | دائن |\n";
    for (const acc of leafAccounts) {
      const isDebitNormal = acc.type === "asset" || acc.type === "expense";
      const debitAmt = (isDebitNormal && acc.balance > 0) || (!isDebitNormal && acc.balance < 0) ? Math.abs(acc.balance) : 0;
      const creditAmt = (isDebitNormal && acc.balance < 0) || (!isDebitNormal && acc.balance > 0) ? Math.abs(acc.balance) : 0;
      text += `| ${acc.code} ${acc.name} | ${formatNum(debitAmt)} | ${formatNum(creditAmt)} |\n`;
    }
    text += `\nإجمالي المدين: ${formatNum(totalDebit)} ريال\n`;
    text += `إجمالي الدائن: ${formatNum(totalCredit)} ريال\n`;
    text += `متوازن: ${isBalanced ? "نعم ✓" : "لا ✗"}\n`;
    text += `\nملخص مالي:\n`;
    text += `• إجمالي الإيرادات: ${formatNum(totalRevenue)} ريال\n`;
    text += `• إجمالي المصروفات: ${formatNum(totalExpense)} ريال\n`;
    text += `• صافي الربح/الخسارة: ${formatNum(netIncome)} ريال\n`;
    text += `• إجمالي الأصول: ${formatNum(totalAssets)} ريال\n`;
    text += `• إجمالي الخصوم: ${formatNum(totalLiabilities)} ريال\n`;
    text += `• حقوق الملكية: ${formatNum(totalEquity)} ريال`;
    onShareWithTeacher(text);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-teal-400" />
          ميزان المراجعة
        </h3>
        {onShareWithTeacher && leafAccounts.length > 0 && <ShareButton onClick={shareTrialBalance} />}
      </div>

      {leafAccounts.length === 0 ? (
        <div className="text-center py-12 text-[#6e6a86]">
          <Calculator className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">لا توجد حركات مالية بعد</p>
          <p className="text-xs mt-1">ابدأ بإنشاء قيود أو فواتير لتظهر هنا</p>
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-white/5 overflow-hidden">
            <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-white/5 text-[10px] text-[#6e6a86] font-bold">
              <span className="col-span-1">الرقم</span>
              <span className="col-span-5">اسم الحساب</span>
              <span className="col-span-3 text-center">مدين</span>
              <span className="col-span-3 text-center">دائن</span>
            </div>
            {leafAccounts.map(acc => {
              const isDebitNormal = acc.type === "asset" || acc.type === "expense";
              const debitAmt = (isDebitNormal && acc.balance > 0) || (!isDebitNormal && acc.balance < 0) ? Math.abs(acc.balance) : 0;
              const creditAmt = (isDebitNormal && acc.balance < 0) || (!isDebitNormal && acc.balance > 0) ? Math.abs(acc.balance) : 0;

              return (
                <div key={acc.code} className="grid grid-cols-12 gap-2 px-4 py-2.5 border-t border-white/5 hover:bg-white/3 transition-colors text-xs">
                  <span className="col-span-1 font-mono text-[#6e6a86]">{acc.code}</span>
                  <span className="col-span-5 text-white">{acc.name}</span>
                  <span className="col-span-3 text-center font-mono text-blue-400 font-bold">{debitAmt > 0 ? formatNum(debitAmt) : "—"}</span>
                  <span className="col-span-3 text-center font-mono text-red-400 font-bold">{creditAmt > 0 ? formatNum(creditAmt) : "—"}</span>
                </div>
              );
            })}
            <div className="grid grid-cols-12 gap-2 px-4 py-3 border-t-2 border-teal-400/30 bg-teal-500/5 text-xs font-bold">
              <span className="col-span-6 text-teal-400">الإجمالي</span>
              <span className="col-span-3 text-center font-mono text-blue-400">{formatNum(totalDebit)}</span>
              <span className="col-span-3 text-center font-mono text-red-400">{formatNum(totalCredit)}</span>
            </div>
          </div>

          <div className={`rounded-xl p-4 border ${isBalanced ? "border-emerald-500/20 bg-emerald-500/5" : "border-red-500/20 bg-red-500/5"}`}>
            <div className="flex items-center gap-2 mb-2">
              {isBalanced ? (
                <><Check className="w-4 h-4 text-emerald-400" /><span className="text-sm font-bold text-emerald-400">ميزان المراجعة متوازن ✓</span></>
              ) : (
                <><AlertTriangle className="w-4 h-4 text-red-400" /><span className="text-sm font-bold text-red-400">ميزان المراجعة غير متوازن (فرق: {formatNum(Math.abs(totalDebit - totalCredit))})</span></>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl border border-white/5 p-4 space-y-2">
              <h4 className="text-xs font-bold text-white mb-2">قائمة الدخل المختصرة</h4>
              <div className="flex justify-between text-xs">
                <span className="text-[#a6adc8]">إجمالي الإيرادات</span>
                <span className="text-emerald-400 font-mono font-bold">{formatNum(totalRevenue)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#a6adc8]">إجمالي المصروفات</span>
                <span className="text-red-400 font-mono font-bold">({formatNum(totalExpense)})</span>
              </div>
              <div className="border-t border-white/10 pt-2 flex justify-between text-sm">
                <span className="font-bold text-white">{netIncome >= 0 ? "صافي الربح" : "صافي الخسارة"}</span>
                <span className={`font-bold font-mono ${netIncome >= 0 ? "text-emerald-400" : "text-red-400"}`}>{formatNum(Math.abs(netIncome))}</span>
              </div>
            </div>

            <div className="rounded-xl border border-white/5 p-4 space-y-2">
              <h4 className="text-xs font-bold text-white mb-2">المركز المالي المختصر</h4>
              <div className="flex justify-between text-xs">
                <span className="text-[#a6adc8]">إجمالي الأصول</span>
                <span className="text-blue-400 font-mono font-bold">{formatNum(totalAssets)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#a6adc8]">إجمالي الخصوم</span>
                <span className="text-red-400 font-mono font-bold">{formatNum(totalLiabilities)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#a6adc8]">حقوق الملكية</span>
                <span className="text-purple-400 font-mono font-bold">{formatNum(totalEquity)}</span>
              </div>
              <div className="border-t border-white/10 pt-2 flex justify-between text-xs">
                <span className="text-[#a6adc8]">الخصوم + الملكية</span>
                <span className="text-amber-400 font-mono font-bold">{formatNum(totalLiabilities + totalEquity)}</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
