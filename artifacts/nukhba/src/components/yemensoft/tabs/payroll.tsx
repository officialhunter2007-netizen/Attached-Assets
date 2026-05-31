import { useState } from "react";
import { Users, Plus, DollarSign, Check } from "lucide-react";
import { useSimulator } from "../context";
import { SimField, ShareButton, ActionButton, Badge, EmptyState } from "../shared-ui";
import { formatNum } from "../utils";
import type { Employee, PayrollRun, PayrollEntry } from "../types";

export function PayrollTab() {
  const { employees, setEmployees, payrollRuns, setPayrollRuns, addJournalEntry, addAudit, onShareWithTeacher } = useSimulator();
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [showRunPayroll, setShowRunPayroll] = useState(false);
  const [name, setName] = useState("");
  const [position, setPosition] = useState("");
  const [department, setDepartment] = useState("الإدارة العامة");
  const [baseSalary, setBaseSalary] = useState("");
  const [housing, setHousing] = useState("0");
  const [transport, setTransport] = useState("0");
  const [insurance, setInsurance] = useState("0");
  const [otherDed, setOtherDed] = useState("0");
  const [payMonth, setPayMonth] = useState(String(new Date().getMonth() + 1));
  const [payYear, setPayYear] = useState(String(new Date().getFullYear()));

  const addEmployee = () => {
    if (!name.trim() || Number(baseSalary) <= 0) return;
    setEmployees(prev => [...prev, {
      id: prev.length + 1, name, position, department,
      baseSalary: Number(baseSalary),
      housingAllowance: Number(housing),
      transportAllowance: Number(transport),
      socialInsurance: Number(insurance),
      otherDeductions: Number(otherDed),
    }]);
    addAudit("إضافة موظف", "الرواتب", name);
    setName(""); setPosition(""); setBaseSalary(""); setHousing("0"); setTransport("0"); setInsurance("0"); setOtherDed("0"); setShowAddEmployee(false);
  };

  const runPayroll = () => {
    if (employees.length === 0) return;
    const month = Number(payMonth); const year = Number(payYear);
    if (payrollRuns.find(r => r.month === month && r.year === year)) return;

    const payEntries: PayrollEntry[] = employees.map(emp => {
      const allowances = emp.housingAllowance + emp.transportAllowance;
      const gross = emp.baseSalary + allowances;
      const deductions = emp.socialInsurance + emp.otherDeductions;
      return { employeeId: emp.id, employeeName: emp.name, basic: emp.baseSalary, allowances, grossSalary: gross, deductions, netSalary: gross - deductions };
    });

    const totalGross = payEntries.reduce((s, e) => s + e.grossSalary, 0);
    const totalDed = payEntries.reduce((s, e) => s + e.deductions, 0);
    const totalNet = payEntries.reduce((s, e) => s + e.netSalary, 0);
    const totalInsurance = employees.reduce((s, e) => s + e.socialInsurance, 0);
    const totalHousing = employees.reduce((s, e) => s + e.housingAllowance, 0);
    const totalTransport = employees.reduce((s, e) => s + e.transportAllowance, 0);
    const totalBasic = employees.reduce((s, e) => s + e.baseSalary, 0);

    const run: PayrollRun = { id: payrollRuns.length + 1, month, year, entries: payEntries, totalGross, totalDeductions: totalDed, totalNet, isPosted: false };
    setPayrollRuns(prev => [...prev, run]);
    addAudit("تشغيل مسير رواتب", "الرواتب", `${month}/${year}`);
    setShowRunPayroll(false);
  };

  const postPayroll = (run: PayrollRun) => {
    const totalBasic = run.entries.reduce((s, e) => s + e.basic, 0);
    const totalHousing = employees.reduce((s, e) => s + e.housingAllowance, 0);
    const totalTransport = employees.reduce((s, e) => s + e.transportAllowance, 0);
    const totalInsurance = employees.reduce((s, e) => s + e.socialInsurance, 0);

    const lines = [
      { accountCode: "5200", debit: totalBasic, credit: 0, description: "رواتب وأجور" },
    ];
    if (totalHousing > 0) lines.push({ accountCode: "5900", debit: totalHousing, credit: 0, description: "بدل سكن" });
    if (totalTransport > 0) lines.push({ accountCode: "5950", debit: totalTransport, credit: 0, description: "بدل مواصلات" });
    lines.push({ accountCode: "2500", debit: 0, credit: run.totalNet, description: "رواتب مستحقة" });
    if (totalInsurance > 0) lines.push({ accountCode: "2700", debit: 0, credit: totalInsurance, description: "تأمينات مستحقة" });

    addJournalEntry(`${run.year}-${String(run.month).padStart(2, "0")}-28`, `مسير رواتب شهر ${run.month}/${run.year}`, lines, "الرواتب");
    setPayrollRuns(prev => prev.map(r => r.id === run.id ? { ...r, isPosted: true } : r));
  };

  const share = () => {
    if (!onShareWithTeacher) return;
    let text = `تقرير الرواتب:\n\nعدد الموظفين: ${employees.length}\n\n`;
    for (const emp of employees) {
      const gross = emp.baseSalary + emp.housingAllowance + emp.transportAllowance;
      const net = gross - emp.socialInsurance - emp.otherDeductions;
      text += `• ${emp.name} (${emp.position} — ${emp.department})\n  الأساسي: ${formatNum(emp.baseSalary)} | الإجمالي: ${formatNum(gross)} | الصافي: ${formatNum(net)}\n`;
    }
    if (payrollRuns.length > 0) {
      text += `\nمسيرات الرواتب: ${payrollRuns.length}\n`;
      for (const r of payrollRuns) text += `  ${r.month}/${r.year}: إجمالي ${formatNum(r.totalGross)} | صافي ${formatNum(r.totalNet)} [${r.isPosted ? "مرحّل" : "غير مرحّل"}]\n`;
    }
    onShareWithTeacher(text);
  };

  return (
    <div className="p-3 sm:p-4 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-bold text-white flex items-center gap-2"><Users className="w-4 h-4 text-teal-400" /> نظام الرواتب</h3>
        <div className="flex items-center gap-2">
          {onShareWithTeacher && <ShareButton onClick={share} />}
          <button onClick={() => setShowRunPayroll(!showRunPayroll)} className="text-[11px] text-amber-400 flex items-center gap-1 hover:text-amber-300"><DollarSign className="w-3 h-3" /> تشغيل المسير</button>
          <button onClick={() => setShowAddEmployee(!showAddEmployee)} className="text-[11px] text-teal-400 flex items-center gap-1 hover:text-teal-300"><Plus className="w-3 h-3" /> موظف جديد</button>
        </div>
      </div>

      {showAddEmployee && (
        <div className="rounded-xl border border-teal-500/20 bg-teal-500/5 p-3 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <SimField label="اسم الموظف" value={name} onChange={setName} placeholder="مثال: أحمد محمد" />
            <SimField label="المسمى الوظيفي" value={position} onChange={setPosition} placeholder="محاسب" />
            <SimField label="القسم" value={department} onChange={setDepartment} placeholder="الإدارة المالية" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <SimField label="الراتب الأساسي" value={baseSalary} onChange={setBaseSalary} type="number" dir="ltr" />
            <SimField label="بدل سكن" value={housing} onChange={setHousing} type="number" dir="ltr" />
            <SimField label="بدل مواصلات" value={transport} onChange={setTransport} type="number" dir="ltr" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <SimField label="تأمينات اجتماعية" value={insurance} onChange={setInsurance} type="number" dir="ltr" />
            <SimField label="خصومات أخرى" value={otherDed} onChange={setOtherDed} type="number" dir="ltr" />
          </div>
          <div className="flex justify-end"><ActionButton onClick={addEmployee} disabled={!name.trim() || Number(baseSalary) <= 0}>إضافة الموظف</ActionButton></div>
        </div>
      )}

      {showRunPayroll && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <SimField label="الشهر" value={payMonth} onChange={setPayMonth} type="number" dir="ltr" />
            <SimField label="السنة" value={payYear} onChange={setPayYear} type="number" dir="ltr" />
          </div>
          <div className="flex justify-end"><ActionButton onClick={runPayroll} disabled={employees.length === 0} variant="amber">تشغيل المسير</ActionButton></div>
        </div>
      )}

      {employees.length === 0 ? (
        <EmptyState icon={<Users className="w-10 h-10" />} title="لا يوجد موظفين" subtitle="أضف موظفين لإعداد مسير الرواتب" />
      ) : (
        <>
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-[#a6adc8]">الموظفون ({employees.length})</h4>
            {employees.map(emp => {
              const gross = emp.baseSalary + emp.housingAllowance + emp.transportAllowance;
              const net = gross - emp.socialInsurance - emp.otherDeductions;
              return (
                <div key={emp.id} className="rounded-xl border border-white/5 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-bold text-white">{emp.name}</span>
                    <span className="text-[10px] text-[#6e6a86]">{emp.position} — {emp.department}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
                    <div><span className="text-[#6e6a86]">الأساسي: </span><span className="text-white font-mono">{formatNum(emp.baseSalary)}</span></div>
                    <div><span className="text-[#6e6a86]">الإجمالي: </span><span className="text-blue-400 font-mono">{formatNum(gross)}</span></div>
                    <div><span className="text-[#6e6a86]">الصافي: </span><span className="text-emerald-400 font-mono">{formatNum(net)}</span></div>
                  </div>
                </div>
              );
            })}
          </div>

          {payrollRuns.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-[#a6adc8]">مسيرات الرواتب</h4>
              {payrollRuns.map(run => (
                <div key={run.id} className={`rounded-xl border p-3 ${run.isPosted ? "border-emerald-500/20 bg-emerald-500/5" : "border-amber-500/20 bg-amber-500/5"}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-bold text-white">شهر {run.month}/{run.year}</span>
                    <div className="flex items-center gap-2">
                      <Badge color={run.isPosted ? "emerald" : "amber"}>{run.isPosted ? "مرحّل ✓" : "غير مرحّل"}</Badge>
                      {!run.isPosted && <button onClick={() => postPayroll(run)} className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-400 font-bold">ترحيل</button>}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
                    <div><span className="text-[#6e6a86]">الإجمالي: </span><span className="text-blue-400 font-mono">{formatNum(run.totalGross)}</span></div>
                    <div><span className="text-[#6e6a86]">الخصومات: </span><span className="text-red-400 font-mono">{formatNum(run.totalDeductions)}</span></div>
                    <div><span className="text-[#6e6a86]">الصافي: </span><span className="text-emerald-400 font-mono">{formatNum(run.totalNet)}</span></div>
                  </div>
                  <div className="mt-2 space-y-1">
                    {run.entries.map((e, i) => (
                      <div key={i} className="flex items-center justify-between text-[10px] px-2 py-1 rounded bg-white/3">
                        <span className="text-white">{e.employeeName}</span>
                        <span className="text-emerald-400 font-mono">{formatNum(e.netSalary)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
