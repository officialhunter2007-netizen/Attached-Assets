import { useState, useMemo } from "react";
import { FileText, Plus, ChevronDown, ChevronUp, TrendingUp, TrendingDown, Building2, Wallet, Receipt } from "lucide-react";
import { useSimulator } from "../context";
import { SimField, SimSelect, ShareButton } from "../shared-ui";
import { formatNum } from "../utils";
import type { Account } from "../types";

const typeColors: Record<string, string> = { asset: "text-blue-400", liability: "text-red-400", equity: "text-purple-400", revenue: "text-emerald-400", expense: "text-amber-400" };
const typeLabels: Record<string, string> = { asset: "أصول", liability: "خصوم", equity: "حقوق ملكية", revenue: "إيرادات", expense: "مصروفات" };
const typeIcons: Record<string, React.ReactNode> = {
  asset: <TrendingUp className="w-3.5 h-3.5" />, liability: <TrendingDown className="w-3.5 h-3.5" />,
  equity: <Building2 className="w-3.5 h-3.5" />, revenue: <Wallet className="w-3.5 h-3.5" />, expense: <Receipt className="w-3.5 h-3.5" />,
};

export function AccountsTab() {
  const { accounts, setAccounts, onShareWithTeacher } = useSimulator();
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set(["asset", "liability", "equity", "revenue", "expense"]));
  const [showAdd, setShowAdd] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<Account["type"]>("asset");
  const [newParent, setNewParent] = useState("");

  const toggleType = (type: string) => {
    setExpandedTypes(prev => { const next = new Set(prev); next.has(type) ? next.delete(type) : next.add(type); return next; });
  };

  const addAccount = () => {
    if (!newCode.trim() || !newName.trim()) return;
    if (accounts.find(a => a.code === newCode)) return;
    setAccounts([...accounts, { code: newCode, name: newName, type: newType, parent: newParent || undefined, balance: 0 }]);
    setNewCode(""); setNewName(""); setShowAdd(false);
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
        for (const c of children) text += `    ${c.code} — ${c.name} (رصيد: ${formatNum(c.balance)} ريال)\n`;
      }
    }
    onShareWithTeacher(text);
  };

  return (
    <div className="p-3 sm:p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white flex items-center gap-2"><FileText className="w-4 h-4 text-teal-400" /> شجرة الحسابات</h3>
        <div className="flex items-center gap-2">
          {onShareWithTeacher && <ShareButton onClick={shareAccounts} />}
          <button onClick={() => setShowAdd(!showAdd)} className="text-[11px] text-teal-400 flex items-center gap-1 hover:text-teal-300 transition-colors"><Plus className="w-3 h-3" /> حساب جديد</button>
        </div>
      </div>

      {showAdd && (
        <div className="rounded-xl border border-teal-500/20 bg-teal-500/5 p-3 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <SimField label="رقم الحساب" value={newCode} onChange={setNewCode} placeholder="مثال: 1600" dir="ltr" />
            <SimField label="اسم الحساب" value={newName} onChange={setNewName} placeholder="مثال: استثمارات" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <SimSelect label="نوع الحساب" value={newType} onChange={v => setNewType(v as Account["type"])} options={Object.entries(typeLabels).map(([v, l]) => ({ value: v, label: l }))} />
            <SimSelect label="الحساب الرئيسي" value={newParent} onChange={setNewParent} options={[{ value: "", label: "بدون (حساب رئيسي)" }, ...accounts.filter(a => !a.parent).map(a => ({ value: a.code, label: `${a.code} — ${a.name}` }))]} />
          </div>
          <div className="flex justify-end">
            <button onClick={addAccount} disabled={!newCode.trim() || !newName.trim()} className="text-xs font-bold px-4 py-2 rounded-xl bg-teal-600 text-white hover:bg-teal-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all">إضافة</button>
          </div>
        </div>
      )}

      {Object.entries(groupedAccounts).map(([type, accs]) => {
        const parents = accs.filter(a => !a.parent);
        const isExpanded = expandedTypes.has(type);
        const totalBalance = accs.filter(a => a.parent).reduce((s, a) => s + a.balance, 0);
        return (
          <div key={type} className="rounded-xl border border-white/5 overflow-hidden">
            <button onClick={() => toggleType(type)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors">
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
                          <span className={`text-xs font-mono font-bold ${child.balance >= 0 ? "text-emerald-400" : "text-red-400"}`}>{formatNum(child.balance)}</span>
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
