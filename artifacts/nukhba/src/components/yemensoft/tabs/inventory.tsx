import { useState } from "react";
import { Package, Plus, ArrowLeftRight, Search } from "lucide-react";
import { useSimulator } from "../context";
import { SimField, SimSelect, ShareButton, ActionButton } from "../shared-ui";
import { formatNum, todayStr } from "../utils";

export function InventoryTab() {
  const { inventory, setInventory, movements, setMovements, movementCounter, setMovementCounter, accounts, setAccounts, updateAccountBalance, addAudit, onShareWithTeacher } = useSimulator();
  const [showAddItem, setShowAddItem] = useState(false);
  const [showMovement, setShowMovement] = useState(false);
  const [newItem, setNewItem] = useState({ code: "", name: "", unit: "وحدة", qty: 0, avgCost: 0, category: "" });
  const [movType, setMovType] = useState<"in" | "out">("in");
  const [movItemCode, setMovItemCode] = useState("");
  const [movQty, setMovQty] = useState("");
  const [movCost, setMovCost] = useState("");
  const [movWarehouse, setMovWarehouse] = useState("المخزن الرئيسي");
  const [movNote, setMovNote] = useState("");
  const [movDate, setMovDate] = useState(todayStr());
  const [searchTerm, setSearchTerm] = useState("");

  const filteredInventory = inventory.filter(item => item.name.includes(searchTerm) || item.code.includes(searchTerm));
  const totalInventoryValue = inventory.reduce((s, it) => s + it.qty * it.avgCost, 0);

  const addNewItem = () => {
    if (!newItem.code.trim() || !newItem.name.trim()) return;
    if (inventory.find(i => i.code === newItem.code)) return;
    setInventory(prev => [...prev, { ...newItem }]);
    addAudit("إضافة صنف", "المخزون", newItem.name);
    setNewItem({ code: "", name: "", unit: "وحدة", qty: 0, avgCost: 0, category: "" });
    setShowAddItem(false);
  };

  const processMovement = () => {
    const qty = Number(movQty); const cost = Number(movCost);
    if (!movItemCode || qty <= 0) return;
    const item = inventory.find(i => i.code === movItemCode);
    if (!item) return;
    if (movType === "out" && qty > item.qty) return;

    setMovements(prev => [...prev, { id: movementCounter, date: movDate, type: movType, itemCode: movItemCode, qty, unitCost: cost || item.avgCost, warehouse: movWarehouse, note: movNote }]);
    setMovementCounter(prev => prev + 1);

    setInventory(prev => prev.map(it => {
      if (it.code !== movItemCode) return it;
      if (movType === "in") {
        const totalCost = it.qty * it.avgCost + qty * (cost || it.avgCost);
        const totalQty = it.qty + qty;
        return { ...it, qty: totalQty, avgCost: totalQty > 0 ? totalCost / totalQty : 0 };
      }
      return { ...it, qty: it.qty - qty };
    }));

    if (movType === "in" && cost > 0) {
      let updated = updateAccountBalance("1400", qty * cost, 0, accounts);
      updated = updateAccountBalance("1100", 0, qty * cost, updated);
      setAccounts(updated);
    } else if (movType === "out") {
      const costOfGoods = qty * item.avgCost;
      let updated = updateAccountBalance("5100", costOfGoods, 0, accounts);
      updated = updateAccountBalance("1400", 0, costOfGoods, updated);
      setAccounts(updated);
    }
    addAudit(movType === "in" ? "إدخال مخزون" : "إخراج مخزون", "المخزون", `${qty} ${item.name}`);
    setMovQty(""); setMovCost(""); setMovNote(""); setShowMovement(false);
  };

  const shareInventory = () => {
    if (!onShareWithTeacher) return;
    let text = `تقرير المخزون الحالي:\nإجمالي قيمة المخزون: ${formatNum(totalInventoryValue)} ريال\n\n`;
    for (const item of inventory) text += `• ${item.code} — ${item.name}: ${item.qty} ${item.unit} × ${formatNum(item.avgCost)} = ${formatNum(item.qty * item.avgCost)} ريال\n`;
    onShareWithTeacher(text);
  };

  return (
    <div className="p-3 sm:p-4 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-bold text-white flex items-center gap-2"><Package className="w-4 h-4 text-teal-400" /> إدارة المخزون</h3>
        <div className="flex items-center gap-2">
          {onShareWithTeacher && <ShareButton onClick={shareInventory} />}
          <button onClick={() => setShowMovement(!showMovement)} className="text-[11px] text-amber-400 flex items-center gap-1 hover:text-amber-300 transition-colors"><ArrowLeftRight className="w-3 h-3" /> حركة مخزنية</button>
          <button onClick={() => setShowAddItem(!showAddItem)} className="text-[11px] text-teal-400 flex items-center gap-1 hover:text-teal-300 transition-colors"><Plus className="w-3 h-3" /> صنف جديد</button>
        </div>
      </div>

      {showAddItem && (
        <div className="rounded-xl border border-teal-500/20 bg-teal-500/5 p-3 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <SimField label="رمز الصنف" value={newItem.code} onChange={v => setNewItem(p => ({ ...p, code: v }))} placeholder="ITM005" dir="ltr" />
            <SimField label="اسم الصنف" value={newItem.name} onChange={v => setNewItem(p => ({ ...p, name: v }))} placeholder="مثال: شاشة عرض" />
            <SimField label="الوحدة" value={newItem.unit} onChange={v => setNewItem(p => ({ ...p, unit: v }))} placeholder="جهاز / كيلو" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <SimField label="الكمية" value={String(newItem.qty)} onChange={v => setNewItem(p => ({ ...p, qty: Number(v) }))} type="number" dir="ltr" />
            <SimField label="التكلفة" value={String(newItem.avgCost)} onChange={v => setNewItem(p => ({ ...p, avgCost: Number(v) }))} type="number" dir="ltr" />
            <SimField label="التصنيف" value={newItem.category} onChange={v => setNewItem(p => ({ ...p, category: v }))} placeholder="إلكترونيات" />
          </div>
          <div className="flex justify-end"><ActionButton onClick={addNewItem} disabled={!newItem.code.trim() || !newItem.name.trim()}>إضافة</ActionButton></div>
        </div>
      )}

      {showMovement && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 space-y-3">
          <div className="flex gap-2 mb-2">
            <button onClick={() => setMovType("in")} className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${movType === "in" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "border-white/5 text-[#6e6a86]"}`}>سند إدخال</button>
            <button onClick={() => setMovType("out")} className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${movType === "out" ? "bg-red-500/10 border-red-500/30 text-red-400" : "border-white/5 text-[#6e6a86]"}`}>سند إخراج</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <SimField label="التاريخ" value={movDate} onChange={setMovDate} type="date" dir="ltr" />
            <SimSelect label="الصنف" value={movItemCode} onChange={setMovItemCode} options={[{ value: "", label: "اختر صنف..." }, ...inventory.map(i => ({ value: i.code, label: `${i.code} — ${i.name} (${i.qty})` }))]} />
            <SimField label="الكمية" value={movQty} onChange={setMovQty} type="number" dir="ltr" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {movType === "in" && <SimField label="تكلفة الوحدة" value={movCost} onChange={setMovCost} type="number" dir="ltr" />}
            <SimField label="المخزن" value={movWarehouse} onChange={setMovWarehouse} placeholder="المخزن الرئيسي" />
            <SimField label="ملاحظة" value={movNote} onChange={setMovNote} placeholder="سبب الحركة" />
          </div>
          <div className="flex justify-end"><ActionButton onClick={processMovement} disabled={!movItemCode || Number(movQty) <= 0} variant="amber">تنفيذ الحركة</ActionButton></div>
        </div>
      )}

      <div className="relative">
        <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-[#6e6a86]" />
        <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="بحث بالاسم أو الرمز..." className="w-full bg-[#1e1e2e] border border-white/10 rounded-lg pr-9 pl-3 py-2 text-xs text-white outline-none focus:border-teal-400/50" />
      </div>

      <div className="rounded-xl border border-white/5 overflow-hidden">
        <div className="hidden sm:grid grid-cols-12 gap-2 px-4 py-2 bg-white/5 text-[10px] text-[#6e6a86] font-bold">
          <span className="col-span-2">الرمز</span><span className="col-span-3">الصنف</span><span className="col-span-2">الكمية</span><span className="col-span-2">المتوسط</span><span className="col-span-3">القيمة</span>
        </div>
        {filteredInventory.map(item => (
          <div key={item.code}>
            <div className="hidden sm:grid grid-cols-12 gap-2 px-4 py-2.5 border-t border-white/5 hover:bg-white/3 transition-colors text-xs">
              <span className="col-span-2 font-mono text-[#6e6a86]">{item.code}</span>
              <span className="col-span-3 text-white">{item.name}</span>
              <span className={`col-span-2 font-mono font-bold ${item.qty <= 0 ? "text-red-400" : item.qty <= 3 ? "text-amber-400" : "text-emerald-400"}`}>{item.qty} {item.unit}</span>
              <span className="col-span-2 font-mono text-[#a6adc8]">{formatNum(item.avgCost)}</span>
              <span className="col-span-3 font-mono font-bold text-amber-400">{formatNum(item.qty * item.avgCost)}</span>
            </div>
            <div className="sm:hidden border-t border-white/5 px-3 py-2.5 space-y-1">
              <div className="flex items-center justify-between"><span className="text-xs text-white font-bold">{item.name}</span><span className="text-[10px] font-mono text-[#6e6a86]">{item.code}</span></div>
              <div className="flex items-center justify-between text-[11px]">
                <span className={`font-mono font-bold ${item.qty <= 0 ? "text-red-400" : item.qty <= 3 ? "text-amber-400" : "text-emerald-400"}`}>{item.qty} {item.unit}</span>
                <span className="font-mono font-bold text-amber-400">{formatNum(item.qty * item.avgCost)}</span>
              </div>
            </div>
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
              <div key={m.id} className="flex flex-wrap items-center gap-2 text-[11px] text-[#a6adc8] px-2 py-1.5 rounded-lg bg-white/3">
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${m.type === "in" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>{m.type === "in" ? "إدخال" : "إخراج"}</span>
                <span>{m.qty} {item?.name}</span><span className="text-[#6e6a86]">{m.warehouse}</span><span className="mr-auto text-[#6e6a86]">{m.date}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
