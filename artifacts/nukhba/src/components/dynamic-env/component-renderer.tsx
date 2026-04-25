import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { DynComponent, DynFormField, DynMutation } from "./types";
import { useEnvState, envUtils } from "./state-engine";
import { useEnvTheme } from "./theme";

type Ctx = {
  onAction?: (action: { type: string; [k: string]: any }) => void;
  onGoToScreen?: (screenId: string) => void;
  onAskAi?: (prompt: string) => void;
};

function arr<T>(v: any): T[] {
  return Array.isArray(v) ? v : [];
}

function fmtNumber(v: any, format?: string, decimals = 2): string {
  const n = envUtils.toNumber(v);
  if (format === "currency") return n.toLocaleString("ar-EG", { maximumFractionDigits: decimals }) + " ر.ي";
  if (format === "percent") return (n * 100).toFixed(decimals) + "%";
  if (format === "number") return n.toLocaleString("ar-EG", { maximumFractionDigits: decimals });
  return v == null ? "" : String(v);
}

function Card({ title, action, children, accentBar = true }: { title?: string; action?: ReactNode; children: ReactNode; accentBar?: boolean }) {
  const t = useEnvTheme();
  // The themed surface uses CSS vars set by the shell. The optional accent
  // bar (right-side in RTL) gives every subject a recognisable visual stripe
  // without overwhelming the content.
  return (
    <div
      className="relative rounded-xl border p-4 mb-3"
      style={{
        background: "var(--env-surface, rgba(255,255,255,0.04))",
        borderColor: "var(--env-surface-border, rgba(255,255,255,0.10))",
      }}
    >
      {accentBar && (
        <span
          aria-hidden
          className="absolute top-3 bottom-3 right-0 w-[3px] rounded-l-full opacity-70"
          style={{ background: t.accent }}
        />
      )}
      {(title || action) && (
        <div className="flex items-center justify-between mb-3">
          {title && <h3 className="font-bold text-white text-base leading-tight">{title}</h3>}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

function toneClasses(tone: "info" | "warn" | "error" | "success") {
  switch (tone) {
    case "success": return "bg-green-500/10 border-green-500/30 text-green-300";
    case "warn": return "bg-yellow-500/10 border-yellow-500/30 text-yellow-300";
    case "error": return "bg-red-500/10 border-red-500/30 text-red-300";
    default: return "bg-blue-500/10 border-blue-500/30 text-blue-300";
  }
}

// ─── Form Block ──────────────────────────────────────────────────────────────
function FormBlock({ comp, ctx }: { comp: Extract<DynComponent, { type: "form" }>; ctx: Ctx }) {
  const env = useEnvState();
  const initialVals = useMemo(() => {
    const v: Record<string, any> = {};
    (comp.fields || []).forEach((f: any) => {
      if (f.default !== undefined) v[f.name] = f.default;
    });
    return v;
  }, [comp.fields]);
  const [values, setValues] = useState<Record<string, any>>(initialVals);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  const setVal = (k: string, v: any) => setValues((p) => ({ ...p, [k]: v }));

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Universal required-field check before any submit handler runs, so empty
    // required fields can never silently pass through check/mutate/ask-ai.
    const missing: string[] = [];
    for (const f of (comp.fields || []) as any[]) {
      if (!f?.required) continue;
      const v = values[f.name];
      const empty =
        v === undefined || v === null || v === "" ||
        (typeof v === "string" && v.trim() === "") ||
        (Array.isArray(v) && v.length === 0);
      if (empty) missing.push(f.label || f.name);
    }
    if (missing.length > 0) {
      setFeedback({ ok: false, msg: `الحقول المطلوبة فارغة: ${missing.join("، ")}` });
      return;
    }
    if (!comp.submit || typeof (comp.submit as any).type !== "string") {
      setFeedback({ ok: false, msg: "هذا الزر غير مكتمل التهيئة من المعلم الذكي. اطلب منه إعادة بناء البيئة أو وضّح طلبك." });
      return;
    }
    if (comp.submit.type === "mutate" && (!Array.isArray(comp.submit.ops) || comp.submit.ops.length === 0)) {
      setFeedback({ ok: false, msg: "هذا الزر معطّل: لا يحتوي على أي عملية فعلية. اطلب من المعلم الذكي إعادة بناء البيئة." });
      return;
    }
    if (comp.submit.type === "ask-ai" && !String((comp.submit as any).prompt || "").trim()) {
      setFeedback({ ok: false, msg: "هذا الزر يرسل سؤالاً للمعلم لكن السؤال مفقود. أعد بناء البيئة." });
      return;
    }
    if (comp.submit.type === "check") {
      const tol = comp.submit.tolerance ?? 0.01;
      let allOk = true;
      const wrong: string[] = [];
      for (const [k, expected] of Object.entries(comp.submit.expected)) {
        const got = String(values[k] ?? "").trim();
        if (typeof expected === "number") {
          // Normalize Arabic/Persian digits and Arabic separators to ASCII
          // so users can type "١٢٬٣٤٥٫٦٧" or "12,345.67" and both parse.
          const normalized = normalizeArabicDigits(got).replace(/[,،٬\s]/g, "");
          const n = parseFloat(normalized);
          if (isNaN(n) || Math.abs(n - expected) > Math.abs(expected * tol) + 0.0001) { allOk = false; wrong.push(k); }
        } else {
          const norm = (s: string) => normalizeArabicDigits(s).toLowerCase().replace(/\s+/g, "");
          if (norm(got) !== norm(String(expected))) { allOk = false; wrong.push(k); }
        }
      }
      setFeedback({ ok: allOk, msg: allOk ? (comp.submit.correctMessage || "إجابة صحيحة! ✓") : (comp.submit.incorrectMessage || `راجع الحقول: ${wrong.join("، ")}`) });
    } else if (comp.submit.type === "ask-ai") {
      const filled = Object.entries(values).map(([k, v]) => `${k}: ${v}`).join("\n");
      ctx.onAskAi?.(`${comp.submit.prompt}\n\nإجابة الطالب:\n${filled}`);
      setFeedback({ ok: true, msg: "تم إرسال إجابتك للمعلم الذكي للمراجعة." });
    } else if (comp.submit.type === "mutate") {
      // Run validations
      const validations = comp.submit.validate || [];
      for (const v of validations) {
        if (v.rule === "balanced-journal") {
          const debit = envUtils.toNumber(values.debit ?? values["مدين"] ?? 0);
          const credit = envUtils.toNumber(values.credit ?? values["دائن"] ?? 0);
          if (Math.abs(debit - credit) > 0.001) {
            setFeedback({ ok: false, msg: v.message || "القيد غير متوازن (مدين ≠ دائن)" });
            return;
          }
        } else if (v.rule === "positive-balance") {
          const cur = envUtils.toNumber(envUtils.getByPath(env.state, v.field || ""));
          const sub = envUtils.toNumber(values.amount ?? 0);
          if (cur - sub < 0) {
            setFeedback({ ok: false, msg: v.message || "الرصيد غير كافٍ" });
            return;
          }
        } else if (v.rule === "non-empty") {
          if (!values[v.field || ""]) {
            setFeedback({ ok: false, msg: v.message || `الحقل ${v.field} مطلوب` });
            return;
          }
        }
      }
      env.mutate(comp.submit.ops || [], values);
      setFeedback({ ok: true, msg: comp.submit.successMessage || "تم تنفيذ العملية بنجاح ✓" });
      if (comp.submit.resetOnSubmit) setValues(initialVals);
    }
  };

  return (
    <Card title={comp.title}>
      {comp.description && <p className="text-sm text-white/70 mb-3">{comp.description}</p>}
      <form onSubmit={onSubmit} className="space-y-3">
        {(Array.isArray(comp.fields) ? comp.fields : []).map((f: DynFormField) => <FormFieldInput key={f.name} f={f} value={values[f.name]} onChange={(v) => setVal(f.name, v)} />)}
        <div className="flex gap-2 items-center">
          <button type="submit" className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold rounded-lg px-4 py-2 text-sm">{comp.submitLabel || "إرسال"}</button>
          {feedback && (
            <span className={`text-xs px-3 py-2 rounded-lg border ${toneClasses(feedback.ok ? "success" : "error")}`}>{feedback.msg}</span>
          )}
        </div>
      </form>
    </Card>
  );
}

function FormFieldInput({ f, value, onChange }: { f: DynFormField; value: any; onChange: (v: any) => void }) {
  const env = useEnvState();
  const baseCls = "w-full bg-black/30 border border-white/15 rounded-lg p-2 text-white text-sm";
  return (
    <div>
      <label className="block text-sm text-white/80 mb-1">
        {f.label}{(f as any).required && <span className="text-red-400 mr-1">*</span>}
        {"unit" in f && (f as any).unit && <span className="text-white/50 mr-2">({(f as any).unit})</span>}
      </label>
      {f.type === "textarea" ? (
        <textarea className={baseCls} rows={3} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
      ) : f.type === "select" ? (
        <select className={baseCls} value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
          <option value="">— اختر —</option>
          {(f as any).options?.map((o: string) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : f.type === "selectFromState" ? (
        (() => {
          const list = arr<any>(envUtils.getByPath(env.state, (f as any).statePath));
          const lk = (f as any).labelKey || "name";
          const vk = (f as any).valueKey || "id";
          return (
            <select className={baseCls} value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
              <option value="">— اختر —</option>
              {list.map((it: any, i: number) => (
                <option key={it?.[vk] ?? i} value={it?.[vk] ?? ""}>{it?.[lk] ?? it?.[vk] ?? ""}</option>
              ))}
            </select>
          );
        })()
      ) : f.type === "checkbox" ? (
        <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} className="w-4 h-4" />
      ) : f.type === "number" ? (
        <input
          className={baseCls}
          type="number"
          step="any"
          placeholder={(f as any).placeholder}
          value={value ?? ""}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === "") { onChange(""); return; }
            const n = Number(raw);
            onChange(Number.isFinite(n) ? n : raw);
          }}
        />
      ) : (
        <input
          className={baseCls}
          type={f.type === "date" ? "date" : "text"}
          placeholder={(f as any).placeholder}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}

// ─── Editable Table (CRUD) ───────────────────────────────────────────────────
function EditableTable({ comp }: { comp: Extract<DynComponent, { type: "editableTable" }> }) {
  const env = useEnvState();
  const items = arr<any>(envUtils.getByPath(env.state, comp.bindTo));
  const [draft, setDraft] = useState<Record<string, any>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editVals, setEditVals] = useState<Record<string, any>>({});
  const [search, setSearch] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const idField = comp.idField || "id";
  const allowAdd = comp.allowAdd !== false;
  const allowDelete = comp.allowDelete !== false;

  const filtered = search.trim()
    ? items.filter((it) => Object.values(it).some((v) => String(v ?? "").toLowerCase().includes(search.toLowerCase())))
    : items;

  const add = () => {
    setAddError(null);
    const empty = comp.columns.every((c) => {
      const v = draft[c.key];
      return v === undefined || v === null || (typeof v === "string" && v.trim() === "");
    });
    if (empty) {
      setAddError("لا يمكن إضافة صف فارغ — املأ حقلاً واحداً على الأقل.");
      return;
    }
    const draftId = draft[idField];
    if (draftId !== undefined && draftId !== "" && items.some((it) => String(it[idField]) === String(draftId))) {
      setAddError(`القيمة «${draftId}» موجودة في «${idField}» — يجب أن تكون فريدة.`);
      return;
    }
    const obj: any = { ...draft };
    for (const c of comp.columns) if (c.type === "number") obj[c.key] = envUtils.toNumber(obj[c.key]);
    env.mutate([{ op: "append", path: comp.bindTo, value: obj, idField }]);
    setDraft({});
  };

  const del = (id: any) => {
    env.mutate([{ op: "remove", path: comp.bindTo, matchField: idField, matchValue: id }]);
  };

  const startEdit = (it: any) => { setEditingId(it[idField]); setEditVals({ ...it }); };
  const saveEdit = () => {
    const patch: any = { ...editVals };
    for (const c of comp.columns) if (c.type === "number") patch[c.key] = envUtils.toNumber(patch[c.key]);
    env.mutate([{ op: "update", path: comp.bindTo, matchField: idField, matchValue: editingId, patch }]);
    setEditingId(null); setEditVals({});
  };

  // Mobile-friendly: bigger touch targets (≥44px on inputs/buttons), allow
  // horizontal scroll, and use slightly larger text in editing mode so
  // numeric/date inputs are easy to tap with a thumb.
  const inputCls = "w-full bg-black/30 border border-white/15 rounded px-2 py-2 text-white text-sm min-h-[40px]";

  return (
    <Card
      title={comp.title}
      action={<input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث..." className="text-sm bg-black/30 border border-white/15 rounded px-2 py-2 text-white w-32 min-h-[40px]" />}
    >
      <div className="overflow-x-auto -mx-2 md:mx-0 px-2 md:px-0">
        <table className="w-full text-sm text-right">
          <thead>
            <tr className="border-b border-white/10 text-white/70">
              {comp.columns.map((c) => <th key={c.key} className="px-2 py-2 font-medium text-xs">{c.label}</th>)}
              <th className="px-2 py-2 font-medium text-xs w-24">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={comp.columns.length + 1} className="px-2 py-4 text-center text-white/40 text-xs">لا توجد بيانات بعد — أضف صفاً جديداً.</td></tr>
            )}
            {filtered.map((it, i) => {
              const isEditing = editingId === it[idField];
              return (
                <tr key={it[idField] ?? i} className="border-b border-white/5">
                  {comp.columns.map((c) => (
                    <td key={c.key} className="px-2 py-2 text-white/90 text-xs">
                      {isEditing ? (
                        c.type === "select" ? (
                          <select className={inputCls} value={editVals[c.key] ?? ""} onChange={(e) => setEditVals((p) => ({ ...p, [c.key]: e.target.value }))}>
                            <option value="">—</option>
                            {(c.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
                          </select>
                        ) : (
                          <input className={inputCls} type={c.type === "number" ? "number" : c.type === "date" ? "date" : "text"} value={editVals[c.key] ?? ""} onChange={(e) => setEditVals((p) => ({ ...p, [c.key]: e.target.value }))} />
                        )
                      ) : (
                        c.type === "number" ? envUtils.toNumber(it[c.key]).toLocaleString("ar-EG") : (it[c.key] ?? "")
                      )}
                    </td>
                  ))}
                  <td className="px-2 py-2 text-xs">
                    <div className="flex gap-1 flex-wrap">
                      {isEditing ? (
                        <>
                          <button onClick={saveEdit} className="text-green-300 hover:text-green-200 px-3 py-2 rounded bg-green-500/10 min-h-[40px] text-sm font-bold">حفظ</button>
                          <button onClick={() => { setEditingId(null); setEditVals({}); }} className="text-white/60 hover:text-white px-3 py-2 rounded bg-white/5 min-h-[40px] text-sm">إلغاء</button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => startEdit(it)} className="text-cyan-300 hover:text-cyan-200 px-3 py-2 rounded bg-cyan-500/10 min-h-[40px] text-sm font-bold">تعديل</button>
                          {allowDelete && <button onClick={() => del(it[idField])} className="text-red-300 hover:text-red-200 px-3 py-2 rounded bg-red-500/10 min-h-[40px] text-sm">حذف</button>}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          {allowAdd && (
            <tfoot>
              <tr className="border-t-2 border-white/15 bg-black/30">
                {comp.columns.map((c) => (
                  <td key={c.key} className="px-2 py-2">
                    {c.type === "select" ? (
                      <select className={inputCls} value={draft[c.key] ?? ""} onChange={(e) => setDraft((p) => ({ ...p, [c.key]: e.target.value }))}>
                        <option value="">— {c.label} —</option>
                        {(c.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : (
                      <input className={inputCls} type={c.type === "number" ? "number" : c.type === "date" ? "date" : "text"} placeholder={c.label} value={draft[c.key] ?? ""} onChange={(e) => setDraft((p) => ({ ...p, [c.key]: e.target.value }))} />
                    )}
                  </td>
                ))}
                <td className="px-2 py-2">
                  <button onClick={add} className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold px-3 py-2 rounded text-sm w-full min-h-[44px]">+ إضافة</button>
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      {addError && (
        <div className="mt-2 text-xs text-red-300 bg-red-500/10 border border-red-500/30 rounded p-2">{addError}</div>
      )}
    </Card>
  );
}

// ─── Journal Editor (double-entry) ───────────────────────────────────────────
function JournalEditor({ comp }: { comp: Extract<DynComponent, { type: "journalEditor" }> }) {
  const env = useEnvState();
  const entries = arr<any>(envUtils.getByPath(env.state, comp.bindTo));
  const accounts = arr<any>(envUtils.getByPath(env.state, comp.accountsPath || "accounts"));
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [desc, setDesc] = useState("");
  const [lines, setLines] = useState<Array<{ account: string; debit: string; credit: string }>>([
    { account: "", debit: "", credit: "" },
    { account: "", debit: "", credit: "" },
  ]);
  const [error, setError] = useState<string | null>(null);

  const sumD = lines.reduce((s, l) => s + envUtils.toNumber(l.debit), 0);
  const sumC = lines.reduce((s, l) => s + envUtils.toNumber(l.credit), 0);
  const balanced = Math.abs(sumD - sumC) < 0.001 && sumD > 0;

  const setLine = (i: number, k: string, v: string) => {
    setLines((p) => p.map((l, idx) => (idx === i ? { ...l, [k]: v } : l)));
  };
  const addLine = () => setLines((p) => [...p, { account: "", debit: "", credit: "" }]);
  const delLine = (i: number) => setLines((p) => p.length > 2 ? p.filter((_, idx) => idx !== i) : p);

  const post = () => {
    if (!balanced) { setError("القيد غير متوازن أو فارغ. تحقق من المدين والدائن."); return; }
    if (!desc.trim()) { setError("يجب إدخال وصف القيد."); return; }
    const validLines = lines.filter((l) => l.account && (envUtils.toNumber(l.debit) > 0 || envUtils.toNumber(l.credit) > 0));
    if (validLines.length < 2) { setError("القيد يجب أن يحتوي على طرفين على الأقل."); return; }
    if (accounts.length > 0) {
      const codes = new Set(accounts.map((a: any) => String(a.code)));
      const missing = validLines
        .map((l) => l.account)
        .filter((acc) => !codes.has(String(acc)));
      if (missing.length > 0) {
        setError(`الحساب «${missing[0]}» غير موجود في دليل الحسابات.`);
        return;
      }
    }

    const entryId = `je-${Date.now()}`;
    env.mutate([
      { op: "append", path: comp.bindTo, value: { id: entryId, date, desc, lines: validLines } },
    ]);
    // Update account balances if accounts state exists
    if (accounts.length > 0) {
      const ops: DynMutation[] = validLines.map((l) => ({
        op: "incrementInArray",
        path: comp.accountsPath || "accounts",
        matchField: "code",
        matchValue: l.account,
        field: "balance",
        by: envUtils.toNumber(l.debit) - envUtils.toNumber(l.credit),
      }));
      env.mutate(ops);
    }
    setDesc(""); setLines([{ account: "", debit: "", credit: "" }, { account: "", debit: "", credit: "" }]); setError(null);
  };

  // Touch-friendly inputs (≥40px tall) so journal entries are usable on
  // small screens. Date/number inputs in particular need real space to tap.
  const inputCls = "w-full bg-black/30 border border-white/15 rounded px-2 py-2 text-white text-sm min-h-[40px]";

  return (
    <Card title={comp.title || "قيد يومية جديد"}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-xs text-white/70 mb-1">التاريخ</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="block text-xs text-white/70 mb-1">الوصف / البيان</label>
          <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="مثلاً: شراء بضاعة نقداً" className={inputCls} />
        </div>
      </div>
      <div className="overflow-x-auto -mx-2 md:mx-0 px-2 md:px-0">
      <table className="w-full text-xs text-right mb-3 min-w-[460px]">
        <thead>
          <tr className="border-b border-white/10 text-white/70">
            <th className="p-1.5 font-medium">الحساب</th>
            <th className="p-1.5 font-medium w-28">مدين</th>
            <th className="p-1.5 font-medium w-28">دائن</th>
            <th className="p-1.5 w-10"></th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l, i) => (
            <tr key={i} className="border-b border-white/5">
              <td className="p-1.5">
                {accounts.length > 0 ? (
                  <select className={inputCls} value={l.account} onChange={(e) => setLine(i, "account", e.target.value)}>
                    <option value="">— اختر حساباً —</option>
                    {accounts.map((a) => <option key={a.code} value={a.code}>{a.code} - {a.name}</option>)}
                  </select>
                ) : (
                  <input className={inputCls} value={l.account} onChange={(e) => setLine(i, "account", e.target.value)} placeholder="اسم الحساب" />
                )}
              </td>
              <td className="p-1.5"><input type="number" step="any" className={inputCls} value={l.debit} onChange={(e) => { setLine(i, "debit", e.target.value); if (e.target.value) setLine(i, "credit", ""); }} /></td>
              <td className="p-1.5"><input type="number" step="any" className={inputCls} value={l.credit} onChange={(e) => { setLine(i, "credit", e.target.value); if (e.target.value) setLine(i, "debit", ""); }} /></td>
              <td className="p-1.5 text-center"><button onClick={() => delLine(i)} className="text-red-300 hover:text-red-200">×</button></td>
            </tr>
          ))}
          <tr className="bg-white/5 font-bold">
            <td className="p-1.5 text-white/80">الإجمالي</td>
            <td className="p-1.5 text-green-300">{sumD.toLocaleString("ar-EG")}</td>
            <td className="p-1.5 text-red-300">{sumC.toLocaleString("ar-EG")}</td>
            <td></td>
          </tr>
        </tbody>
      </table>
      </div>
      <div className="flex gap-2 items-center flex-wrap">
        <button onClick={addLine} className="text-sm bg-white/10 hover:bg-white/15 px-4 py-2 rounded text-white min-h-[44px] font-bold">+ إضافة سطر</button>
        <button onClick={post} disabled={!balanced || !desc.trim()} className="text-sm bg-cyan-500 hover:bg-cyan-400 disabled:bg-white/10 disabled:text-white/40 text-slate-900 font-bold px-4 py-2 rounded min-h-[44px]">ترحيل القيد</button>
        {!balanced && sumD + sumC > 0 && <span className="text-xs text-red-300">⚠ غير متوازن (فرق: {Math.abs(sumD - sumC).toLocaleString("ar-EG")})</span>}
        {balanced && <span className="text-xs text-green-300">✓ القيد متوازن</span>}
        {error && <span className="text-xs text-red-300">{error}</span>}
      </div>

      {/* Posted journal entries */}
      {entries.length > 0 && (
        <div className="mt-4 pt-4 border-t border-white/10">
          <div className="text-xs text-white/60 mb-2">القيود المرحّلة ({entries.length}):</div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {entries.slice().reverse().map((e: any) => (
              <div key={e.id} className="border border-white/10 rounded p-2 text-xs">
                <div className="flex justify-between text-white/60 mb-1">
                  <span>{e.date}</span>
                  <button onClick={() => env.mutate([{ op: "remove", path: comp.bindTo, matchField: "id", matchValue: e.id }])} className="text-red-300 hover:text-red-200">حذف</button>
                </div>
                <div className="text-white/90 mb-1">{e.desc}</div>
                <table className="w-full text-[11px]">
                  <tbody>
                    {arr<any>(e.lines).map((l, i) => {
                      const acc = accounts.find((a: any) => a.code === l.account);
                      return (
                        <tr key={i}>
                          <td className="text-white/80 p-0.5">{acc ? `${acc.code} - ${acc.name}` : l.account}</td>
                          <td className="text-green-300 text-left p-0.5 w-20">{l.debit ? envUtils.toNumber(l.debit).toLocaleString("ar-EG") : "-"}</td>
                          <td className="text-red-300 text-left p-0.5 w-20">{l.credit ? envUtils.toNumber(l.credit).toLocaleString("ar-EG") : "-"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

// ─── Trial Balance (computed from journal entries) ───────────────────────────
function TrialBalance({ comp }: { comp: Extract<DynComponent, { type: "trialBalance" }> }) {
  const env = useEnvState();
  const entries = arr<any>(envUtils.getByPath(env.state, comp.entriesPath));
  const accounts = arr<any>(envUtils.getByPath(env.state, comp.accountsPath || "accounts"));

  const balances = useMemo(() => {
    const map: Record<string, { debit: number; credit: number }> = {};
    entries.forEach((e: any) => {
      arr<any>(e.lines).forEach((l: any) => {
        if (!map[l.account]) map[l.account] = { debit: 0, credit: 0 };
        map[l.account].debit += envUtils.toNumber(l.debit);
        map[l.account].credit += envUtils.toNumber(l.credit);
      });
    });
    return map;
  }, [entries]);

  const rows = Object.entries(balances).map(([code, v]) => {
    const acc = accounts.find((a: any) => a.code === code);
    const net = v.debit - v.credit;
    return { code, name: acc?.name || code, debit: net > 0 ? net : 0, credit: net < 0 ? -net : 0 };
  });
  const totalD = rows.reduce((s, r) => s + r.debit, 0);
  const totalC = rows.reduce((s, r) => s + r.credit, 0);

  return (
    <Card title={comp.title || "ميزان المراجعة"}>
      <table className="w-full text-sm text-right">
        <thead>
          <tr className="border-b border-white/10 text-white/70 text-xs">
            <th className="p-2 font-medium">الحساب</th>
            <th className="p-2 font-medium w-28">مدين</th>
            <th className="p-2 font-medium w-28">دائن</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={3} className="text-center p-4 text-white/40 text-xs">لا توجد قيود مرحّلة بعد.</td></tr>}
          {rows.map((r) => (
            <tr key={r.code} className="border-b border-white/5 text-xs">
              <td className="p-2 text-white/85">{r.code} - {r.name}</td>
              <td className="p-2 text-green-300 text-left">{r.debit > 0 ? r.debit.toLocaleString("ar-EG") : "-"}</td>
              <td className="p-2 text-red-300 text-left">{r.credit > 0 ? r.credit.toLocaleString("ar-EG") : "-"}</td>
            </tr>
          ))}
          <tr className="bg-white/5 font-bold border-t-2 border-white/20">
            <td className="p-2 text-white">الإجمالي</td>
            <td className="p-2 text-green-300 text-left">{totalD.toLocaleString("ar-EG")}</td>
            <td className="p-2 text-red-300 text-left">{totalC.toLocaleString("ar-EG")}</td>
          </tr>
        </tbody>
      </table>
      <div className={`mt-3 text-xs px-3 py-2 rounded ${Math.abs(totalD - totalC) < 0.001 ? toneClasses("success") : toneClasses("warn")}`}>
        {Math.abs(totalD - totalC) < 0.001 ? "✓ الميزان متوازن" : `⚠ غير متوازن (فرق: ${Math.abs(totalD - totalC).toLocaleString("ar-EG")})`}
      </div>
    </Card>
  );
}

// ─── Invoice Mockup ──────────────────────────────────────────────────────────
function InvoiceBlock({ comp }: { comp: Extract<DynComponent, { type: "invoice" }> }) {
  const env = useEnvState();
  const inv = envUtils.getByPath(env.state, comp.bindTo) || {};
  const items = arr<any>(inv.items);
  const subtotal = items.reduce((s, it) => s + envUtils.toNumber(it.qty) * envUtils.toNumber(it.price), 0);
  const tax = envUtils.toNumber(inv.taxRate ?? 0) * subtotal / 100;
  const total = subtotal + tax;

  return (
    <Card title={comp.title || "فاتورة"}>
      <div className="bg-white/95 text-slate-900 rounded-lg p-5" style={{ direction: "rtl" }}>
        <div className="flex justify-between items-start border-b border-slate-300 pb-3 mb-3">
          <div>
            <div className="font-bold text-lg">{comp.companyName || inv.companyName || "شركتك"}</div>
            <div className="text-xs text-slate-600">{comp.companyDetails || inv.companyDetails || "صنعاء، اليمن"}</div>
          </div>
          <div className="text-left">
            <div className="font-bold text-cyan-700">فاتورة #{inv.number || "—"}</div>
            <div className="text-xs text-slate-600">التاريخ: {inv.date || "—"}</div>
          </div>
        </div>
        {inv.customer && (
          <div className="mb-3 text-sm">
            <div className="text-slate-600">العميل:</div>
            <div className="font-bold">{inv.customer}</div>
          </div>
        )}
        <table className="w-full text-sm border-collapse mb-3">
          <thead>
            <tr className="bg-slate-100 text-right">
              <th className="border border-slate-300 p-2">الصنف</th>
              <th className="border border-slate-300 p-2 w-20">الكمية</th>
              <th className="border border-slate-300 p-2 w-24">السعر</th>
              <th className="border border-slate-300 p-2 w-28">الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && <tr><td colSpan={4} className="text-center p-3 text-slate-500">لا توجد بنود</td></tr>}
            {items.map((it, i) => (
              <tr key={i}>
                <td className="border border-slate-300 p-2">{it.name}</td>
                <td className="border border-slate-300 p-2 text-center">{envUtils.toNumber(it.qty)}</td>
                <td className="border border-slate-300 p-2 text-left">{envUtils.toNumber(it.price).toLocaleString("ar-EG")}</td>
                <td className="border border-slate-300 p-2 text-left font-medium">{(envUtils.toNumber(it.qty) * envUtils.toNumber(it.price)).toLocaleString("ar-EG")}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex justify-end">
          <table className="text-sm w-64">
            <tbody>
              <tr><td className="p-1 text-slate-600">المجموع الفرعي:</td><td className="p-1 text-left font-medium">{subtotal.toLocaleString("ar-EG")}</td></tr>
              {inv.taxRate ? <tr><td className="p-1 text-slate-600">الضريبة ({inv.taxRate}%):</td><td className="p-1 text-left">{tax.toLocaleString("ar-EG")}</td></tr> : null}
              <tr className="border-t-2 border-slate-400 font-bold text-cyan-700"><td className="p-1">الإجمالي:</td><td className="p-1 text-left">{total.toLocaleString("ar-EG")} ر.ي</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  );
}

// ─── Calculator ──────────────────────────────────────────────────────────────
function Calculator({ comp }: { comp: Extract<DynComponent, { type: "calculator" }> }) {
  const t = useEnvTheme();
  const [expr, setExpr] = useState(comp.expression || "");
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const calc = () => {
    setError(null);
    try {
      // Accept Arabic-Indic digits + Arabic operators (×÷−) + ^ as power.
      // Strip thousands separators (Latin "," or Arabic "،") so common
      // formatted numbers like "1,500" or "١٬٥٠٠" are accepted.
      const cleaned = normalizeArabicDigits(expr)
        .replace(/[,،٬]/g, "")
        .replace(/\^/g, "**");
      // Whitelist: digits, operators, parens, decimal, spaces, %, * (for **)
      if (!/^[\d+\-*/().\s%]+$/.test(cleaned)) throw new Error("استخدم الأرقام والعمليات فقط");
      // eslint-disable-next-line no-new-func
      const r = Function(`"use strict"; return (${cleaned})`)();
      setResult(typeof r === "number" && isFinite(r) ? r.toLocaleString("ar-EG", { maximumFractionDigits: 6 }) : String(r));
    } catch (e: any) {
      setError(e.message || "تعبير غير صحيح");
      setResult(null);
    }
  };

  return (
    <Card title={comp.title || "حاسبة"}>
      {comp.description && <p className="text-xs text-white/70 mb-2">{comp.description}</p>}
      <div className="flex gap-2 mb-2">
        <input
          dir="ltr"
          inputMode="decimal"
          value={expr}
          onChange={(e) => setExpr(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); calc(); } }}
          placeholder="مثال: 1500*0.15+200  أو  ١٥٠٠×٠٫١٥+٢٠٠"
          className="flex-1 min-w-0 bg-black/30 border border-white/15 rounded p-2 text-white text-sm font-mono min-h-[44px]"
        />
        <button
          onClick={calc}
          className="font-bold rounded px-4 text-sm transition-opacity hover:opacity-90 min-h-[44px] shrink-0"
          style={{ background: t.primaryBtnBg, color: t.primaryBtnText }}
        >
          احسب
        </button>
      </div>
      {result !== null && (
        <div
          className="text-base p-2 rounded font-mono font-bold"
          style={{ background: t.accentSoft, border: `1px solid ${t.accentBorder}`, color: t.accentText }}
        >
          = {result}
        </div>
      )}
      {error && <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded p-2">{error}</div>}
    </Card>
  );
}

// ─── Main Renderer ───────────────────────────────────────────────────────────
export function ComponentRenderer({ comp, ctx }: { comp: DynComponent; ctx: Ctx }) {
  const env = useEnvState();
  if (!comp || typeof comp !== "object" || !("type" in comp)) return null;

  switch (comp.type) {
    case "text":
      return <div className="prose prose-invert prose-sm max-w-none mb-3 text-white/90 whitespace-pre-wrap">{comp.markdown}</div>;

    case "alert":
      return (
        <div className={`rounded-lg border p-3 mb-3 text-sm ${toneClasses(comp.tone)}`}>
          {comp.title && <div className="font-bold mb-1">{comp.title}</div>}
          <div>{comp.text}</div>
        </div>
      );

    case "kpi": {
      const v = comp.bindTo ? envUtils.getByPath(env.state, comp.bindTo) : comp.value;
      const display = comp.format ? fmtNumber(v, comp.format, comp.decimals) : (v ?? "");
      return (
        <Card>
          <div className="text-xs text-white/60 mb-1">{comp.label}</div>
          <div className="text-2xl font-bold text-cyan-300">{display as any}</div>
          {comp.sublabel && <div className="text-xs text-white/50 mt-1">{comp.sublabel}</div>}
        </Card>
      );
    }

    case "kpiGrid":
      return (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
          {arr<any>(comp.items).map((it, i) => {
            const v = it.bindTo ? envUtils.getByPath(env.state, it.bindTo) : it.value;
            const display = it.format ? fmtNumber(v, it.format, it.decimals) : (v ?? "");
            return (
              <div key={i} className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="text-xs text-white/60 mb-1">{it.label}</div>
                <div className="text-xl font-bold text-cyan-300">{display}</div>
                {it.sublabel && <div className="text-[11px] text-white/50 mt-1">{it.sublabel}</div>}
              </div>
            );
          })}
        </div>
      );

    case "table": {
      const bound = comp.bindTo ? arr<any>(envUtils.getByPath(env.state, comp.bindTo)) : null;
      const rows: any[][] = bound
        ? bound.map((it: any) => (comp.columnKeys || comp.columns).map((k: string) => it?.[k] ?? ""))
        : arr<any>(comp.rows);
      return (
        <Card title={comp.title}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead>
                <tr className="border-b border-white/10 text-white/70">
                  {arr<string>(comp.columns).map((c, i) => <th key={i} className="px-2 py-2 font-medium text-xs">{c}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && <tr><td colSpan={comp.columns.length} className="text-center text-white/40 text-xs p-4">لا توجد بيانات.</td></tr>}
                {rows.map((r, i) => (
                  <tr key={i} className="border-b border-white/5">
                    {arr<any>(r).map((cell, j) => <td key={j} className="px-2 py-2 text-white/90 text-xs">{cell == null ? "" : String(cell)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      );
    }

    case "editableTable":
      return <EditableTable comp={comp} />;

    case "journal": {
      const bound = comp.bindTo ? arr<any>(envUtils.getByPath(env.state, comp.bindTo)) : null;
      const items = bound ?? arr<any>(comp.items);
      return (
        <Card title={comp.title || "اليومية"}>
          <div className="space-y-2">
            {items.length === 0 && <div className="text-xs text-white/40 text-center py-3">لا توجد قيود.</div>}
            {items.map((it: any, i: number) => (
              <div key={i} className="text-sm border border-white/10 rounded-lg p-2">
                <div className="flex justify-between text-xs text-white/60 mb-1">
                  <span>{it.date}</span>
                  {it.account && <span>{it.account}</span>}
                </div>
                <div className="text-white/90 mb-1">{it.desc}</div>
                <div className="flex gap-4 text-xs">
                  {it.debit && <span className="text-green-300">مدين: {it.debit}</span>}
                  {it.credit && <span className="text-red-300">دائن: {it.credit}</span>}
                </div>
              </div>
            ))}
          </div>
        </Card>
      );
    }

    case "journalEditor":
      return <JournalEditor comp={comp} />;

    case "trialBalance":
      return <TrialBalance comp={comp} />;

    case "invoice":
      return <InvoiceBlock comp={comp} />;

    case "calculator":
      return <Calculator comp={comp} />;

    case "list": {
      const items = comp.bindTo ? arr<any>(envUtils.getByPath(env.state, comp.bindTo)) : arr<any>(comp.items);
      return (
        <Card title={comp.title}>
          <ul className="space-y-2">
            {items.length === 0 && <li className="text-xs text-white/40">لا توجد عناصر.</li>}
            {items.map((it, i) => (
              <li key={i} className="flex items-start justify-between gap-2 text-sm">
                <div>
                  <div className="text-white/90">{it.title || it.name}</div>
                  {(it.subtitle || it.desc) && <div className="text-xs text-white/60">{it.subtitle || it.desc}</div>}
                </div>
                {it.badge && <span className="text-xs bg-white/10 text-white/80 rounded px-2 py-1 shrink-0">{it.badge}</span>}
              </li>
            ))}
          </ul>
        </Card>
      );
    }

    case "kvList": {
      const items = comp.bindTo ? arr<any>(envUtils.getByPath(env.state, comp.bindTo)) : arr<any>(comp.items);
      return (
        <Card title={comp.title}>
          <dl className="space-y-1 text-sm">
            {items.map((it, i) => (
              <div key={i} className="flex justify-between gap-3 py-1 border-b border-white/5 last:border-0">
                <dt className="text-white/60">{it.key || it.label}</dt>
                <dd className="text-white/90 text-left">{it.value}</dd>
              </div>
            ))}
          </dl>
        </Card>
      );
    }

    case "form":
      return <FormBlock comp={comp} ctx={ctx} />;

    case "button":
      return (
        <button
          onClick={() => {
            const a: any = comp.action;
            if (a.type === "go-to-screen") ctx.onGoToScreen?.(a.screenId);
            else if (a.type === "ask-ai") ctx.onAskAi?.(a.prompt);
            else if (a.type === "mutate") env.mutate(a.ops || []);
            else ctx.onAction?.(a);
          }}
          className={`rounded-lg px-4 py-2 text-sm font-bold mb-3 ${
            comp.tone === "secondary" ? "bg-white/10 hover:bg-white/15 text-white"
            : comp.tone === "danger" ? "bg-red-500 hover:bg-red-400 text-white"
            : "bg-cyan-500 hover:bg-cyan-400 text-slate-900"
          }`}
        >
          {comp.label}
        </button>
      );

    case "codeBlock":
      return (
        <pre className="bg-black/50 border border-white/10 rounded-lg p-3 mb-3 overflow-x-auto text-xs text-cyan-200" dir="ltr">
          <code>{comp.code}</code>
        </pre>
      );

    case "chart": {
      let labels = arr<string>(comp.labels);
      let dataArr: number[] = arr<any>(comp.datasets)[0]?.data || [];
      if (comp.bindTo) {
        const list = arr<any>(envUtils.getByPath(env.state, comp.bindTo));
        labels = list.map((it) => String(it?.[comp.labelKey || "label"] ?? ""));
        dataArr = list.map((it) => envUtils.toNumber(it?.[comp.valueKey || "value"]));
      }
      const max = Math.max(...dataArr, 1);
      return (
        <Card title={comp.title}>
          <div className="space-y-2">
            {dataArr.map((v, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-24 text-xs text-white/70 truncate">{labels[i] ?? ""}</div>
                <div className="flex-1 bg-white/5 rounded h-5 overflow-hidden">
                  <div className="bg-cyan-500 h-full" style={{ width: `${(v / max) * 100}%` }} />
                </div>
                <div className="w-20 text-xs text-white/80 text-left">{v.toLocaleString("ar-EG")}</div>
              </div>
            ))}
          </div>
        </Card>
      );
    }

    case "stepper":
      return (
        <Card title={comp.title}>
          <ol className="space-y-2">
            {arr<any>(comp.steps).map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                  s.status === "done" ? "bg-green-500 text-white"
                  : s.status === "current" ? "bg-cyan-500 text-slate-900"
                  : "bg-white/10 text-white/60"
                }`}>{i + 1}</span>
                <div>
                  <div className="text-white/90">{s.title}</div>
                  {s.description && <div className="text-xs text-white/60">{s.description}</div>}
                </div>
              </li>
            ))}
          </ol>
        </Card>
      );

    case "richDocument":
      return (
        <Card title={comp.title}>
          <div className="space-y-3">
            {arr<any>(comp.sections).map((s, i) => (
              <div key={i}>
                <h4 className="font-bold text-cyan-300 mb-1">{s.heading}</h4>
                <p className="text-sm text-white/85 whitespace-pre-wrap">{s.body}</p>
              </div>
            ))}
          </div>
        </Card>
      );

    case "webApp":
      return <WebAppBlock comp={comp} />;

    case "packetCapture":
      return <PacketCaptureBlock comp={comp} state={env.state} />;

    case "terminal":
      return <TerminalBlock comp={comp} state={env.state} />;

    case "fileSystemExplorer":
      return <FileSystemExplorerBlock comp={comp} state={env.state} />;

    case "browser":
      return <BrowserBlock comp={comp} state={env.state} />;

    case "networkDiagram":
      return <NetworkDiagramBlock comp={comp} state={env.state} />;

    case "logViewer":
      return <LogViewerBlock comp={comp} state={env.state} />;

    case "conceptCard":
      return <ConceptCardBlock comp={comp} />;

    case "achievement":
      return <AchievementBlock comp={comp} state={env.state} />;

    case "freePlayground":
      return <FreePlaygroundBlock comp={comp} ctx={ctx} />;

    case "dataInspector":
      return <DataInspectorBlock comp={comp} state={env.state} />;

    default:
      return null;
  }
}

// Convert Arabic-Indic and Eastern-Arabic-Indic digits to ASCII so the
// Calculator (and other numeric inputs) accept "١٥٠٠+٢٠٠" natively.
function normalizeArabicDigits(s: string): string {
  if (!s) return s;
  const map: Record<string, string> = {
    "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4",
    "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
    "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4",
    "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9",
    "،": ",", "٫": ".", "٬": ",", "−": "-", "×": "*", "÷": "/",
  };
  return s.replace(/[٠-٩۰-۹،٫٬−×÷]/g, (ch) => map[ch] ?? ch);
}

// ─── Concept simplification card ───────────────────────────────────────────
function ConceptCardBlock({ comp }: { comp: Extract<DynComponent, { type: "conceptCard" }> }) {
  const t = useEnvTheme();
  const tone = comp.tone || "intro";
  const icon = comp.icon || (tone === "warning" ? "⚠️" : tone === "tip" ? "💡" : "🧠");
  // On mobile we collapse the example/rule by default so the screen stays
  // scannable; the student opens "اقرأ المزيد" when they want depth. Desktop
  // shows everything inline.
  const [expanded, setExpanded] = useState(false);
  const hasMore = !!(comp.everydayExample || comp.ruleOfThumb);
  return (
    <div
      className="relative rounded-2xl border-r-4 p-4 md:p-5 mb-3 overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${t.accentSoft}, transparent 70%)`,
        borderColor: t.accentBorder,
        borderRightColor: t.accent,
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-xl"
          style={{ background: t.accentSoft, border: `1px solid ${t.accentBorder}` }}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-black uppercase tracking-wider mb-1" style={{ color: t.accentText }}>
            {tone === "warning" ? "انتبه" : tone === "tip" ? "تلميح ذهبي" : "فكرة المفهوم"}
          </div>
          <h4 className="text-base md:text-lg font-black text-white leading-snug mb-2">{comp.title}</h4>
          <p className="text-sm text-white/85 leading-relaxed whitespace-pre-wrap">{comp.idea}</p>
          {/* Collapsible body — open by default on md+ via class, manually on mobile. */}
          <div className={`${expanded ? "block" : "hidden"} md:block`}>
            {comp.everydayExample && (
              <div
                className="mt-3 rounded-lg px-3 py-2 text-[13px] text-white/90 leading-relaxed border-r-2"
                style={{ background: "rgba(255,255,255,0.04)", borderRightColor: t.accent }}
              >
                <span className="text-[11px] font-black uppercase tracking-wider mr-1" style={{ color: t.accentText }}>مثال من حياتك اليومية ·</span>
                {comp.everydayExample}
              </div>
            )}
            {comp.ruleOfThumb && (
              <div className="mt-2 text-[12px] text-white/75 italic">
                <span className="font-bold" style={{ color: t.accentText }}>قاعدة بسيطة:</span>{" "}{comp.ruleOfThumb}
              </div>
            )}
          </div>
          {hasMore && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="md:hidden mt-2 text-[12px] font-bold rounded px-3 py-1.5 min-h-[36px]"
              style={{ background: t.accentSoft, color: t.accentText, border: `1px solid ${t.accentBorder}` }}
            >
              {expanded ? "إخفاء التفاصيل" : "اقرأ المزيد ▾"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Achievement / motivation badge ────────────────────────────────────────
function AchievementBlock({ comp, state }: { comp: Extract<DynComponent, { type: "achievement" }>; state: any }) {
  const t = useEnvTheme();
  // Predicate evaluation — same shape as DynTask.completeWhen.
  const visible = useMemo(() => {
    const w = comp.showWhen;
    if (!w) return true;
    const v = envUtils.getByPath(state, w.path);
    switch (w.op) {
      case "exists": return v !== undefined && v !== null && v !== "";
      case "equals": return v === w.value;
      case "gte": return envUtils.toNumber(v) >= envUtils.toNumber(w.value);
      case "lte": return envUtils.toNumber(v) <= envUtils.toNumber(w.value);
      case "lengthGte": return Array.isArray(v) && v.length >= envUtils.toNumber(w.value);
      default: return true;
    }
  }, [comp.showWhen, state]);
  if (!visible) return null;
  const icon = comp.icon || "🏆";
  return (
    <div
      className="relative overflow-hidden rounded-2xl border p-3 md:p-4 mb-3 flex items-center gap-3"
      style={{
        background: `linear-gradient(90deg, ${t.accentSoft}, transparent)`,
        borderColor: t.accentBorder,
      }}
    >
      <div
        className="absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-30 blur-2xl"
        style={{ background: t.accent }}
        aria-hidden
      />
      <div
        className="relative shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
        style={{ background: t.accentSoft, border: `1px solid ${t.accentBorder}` }}
      >
        {icon}
      </div>
      <div className="relative min-w-0 flex-1">
        <div className="text-[11px] font-black uppercase tracking-wider" style={{ color: t.accentText }}>
          إنجاز جديد
        </div>
        <div className="text-sm md:text-base font-black text-white leading-tight">{comp.title}</div>
        {comp.description && <div className="text-xs text-white/70 mt-0.5 leading-snug">{comp.description}</div>}
      </div>
      {typeof comp.points === "number" && comp.points > 0 && (
        <div
          className="relative shrink-0 px-3 py-1.5 rounded-full text-xs font-black"
          style={{ background: t.accent, color: t.primaryBtnText }}
        >
          +{comp.points} نقطة
        </div>
      )}
    </div>
  );
}

// ─── Free experimentation playground ──────────────────────────────────────
// Four flavors. Each is a real, no-grading tool the student can play with
// to develop intuition. Sandboxed iframe used for js/cssPreview to keep the
// host page safe (same security contract as WebAppBlock).
function FreePlaygroundBlock({ comp, ctx }: { comp: Extract<DynComponent, { type: "freePlayground" }>; ctx: Ctx }) {
  const t = useEnvTheme();
  const flavor = comp.flavor;
  const labels: Record<string, string> = {
    js: "مختبر JavaScript",
    regex: "مختبر التعبيرات النمطية (Regex)",
    cssPreview: "مختبر HTML + CSS",
    math: "حاسبة بمتغيرات",
    sql: "مختبر SQL (SELECT)",
  };
  const title = comp.title || labels[flavor] || "مختبر التجريب";

  return (
    <Card title={title}>
      {comp.description && <p className="text-xs text-white/70 mb-2 leading-relaxed">{comp.description}</p>}
      <div
        className="text-[11px] mb-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border"
        style={{ background: t.accentSoft, borderColor: t.accentBorder, color: t.accentText }}
      >
        <span>🧪</span>
        <span className="font-bold">منطقة تجريب حرّة — جرّب، عدّل، اكسر، تعلّم</span>
      </div>
      {flavor === "js" && <PlaygroundJS seed={comp.seed} height={comp.height} />}
      {flavor === "regex" && <PlaygroundRegex pattern={comp.seed} testText={comp.secondarySeed} />}
      {flavor === "cssPreview" && <PlaygroundCss html={comp.seed} css={comp.secondarySeed} height={comp.height} />}
      {flavor === "math" && <PlaygroundMath seed={comp.seed} />}
      {flavor === "sql" && <PlaygroundSql seed={comp.seed} tables={comp.tables} />}
      {Array.isArray(comp.challenges) && comp.challenges.length > 0 && (
        <div className="mt-3 pt-3 border-t border-white/10">
          <div className="text-[11px] font-black uppercase tracking-wider mb-2" style={{ color: t.accentText }}>
            تحدّيات سريعة جرّبها
          </div>
          <ul className="space-y-1.5">
            {comp.challenges.slice(0, 6).map((c, i) => (
              <li key={i} className="flex items-start gap-2 text-[12px] text-white/80">
                <button
                  onClick={() => ctx.onAskAi?.(`في مختبر ${labels[flavor]}: «${c}» — اشرح لي كيف أنفّذ هذا التحدي خطوة بخطوة دون أن تعطيني الحل كاملاً.`)}
                  className="shrink-0 text-xs rounded-full px-2 py-0.5 border hover:opacity-80 transition-opacity"
                  style={{ background: t.accentSoft, borderColor: t.accentBorder, color: t.accentText }}
                  title="اطلب من المساعد إرشادك"
                >
                  ?
                </button>
                <span className="leading-relaxed">{c}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

function PlaygroundJS({ seed, height }: { seed?: string; height?: number }) {
  const t = useEnvTheme();
  const [code, setCode] = useState<string>(seed || "// جرّب — مثال:\nconst nums = [1, 2, 3, 4, 5];\nconst sum = nums.reduce((a, b) => a + b, 0);\nconsole.log('المجموع =', sum);\n");
  const [logs, setLogs] = useState<Array<{ level: string; text: string }>>([]);
  const [runId, setRunId] = useState(0);
  const [killed, setKilled] = useState(false);
  const ref = useRef<HTMLIFrameElement>(null);
  const watchdogRef = useRef<number | null>(null);
  const nonce = useMemo(() => "pgjs-" + Math.random().toString(36).slice(2, 10), [runId]);
  const h = typeof height === "number" && height > 100 ? height : 220;

  const srcDoc = useMemo(() => {
    if (runId === 0) return "";
    if (killed) return "";
    // The injected runtime sends a "ready" ping when it loads, then a "done"
    // ping after eval finishes. The parent watchdog uses these to detect
    // hangs (infinite loops) and rip out the iframe srcDoc to kill execution.
    const safe = JSON.stringify(code);
    return `<!doctype html><html><head><meta charset="utf-8"></head><body><script>(function(){try{var n=${JSON.stringify(nonce)};function send(level,args){try{var t=Array.prototype.map.call(args,function(a){try{return typeof a==='string'?a:JSON.stringify(a)}catch(e){return String(a)}}).join(' ');parent.postMessage({__pg:n,level:level,text:t},'*')}catch(e){}}['log','info','warn','error'].forEach(function(lv){var orig=console[lv];console[lv]=function(){send(lv,arguments);if(orig)try{orig.apply(console,arguments)}catch(e){}}});window.addEventListener('error',function(e){send('error',[e.message||'error'])});parent.postMessage({__pg:n,level:'__ready'},'*');}catch(e){}try{(function(){var __code=${safe};(0,eval)(__code);})();}catch(e){try{parent.postMessage({__pg:${JSON.stringify(nonce)},level:'error',text:String(e&&e.message||e)},'*')}catch(_){}}try{parent.postMessage({__pg:${JSON.stringify(nonce)},level:'__done'},'*')}catch(_){}})();<\/script></body></html>`;
  }, [runId, nonce, code, killed]);

  useEffect(() => {
    function onMsg(ev: MessageEvent) {
      if (!ref.current || ev.source !== ref.current.contentWindow) return;
      const d: any = ev.data;
      if (!d || typeof d !== "object" || d.__pg !== nonce) return;
      // Internal lifecycle messages: clear the watchdog when execution ends.
      if (d.level === "__done" || d.level === "__ready") {
        if (d.level === "__done" && watchdogRef.current) {
          window.clearTimeout(watchdogRef.current);
          watchdogRef.current = null;
        }
        return;
      }
      setLogs((p) => [...p.slice(-39), { level: String(d.level || "log"), text: String(d.text || "").slice(0, 500) }]);
    }
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [nonce]);

  // Watchdog: if a run does not signal __done within 3s, assume an infinite
  // loop and forcibly kill the iframe (re-mount removes the running script).
  useEffect(() => {
    if (runId === 0) return;
    if (killed) return;
    if (watchdogRef.current) window.clearTimeout(watchdogRef.current);
    watchdogRef.current = window.setTimeout(() => {
      setLogs((p) => [...p, { level: "error", text: "⏱ إيقاف تلقائي: تجاوز الكود ٣ ثوانٍ (حلقة لا نهائية محتملة)." }]);
      setKilled(true);
      watchdogRef.current = null;
    }, 3000);
    return () => {
      if (watchdogRef.current) {
        window.clearTimeout(watchdogRef.current);
        watchdogRef.current = null;
      }
    };
  }, [runId, killed]);

  const run = () => { setLogs([]); setKilled(false); setRunId((n) => n + 1); };

  return (
    <div className="space-y-2">
      <textarea
        dir="ltr"
        spellCheck={false}
        value={code}
        onChange={(e) => setCode(e.target.value)}
        className="w-full bg-black/60 border border-white/15 rounded-lg p-2 text-green-200 text-[12px] font-mono leading-relaxed resize-y"
        style={{ minHeight: h }}
      />
      <div className="flex items-center gap-2">
        <button
          onClick={run}
          className="text-sm font-bold rounded-lg px-4 py-2 transition-opacity hover:opacity-90"
          style={{ background: t.primaryBtnBg, color: t.primaryBtnText }}
        >
          ▶ تشغيل
        </button>
        <button
          onClick={() => setLogs([])}
          className="text-xs rounded-lg px-3 py-2 bg-white/5 hover:bg-white/10 text-white/70 border border-white/10"
        >
          مسح السجل
        </button>
        <span className="text-[11px] text-white/40">يعمل في صندوق رمل معزول — لا وصول للإنترنت أو لتطبيقك.</span>
      </div>
      {srcDoc && (
        <iframe
          ref={ref}
          title="js-playground"
          sandbox="allow-scripts"
          srcDoc={srcDoc}
          className="hidden"
          style={{ width: 0, height: 0 }}
        />
      )}
      <div className="bg-black/70 border border-white/10 rounded-lg p-2 max-h-48 overflow-y-auto font-mono text-[11px] space-y-0.5" dir="ltr">
        {logs.length === 0
          ? <div className="text-white/40 text-center py-2">— لا توجد مخرجات بعد — اضغط تشغيل —</div>
          : logs.map((l, i) => (
            <div key={i} className={
              l.level === "error" ? "text-red-300"
              : l.level === "warn" ? "text-amber-300"
              : "text-green-200"
            }>
              <span className="text-white/40 ml-1">[{l.level}]</span>{l.text}
            </div>
          ))
        }
      </div>
    </div>
  );
}

function PlaygroundRegex({ pattern, testText }: { pattern?: string; testText?: string }) {
  const [pat, setPat] = useState<string>(pattern || "\\b\\w+@\\w+\\.\\w+\\b");
  const [flags, setFlags] = useState<string>("g");
  const [text, setText] = useState<string>(testText || "تواصل معنا: support@nukhba.ye أو ali.ahmed@example.com للدعم.");
  // Hard caps protect the UI from catastrophic-backtracking patterns: keep
  // pattern <= 300 chars and test text <= 5000 chars. Even pathological
  // patterns stay tractable on inputs of this size.
  const PATTERN_MAX = 300;
  const TEXT_MAX = 5000;
  const result = useMemo(() => {
    if (!pat) return { ok: true as const, matches: [] as Array<{ index: number; text: string }>, error: null as string | null };
    if (pat.length > PATTERN_MAX) return { ok: false as const, matches: [], error: `النمط طويل جداً (الحد الأقصى ${PATTERN_MAX} حرفاً)` };
    if (text.length > TEXT_MAX) return { ok: false as const, matches: [], error: `النص طويل جداً (الحد الأقصى ${TEXT_MAX} حرف)` };
    try {
      const re = new RegExp(pat, flags || undefined);
      const matches: Array<{ index: number; text: string }> = [];
      if (flags.includes("g")) {
        let m: RegExpExecArray | null;
        let guard = 0;
        while ((m = re.exec(text)) !== null && guard++ < 200) {
          matches.push({ index: m.index, text: m[0] });
          if (m[0].length === 0) re.lastIndex++;
        }
      } else {
        const m = re.exec(text);
        if (m) matches.push({ index: m.index, text: m[0] });
      }
      return { ok: true as const, matches, error: null };
    } catch (e: any) {
      return { ok: false as const, matches: [], error: e?.message || "regex غير صالح" };
    }
  }, [pat, flags, text]);

  // Highlight matches in the text by walking through them in index order.
  const highlighted = useMemo(() => {
    if (!result.ok || result.matches.length === 0) return [<span key="t">{text}</span>];
    const out: any[] = [];
    let cur = 0;
    result.matches.forEach((m, i) => {
      if (m.index > cur) out.push(<span key={"p" + i}>{text.slice(cur, m.index)}</span>);
      out.push(<mark key={"m" + i} className="bg-amber-400/40 text-amber-50 rounded px-0.5">{m.text}</mark>);
      cur = m.index + (m.text.length || 1);
    });
    if (cur < text.length) out.push(<span key="end">{text.slice(cur)}</span>);
    return out;
  }, [result, text]);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <input dir="ltr" value={pat} onChange={(e) => setPat(e.target.value)} placeholder="النمط" className="bg-black/40 border border-white/15 rounded p-2 text-white text-[12px] font-mono" />
        <input dir="ltr" value={flags} onChange={(e) => setFlags(e.target.value.replace(/[^gimsuy]/g, ""))} placeholder="الأعلام" className="w-20 bg-black/40 border border-white/15 rounded p-2 text-white text-[12px] font-mono text-center" />
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        className="w-full bg-black/30 border border-white/15 rounded p-2 text-white text-sm leading-relaxed"
      />
      {result.error && <div className="text-xs text-red-300 bg-red-500/10 border border-red-500/30 rounded p-2">{result.error}</div>}
      {result.ok && (
        <>
          <div className="rounded-lg border border-white/10 bg-white/5 p-3 leading-relaxed text-sm whitespace-pre-wrap">
            {highlighted}
          </div>
          <div className="text-[12px] text-white/70">
            مطابقات: <span className="font-bold text-white">{result.matches.length}</span>
            {result.matches.length > 0 && (
              <span className="ml-2" dir="ltr">
                {result.matches.slice(0, 8).map((m, i) => (
                  <span key={i} className="inline-block mx-1 px-1.5 py-0.5 bg-amber-400/15 text-amber-200 rounded text-[11px] font-mono">{m.text}</span>
                ))}
                {result.matches.length > 8 && <span className="text-white/50">…</span>}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function PlaygroundCss({ html, css, height }: { html?: string; css?: string; height?: number }) {
  const t = useEnvTheme();
  const [h, setH] = useState<string>(html || `<div class="card">\n  <h2>مرحبا بك</h2>\n  <p>عدّل CSS وشاهد النتيجة فوراً.</p>\n  <button>اضغط</button>\n</div>`);
  const [c, setC] = useState<string>(css || `body{font-family:system-ui,'Tajawal',sans-serif;background:#0f172a;color:#fff;padding:24px;direction:rtl}\n.card{background:linear-gradient(135deg,#1e293b,#0f172a);padding:18px;border-radius:14px;border:1px solid #334155;max-width:320px}\nh2{color:#22d3ee;margin:0 0 8px}\nbutton{margin-top:12px;background:#22d3ee;color:#022c33;border:0;padding:8px 14px;border-radius:8px;font-weight:bold;cursor:pointer}`);
  const srcDoc = useMemo(
    () => `<!doctype html><html><head><meta charset="utf-8"><style>${c}</style></head><body>${h}</body></html>`,
    [h, c]
  );
  const ph = typeof height === "number" && height > 120 ? height : 260;
  return (
    <div className="grid lg:grid-cols-2 gap-2">
      <div className="space-y-2">
        <div className="text-[11px] font-bold text-white/60 uppercase tracking-wider">HTML</div>
        <textarea dir="ltr" value={h} onChange={(e) => setH(e.target.value)} className="w-full bg-black/40 border border-white/15 rounded p-2 text-white text-[12px] font-mono leading-relaxed resize-y" style={{ minHeight: 120 }} />
        <div className="text-[11px] font-bold text-white/60 uppercase tracking-wider">CSS</div>
        <textarea dir="ltr" value={c} onChange={(e) => setC(e.target.value)} className="w-full bg-black/40 border border-white/15 rounded p-2 text-white text-[12px] font-mono leading-relaxed resize-y" style={{ minHeight: 160 }} />
      </div>
      <div>
        <div className="text-[11px] font-bold text-white/60 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: t.accent }} /> معاينة حيّة
        </div>
        <iframe
          title="css-preview"
          sandbox="allow-scripts"
          srcDoc={srcDoc}
          className="w-full rounded-lg border border-white/10 bg-white"
          style={{ height: ph }}
        />
      </div>
    </div>
  );
}

function PlaygroundMath({ seed }: { seed?: string }) {
  const t = useEnvTheme();
  const [vars, setVars] = useState<string>(seed?.split("|")[0] || "x = 12\ny = 8\nمعدل_الفائدة = 0.05");
  const [expr, setExpr] = useState<string>(seed?.split("|")[1] || "(x + y) * (1 + معدل_الفائدة)");
  const result = useMemo(() => {
    try {
      const norm = normalizeArabicDigits;
      const parsedVars: Record<string, number> = {};
      const lines = norm(vars).split(/\n|;/).map((l) => l.trim()).filter(Boolean);
      for (const line of lines) {
        const m = line.match(/^([\p{L}_][\p{L}\d_]*)\s*=\s*(.+)$/u);
        if (!m) continue;
        const raw = m[2].replace(/,/g, "");
        const val = parseFloat(raw);
        if (!isNaN(val)) parsedVars[m[1]] = val;
      }
      let safeExpr = norm(expr);
      // Replace each variable name (longest-first to avoid partial overlap)
      Object.keys(parsedVars).sort((a, b) => b.length - a.length).forEach((name) => {
        safeExpr = safeExpr.split(name).join(`(${parsedVars[name]})`);
      });
      // Whitelist: digits, parens, operators, decimal, spaces, ^ (we'll convert to **)
      const cleaned = safeExpr.replace(/\^/g, "**");
      if (!/^[\d+\-*/().\s%*]+$/.test(cleaned)) {
        return { ok: false as const, value: null as any, error: "تعبير غير مفهوم — تأكّد من تعريف كل المتغيرات." };
      }
      // eslint-disable-next-line no-new-func
      const v = Function(`"use strict"; return (${cleaned})`)();
      return { ok: true as const, value: v, error: null, vars: parsedVars };
    } catch (e: any) {
      return { ok: false as const, value: null, error: e?.message || "خطأ في الحساب" };
    }
  }, [vars, expr]);

  return (
    <div className="space-y-2">
      <div className="grid md:grid-cols-2 gap-2">
        <div>
          <div className="text-[11px] font-bold text-white/60 uppercase tracking-wider mb-1">المتغيرات (سطر لكل واحد)</div>
          <textarea value={vars} onChange={(e) => setVars(e.target.value)} rows={4} className="w-full bg-black/30 border border-white/15 rounded p-2 text-white text-sm font-mono leading-relaxed" />
        </div>
        <div>
          <div className="text-[11px] font-bold text-white/60 uppercase tracking-wider mb-1">التعبير</div>
          <textarea value={expr} onChange={(e) => setExpr(e.target.value)} rows={4} className="w-full bg-black/30 border border-white/15 rounded p-2 text-white text-sm font-mono leading-relaxed" />
        </div>
      </div>
      {result.ok ? (
        <div
          className="rounded-lg p-3 text-center font-mono"
          style={{ background: t.accentSoft, border: `1px solid ${t.accentBorder}` }}
        >
          <div className="text-[11px] uppercase tracking-wider opacity-80" style={{ color: t.accentText }}>الناتج</div>
          <div className="text-2xl font-black" style={{ color: t.accentText }}>
            {typeof result.value === "number" && isFinite(result.value)
              ? result.value.toLocaleString("ar-EG", { maximumFractionDigits: 6 })
              : String(result.value)}
          </div>
        </div>
      ) : (
        <div className="text-xs text-red-300 bg-red-500/10 border border-red-500/30 rounded p-2">{result.error}</div>
      )}
    </div>
  );
}

// ─── PlaygroundSql ─────────────────────────────────────────────────────────
// A *very* small SELECT-only SQL evaluator over an in-memory `tables` object.
// Supported grammar (case-insensitive):
//   SELECT  <col,col,... | *>
//   FROM    <table>
//   [WHERE  <col> <op> <value>]   ops: = != <> > >= < <= LIKE
//   [ORDER BY <col> [ASC|DESC]]
//   [LIMIT <n>]
// Strings may be single- or double-quoted. Numbers are parsed as numbers.
// LIKE supports `%` wildcard. No JOIN, GROUP BY, or subqueries — by design,
// we want students to *experiment* with the basics safely. All evaluation
// happens locally in JS — no network, no real DB connection.
function PlaygroundSql({ seed, tables: tablesProp }: { seed?: string; tables?: Record<string, Array<Record<string, any>>> }) {
  const t = useEnvTheme();
  const defaultTables = useMemo<Record<string, Array<Record<string, any>>>>(() => ({
    students: [
      { id: 1, name: "علي الحضرمي", grade: 92, city: "صنعاء" },
      { id: 2, name: "سارة الزبيدي", grade: 88, city: "عدن" },
      { id: 3, name: "محمد الصبري", grade: 75, city: "تعز" },
      { id: 4, name: "ليلى النهدي", grade: 95, city: "صنعاء" },
      { id: 5, name: "خالد المقدشي", grade: 60, city: "الحديدة" },
    ],
  }), []);
  const tables = (tablesProp && Object.keys(tablesProp).length > 0) ? tablesProp : defaultTables;
  const tableNames = Object.keys(tables);
  const [query, setQuery] = useState<string>(seed || `SELECT name, grade FROM ${tableNames[0] || "students"} WHERE grade >= 80 ORDER BY grade DESC LIMIT 10`);

  const result = useMemo(() => {
    try {
      const q = String(query || "").trim().replace(/;\s*$/, "");
      if (!q) return { ok: false as const, error: "اكتب استعلام SELECT للبدء." };
      // Parse pieces with case-insensitive regex.
      const m = q.match(/^\s*SELECT\s+(.+?)\s+FROM\s+([\p{L}_][\p{L}\d_]*)(?:\s+WHERE\s+(.+?))?(?:\s+ORDER\s+BY\s+([\p{L}_][\p{L}\d_]*)(?:\s+(ASC|DESC))?)?(?:\s+LIMIT\s+(\d+))?\s*$/iu);
      if (!m) return { ok: false as const, error: "صيغة غير مدعومة. الشكل: SELECT cols FROM table [WHERE ...] [ORDER BY col] [LIMIT n]" };
      const [, selectList, tableName, whereClause, orderCol, orderDir, limitStr] = m;
      const tbl = tables[tableName];
      if (!Array.isArray(tbl)) return { ok: false as const, error: `لا يوجد جدول باسم «${tableName}». الجداول المتاحة: ${tableNames.join(", ")}` };
      const cols = selectList.trim() === "*"
        ? null
        : selectList.split(",").map((c) => c.trim()).filter(Boolean);
      // WHERE — single predicate only.
      let pred: ((row: any) => boolean) | null = null;
      if (whereClause) {
        const w = whereClause.match(/^\s*([\p{L}_][\p{L}\d_]*)\s*(=|!=|<>|>=|<=|>|<|LIKE)\s*(.+?)\s*$/iu);
        if (!w) return { ok: false as const, error: "WHERE: استخدم الشكل col OP value (مثلاً grade >= 80)." };
        const [, wcol, opRaw, valRaw] = w;
        const op = opRaw.toUpperCase();
        let val: any = valRaw.trim();
        if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
          val = val.slice(1, -1);
        } else if (/^-?\d+(\.\d+)?$/.test(val)) {
          val = Number(val);
        }
        pred = (row: any) => {
          const cell = row[wcol];
          switch (op) {
            case "=": return cell == val; // eslint-disable-line eqeqeq
            case "!=":
            case "<>": return cell != val; // eslint-disable-line eqeqeq
            case ">": return Number(cell) > Number(val);
            case ">=": return Number(cell) >= Number(val);
            case "<": return Number(cell) < Number(val);
            case "<=": return Number(cell) <= Number(val);
            case "LIKE": {
              const pat = String(val).replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/%/g, ".*");
              return new RegExp("^" + pat + "$", "i").test(String(cell ?? ""));
            }
            default: return false;
          }
        };
      }
      let rows = pred ? tbl.filter(pred) : tbl.slice();
      if (orderCol) {
        const dir = (orderDir || "ASC").toUpperCase() === "DESC" ? -1 : 1;
        rows = rows.slice().sort((a: any, b: any) => {
          const av = a[orderCol], bv = b[orderCol];
          if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
          return String(av ?? "").localeCompare(String(bv ?? ""), "ar") * dir;
        });
      }
      if (limitStr) rows = rows.slice(0, parseInt(limitStr, 10));
      const projected = cols
        ? rows.map((r) => Object.fromEntries(cols.map((c) => [c, r[c]])))
        : rows;
      const headers = projected.length > 0
        ? Object.keys(projected[0])
        : (cols || (tbl[0] ? Object.keys(tbl[0]) : []));
      return { ok: true as const, rows: projected, headers, count: projected.length };
    } catch (e: any) {
      return { ok: false as const, error: e?.message || "تعذّر تنفيذ الاستعلام." };
    }
  }, [query, tables, tableNames]);

  return (
    <div className="space-y-2">
      <div className="text-[11px] text-white/60">
        الجداول المتاحة:{" "}
        {tableNames.map((n) => (
          <code key={n} className="mx-1 px-1.5 py-0.5 rounded bg-white/5 text-cyan-300" dir="ltr">{n}</code>
        ))}
      </div>
      <textarea
        dir="ltr"
        spellCheck={false}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        rows={4}
        className="w-full bg-black/60 border border-white/15 rounded-lg p-2 text-emerald-200 text-[12px] font-mono leading-relaxed"
      />
      <div className="text-[11px] text-white/40">
        مدعوم: SELECT · FROM · WHERE (=,!=,&gt;,&gt;=,&lt;,&lt;=,LIKE) · ORDER BY · LIMIT.
      </div>
      {result.ok ? (
        <div className="border border-white/10 rounded-lg overflow-x-auto bg-black/30" dir="ltr">
          <table className="w-full text-xs font-mono">
            <thead className="bg-white/5">
              <tr>
                {result.headers.map((h) => (
                  <th key={h} className="p-2 text-left text-white/70 font-bold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.rows.length === 0
                ? <tr><td colSpan={result.headers.length || 1} className="p-3 text-center text-white/40">— لا توجد نتائج —</td></tr>
                : result.rows.map((row: any, i: number) => (
                  <tr key={i} className="border-t border-white/5">
                    {result.headers.map((h) => (
                      <td key={h} className="p-2 text-white/85">{row[h] == null ? "∅" : String(row[h])}</td>
                    ))}
                  </tr>
                ))}
            </tbody>
          </table>
          <div className="px-2 py-1 text-[11px] text-white/50 border-t border-white/10" style={{ color: t.accentText }}>
            {result.count} صف{result.count === 1 ? "" : (result.count === 2 ? "ان" : "وف")}
          </div>
        </div>
      ) : (
        <div className="text-xs text-red-300 bg-red-500/10 border border-red-500/30 rounded p-2">{result.error}</div>
      )}
    </div>
  );
}

// ─── Live data inspector ───────────────────────────────────────────────────
function DataInspectorBlock({ comp, state }: { comp: Extract<DynComponent, { type: "dataInspector" }>; state: any }) {
  const t = useEnvTheme();
  const data = comp.bindTo ? envUtils.getByPath(state, comp.bindTo) : comp.data;
  const renderValue = (v: any): ReactNode => {
    if (v == null) return <span className="text-white/40">∅</span>;
    if (typeof v === "boolean") return <span className="text-amber-300">{v ? "true" : "false"}</span>;
    if (typeof v === "number") return <span className="text-cyan-300">{v.toLocaleString("ar-EG")}</span>;
    if (typeof v === "string") return <span className="text-emerald-200">"{v}"</span>;
    return <code className="text-white/70 text-[11px]">{JSON.stringify(v).slice(0, 60)}{JSON.stringify(v).length > 60 ? "…" : ""}</code>;
  };

  let body: ReactNode;
  if (Array.isArray(data) && data.length > 0 && data.every((x) => x && typeof x === "object" && !Array.isArray(x))) {
    const keys = Array.from(new Set(data.flatMap((row) => Object.keys(row)))).slice(0, 8);
    body = (
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/10 text-white/60">
              {keys.map((k) => <th key={k} className="px-2 py-1.5 text-right font-medium">{k}</th>)}
            </tr>
          </thead>
          <tbody>
            {data.slice(0, 25).map((row, i) => (
              <tr key={i} className="border-b border-white/5">
                {keys.map((k) => <td key={k} className="px-2 py-1.5">{renderValue(row?.[k])}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
        {data.length > 25 && <div className="text-[11px] text-white/40 text-center py-2">… و{data.length - 25} عنصر إضافي</div>}
      </div>
    );
  } else if (Array.isArray(data) && data.every((x) => typeof x === "number")) {
    const nums = data as number[];
    const sum = nums.reduce((a, b) => a + b, 0);
    const avg = nums.length > 0 ? sum / nums.length : 0;
    const min = nums.length > 0 ? Math.min(...nums) : 0;
    const max = nums.length > 0 ? Math.max(...nums) : 0;
    body = (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center">
        {[
          { label: "العدد", v: nums.length },
          { label: "المجموع", v: sum },
          { label: "المتوسط", v: avg.toFixed(2) },
          { label: "الأصغر / الأكبر", v: `${min} / ${max}` },
        ].map((s, i) => (
          <div key={i} className="rounded-lg p-2 border" style={{ background: t.accentSoft, borderColor: t.accentBorder }}>
            <div className="text-[10px] text-white/60 uppercase">{s.label}</div>
            <div className="text-lg font-black" style={{ color: t.accentText }}>{s.v}</div>
          </div>
        ))}
      </div>
    );
  } else if (data && typeof data === "object" && !Array.isArray(data)) {
    body = (
      <dl className="text-sm space-y-1">
        {Object.entries(data).slice(0, 30).map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3 py-1 border-b border-white/5">
            <dt className="text-white/60 font-mono text-xs">{k}</dt>
            <dd className="text-left">{renderValue(v)}</dd>
          </div>
        ))}
      </dl>
    );
  } else if (Array.isArray(data)) {
    body = (
      <ul className="text-sm space-y-1">
        {data.slice(0, 30).map((v, i) => (
          <li key={i} className="flex gap-2 border-b border-white/5 py-1">
            <span className="text-white/40 font-mono w-8 text-left">{i}</span>
            <span>{renderValue(v)}</span>
          </li>
        ))}
      </ul>
    );
  } else {
    body = (
      <div className="text-center py-4">
        <div className="text-3xl font-black" style={{ color: t.accentText }}>{renderValue(data)}</div>
        <div className="text-[11px] text-white/40 mt-1">{data == null ? "لا توجد بيانات على هذا المسار" : `النوع: ${typeof data}`}</div>
      </div>
    );
  }

  return (
    <Card title={comp.title || (comp.bindTo ? `📊 معاينة: ${comp.bindTo}` : "معاينة بيانات")}>
      {comp.description && <p className="text-xs text-white/60 mb-2">{comp.description}</p>}
      {body}
    </Card>
  );
}

// ─── Sandboxed mini web app ─────────────────────────────────────────────────
// SECURITY contract for AI-generated HTML rendered via iframe srcDoc:
//   sandbox = "allow-scripts allow-forms"  (and NOTHING else)
//   - NO `allow-same-origin` → iframe runs in an opaque origin and cannot
//                              read cookies/localStorage/sessionStorage of
//                              the parent app. Same-origin AJAX to our API
//                              would be cross-origin without credentials.
//   - `allow-forms` is allowed so educational web exercises can demonstrate
//     real <form> behaviour. Cookies on our backend use SameSite=Lax which
//     blocks them on cross-site form POSTs from this opaque origin.
//   - NO `allow-popups`, `allow-top-navigation`, `allow-modals`, etc.
// Messages from the iframe are treated as **untrusted telemetry**: we only
// trust the source window (ev.source check) and use the nonce as a sanity tag.
// Substitute `${event.data}` and `${event.data.field}` placeholders inside an
// op's value/path so the AI's eventMap can reference data the iframe sent.
function interpolateEventOp(value: any, evData: any): any {
  if (typeof value === "string") {
    return value.replace(/\$\{event\.data(?:\.([\w.]+))?\}/g, (_m, p) => {
      try {
        if (!p) return typeof evData === "string" ? evData : JSON.stringify(evData);
        let v = evData;
        for (const seg of String(p).split(".")) v = v?.[seg];
        return v == null ? "" : (typeof v === "string" ? v : JSON.stringify(v));
      } catch { return ""; }
    });
  }
  if (Array.isArray(value)) return value.map((v) => interpolateEventOp(v, evData));
  if (value && typeof value === "object") {
    const out: any = {};
    for (const [k, v] of Object.entries(value)) out[k] = interpolateEventOp(v, evData);
    return out;
  }
  return value;
}

function WebAppBlock({ comp }: { comp: Extract<DynComponent, { type: "webApp" }> }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const { pushConsole, mutate } = useEnvState();
  // Per-render nonce so the parent can sanity-check postMessage events came
  // from the HTML we just injected (not stale frames/older renders).
  const nonce = useMemo(() => Math.random().toString(36).slice(2, 12) + Date.now().toString(36), [comp.html]);
  const [events, setEvents] = useState<Array<{ type: string; data?: any; ts: number }>>([]);

  // Inject a tiny bridge into the user HTML so it can call
  // window.envEmit(type, data) → parent.postMessage({ __envNonce, type, data })
  // The bridge also patches console.log/info/warn/error and window.onerror so
  // the parent (and the AI assistant) can see runtime output from the sandbox.
  const wrappedHtml = useMemo(() => {
    const bridge = `<script>(function(){try{window.__envNonce=${JSON.stringify(nonce)};function send(type,data){try{parent.postMessage({__envNonce:window.__envNonce,type:String(type||"event"),data:data},"*")}catch(e){}}window.envEmit=send;function fmt(a){try{return typeof a==="string"?a:JSON.stringify(a)}catch(e){return String(a)}}["log","info","warn","error"].forEach(function(level){var orig=console[level]&&console[level].bind(console);console[level]=function(){try{send("console",{level:level,text:Array.prototype.map.call(arguments,fmt).join(" ")})}catch(e){}if(orig)orig.apply(null,arguments)}});window.addEventListener("error",function(e){try{send("console",{level:"error",text:(e.message||"error")+(e.filename?" @"+e.filename+":"+e.lineno:"")})}catch(_){}});window.addEventListener("unhandledrejection",function(e){try{send("console",{level:"error",text:"unhandled: "+fmt(e.reason)})}catch(_){}});}catch(e){}})();<\/script>`;
    const html = String(comp.html || "");
    if (/<\/head>/i.test(html)) return html.replace(/<\/head>/i, bridge + "</head>");
    if (/<body[^>]*>/i.test(html)) return html.replace(/<body([^>]*)>/i, "<body$1>" + bridge);
    return bridge + html;
  }, [comp.html, nonce]);

  useEffect(() => {
    function onMsg(ev: MessageEvent) {
      // Reject any message that did not come from our own iframe window.
      if (!ref.current || ev.source !== ref.current.contentWindow) return;
      const d: any = ev.data;
      if (!d || typeof d !== "object") return;
      if (d.__envNonce !== nonce) return;
      const type = typeof d.type === "string" ? d.type.slice(0, 60) : "event";
      // Console output is forwarded to the central env console buffer so the
      // AI assistant ("اشرح هذه الخطوة") can see what the sandbox printed.
      if (type === "console" && d.data && typeof d.data === "object") {
        const level = (["log", "info", "warn", "error"].includes(d.data.level) ? d.data.level : "log") as "log" | "info" | "warn" | "error";
        const text = String(d.data.text ?? "").slice(0, 500);
        pushConsole({ level, text });
        return;
      }
      setEvents((p) => [...p.slice(-19), { type, data: d.data, ts: Date.now() }]);
      // Translate the iframe event into env state mutations declared by the
      // AI in `comp.eventMap`. Looks for an exact `type` match first, then a
      // wildcard `*`. Each op's value/path may reference `${event.data.X}`.
      const map = comp.eventMap;
      if (map && typeof map === "object") {
        const ops = (map as any)[type] || (map as any)["*"];
        if (Array.isArray(ops) && ops.length > 0) {
          try {
            const expanded = ops
              .filter((o) => o && typeof o.op === "string")
              .map((o) => interpolateEventOp(o, d.data));
            mutate(expanded as any);
          } catch { /* no-op: never let a bad eventMap crash the env */ }
        }
      }
    }
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [nonce, pushConsole, mutate, comp.eventMap]);

  const height = typeof comp.height === "number" && comp.height > 100 ? comp.height : 480;

  return (
    <Card title={comp.title || "تطبيق ويب"}>
      {comp.description && <div className="text-xs text-white/60 mb-2">{comp.description}</div>}
      <iframe
        ref={ref}
        title={comp.title || "webApp"}
        sandbox="allow-scripts allow-forms"
        srcDoc={wrappedHtml}
        className="w-full rounded-lg border border-white/10 bg-white"
        style={{ height }}
      />
      {events.length > 0 && (
        <details className="mt-2">
          <summary className="text-xs text-white/60 cursor-pointer hover:text-white/80">أحداث التطبيق ({events.length})</summary>
          <div className="mt-1 space-y-1 max-h-40 overflow-y-auto" dir="ltr">
            {events.map((e, i) => (
              <div key={i} className="text-[11px] font-mono bg-black/40 border border-white/10 rounded p-1.5 text-cyan-200">
                <span className="text-white/40">{new Date(e.ts).toLocaleTimeString()}</span>{" "}
                <span className="text-amber-300">{e.type}</span>
                {e.data !== undefined && <span className="text-white/70"> {typeof e.data === "string" ? e.data : JSON.stringify(e.data).slice(0, 200)}</span>}
              </div>
            ))}
          </div>
        </details>
      )}
    </Card>
  );
}

// ─── Packet capture viewer ──────────────────────────────────────────────────
function PacketCaptureBlock({ comp, state }: { comp: Extract<DynComponent, { type: "packetCapture" }>; state: any }) {
  const packets = comp.bindTo ? arr<any>(envUtils.getByPath(state, comp.bindTo)) : arr<any>(comp.packets);
  const [sel, setSel] = useState<number | null>(null);
  const selected = sel !== null ? packets[sel] : null;
  return (
    <Card title={comp.title || "التقاط الحزم"}>
      <div className="grid md:grid-cols-2 gap-2">
        <div className="overflow-x-auto max-h-80 overflow-y-auto border border-white/10 rounded -mx-1 md:mx-0" dir="ltr">
          <table className="w-full text-[11px] md:text-[11px] text-[12px] font-mono min-w-[520px]">
            <thead className="bg-black/40 text-white/70 sticky top-0">
              <tr>
                <th className="p-1.5 text-left">#</th>
                <th className="p-1.5 text-left">Time</th>
                <th className="p-1.5 text-left">Source</th>
                <th className="p-1.5 text-left">Dest</th>
                <th className="p-1.5 text-left">Proto</th>
                <th className="p-1.5 text-left">Len</th>
                <th className="p-1.5 text-left">Info</th>
              </tr>
            </thead>
            <tbody>
              {packets.length === 0 && <tr><td colSpan={7} className="text-center text-white/40 p-3">لا توجد حزم.</td></tr>}
              {packets.map((p: any, i: number) => (
                <tr key={i} onClick={() => setSel(i)} className={`cursor-pointer ${sel === i ? "bg-cyan-500/20" : "hover:bg-white/5"} border-b border-white/5`}>
                  <td className="p-2 text-white/60">{p.no ?? i + 1}</td>
                  <td className="p-2 text-white/70">{p.time ?? ""}</td>
                  <td className="p-2 text-white/80">{p.src ?? ""}</td>
                  <td className="p-2 text-white/80">{p.dst ?? ""}</td>
                  <td className="p-2 text-cyan-300">{p.protocol ?? ""}</td>
                  <td className="p-2 text-white/60">{p.length ?? ""}</td>
                  <td className="p-2 text-white/85 truncate max-w-[180px]">{p.info ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border border-white/10 rounded p-2 bg-black/30 max-h-80 min-h-[160px] overflow-y-auto" dir="ltr">
          {selected ? (
            <div className="text-[11px] font-mono space-y-1">
              <div className="text-cyan-300 font-bold">Packet #{selected.no ?? (sel! + 1)}</div>
              <div className="text-white/70">{selected.src} → {selected.dst} [{selected.protocol}]</div>
              {selected.layers && Object.entries(selected.layers).map(([k, v]) => (
                <details key={k} open className="border-t border-white/10 pt-1">
                  <summary className="text-amber-300 cursor-pointer">{k}</summary>
                  <pre className="text-white/70 whitespace-pre-wrap text-[10px] mt-1">{typeof v === "string" ? v : JSON.stringify(v, null, 2)}</pre>
                </details>
              ))}
              {selected.info && <div className="text-white/85 mt-2 text-xs">{selected.info}</div>}
            </div>
          ) : (
            <div className="text-xs text-white/40 text-center pt-8">اختر حزمة لعرض تفاصيلها.</div>
          )}
        </div>
      </div>
    </Card>
  );
}

// ─── Terminal — read-only OR interactive command simulator ─────────────────
// When `interactive: true`, the AI provides a `commands` dictionary mapping
// command strings (e.g. "ls", "cat README", "ifconfig") to their canned
// output. Unknown commands fall back to `comp.fallback` (or a default
// "command not found" message). Each typed command also fires through the
// optional `eventMap` ("command:<name>" or "command:*") so it can mutate
// state and let tasks auto-complete from terminal usage.
function TerminalBlock({ comp, state }: { comp: Extract<DynComponent, { type: "terminal" }>; state: any }) {
  const seedLines = comp.bindTo ? arr<any>(envUtils.getByPath(state, comp.bindTo)) : arr<any>(comp.lines);
  const height = typeof comp.height === "number" && comp.height > 80 ? comp.height : 300;
  const prompt = comp.prompt || "$";
  const interactive = !!comp.interactive;
  const { mutate } = useEnvState();
  const [history, setHistory] = useState<string[]>(() => {
    const out: string[] = [];
    if (comp.welcome) out.push(String(comp.welcome));
    return out;
  });
  const [input, setInput] = useState("");
  const [past, setPast] = useState<string[]>([]);
  const [pastIdx, setPastIdx] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [history, seedLines]);

  function runCommand(raw: string) {
    const cmd = raw.trim();
    setHistory((h) => [...h, `${prompt} ${cmd}`]);
    if (cmd) setPast((p) => [...p, cmd]);
    setPastIdx(null);
    if (!cmd) return;
    if (cmd === "clear" || cmd === "cls") { setHistory([]); return; }
    const map = comp.commands || {};
    let output: string | undefined = map[cmd];
    if (output == null) {
      // Try the bare verb: "cat foo.txt" → "cat"
      const verb = cmd.split(/\s+/)[0];
      if (verb && map[verb] != null) output = map[verb];
    }
    if (output == null) {
      output = comp.fallback != null ? String(comp.fallback) : `bash: ${cmd.split(/\s+/)[0]}: command not found`;
    }
    if (output) setHistory((h) => [...h, output as string]);
    // Forward to eventMap so commands can advance tasks declaratively.
    const em = comp.eventMap;
    if (em && typeof em === "object") {
      const verb = cmd.split(/\s+/)[0] || "";
      const ops = (em as any)[`command:${cmd}`] || (em as any)[`command:${verb}`] || (em as any)["command:*"];
      if (Array.isArray(ops) && ops.length > 0) {
        try {
          const evData = { command: cmd, verb, args: cmd.split(/\s+/).slice(1).join(" ") };
          const expanded = ops
            .filter((o: any) => o && typeof o.op === "string")
            .map((o: any) => interpolateEventOp(o, evData));
          mutate(expanded as any);
        } catch { /* swallow */ }
      }
    }
  }

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") { e.preventDefault(); runCommand(input); setInput(""); return; }
    if (e.key === "ArrowUp" && past.length > 0) {
      e.preventDefault();
      const idx = pastIdx == null ? past.length - 1 : Math.max(0, pastIdx - 1);
      setPastIdx(idx); setInput(past[idx] || "");
      return;
    }
    if (e.key === "ArrowDown" && past.length > 0) {
      e.preventDefault();
      if (pastIdx == null) return;
      const idx = pastIdx + 1;
      if (idx >= past.length) { setPastIdx(null); setInput(""); }
      else { setPastIdx(idx); setInput(past[idx] || ""); }
      return;
    }
  }

  // Renders one "line" — either a seed line from state/lines or an entry the
  // user produced by typing. Lines starting with `>` get a cyan accent.
  const renderLine = (l: any, key: string | number) => (
    <div key={key} className="whitespace-pre-wrap">
      {typeof l === "string" && l.startsWith(">") ? <span className="text-cyan-300">{l}</span> : <span>{String(l)}</span>}
    </div>
  );

  return (
    <Card title={comp.title || "الطرفية"}>
      <div
        ref={scrollRef}
        className="bg-black border border-white/10 rounded p-3 overflow-auto font-mono text-[12px] text-green-300 leading-snug"
        style={{ height }}
        dir="ltr"
      >
        {seedLines.length === 0 && history.length === 0 && (
          <div className="text-white/30">{prompt} <span className="animate-pulse">▌</span></div>
        )}
        {seedLines.map((l: any, i: number) => renderLine(l, `s${i}`))}
        {history.map((l, i) => renderLine(l, `h${i}`))}
        {interactive && (
          <div className="flex items-center gap-1 mt-1 min-h-[44px]">
            <span className="text-cyan-300 select-none">{prompt}</span>
            <input
              dir="ltr"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKey}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              inputMode="text"
              className="flex-1 min-w-0 bg-transparent outline-none text-green-200 font-mono text-[13px] md:text-[12px] placeholder:text-white/30 py-2"
              placeholder="اكتب أمراً ثم Enter"
            />
          </div>
        )}
      </div>
    </Card>
  );
}

// ─── File system explorer ──────────────────────────────────────────────────
type FsNode = { name?: string; type?: "dir" | "file"; children?: any; content?: string; size?: number };
function FileSystemExplorerBlock({ comp, state }: { comp: Extract<DynComponent, { type: "fileSystemExplorer" }>; state: any }) {
  const root = envUtils.getByPath(state, comp.bindTo);
  const [selected, setSelected] = useState<{ path: string; node: FsNode } | null>(null);
  const height = typeof comp.height === "number" && comp.height > 120 ? comp.height : 360;

  // Build a Blob URL only for the currently-selected file and revoke it when
  // the selection changes or the block unmounts (avoids leaking object URLs).
  const downloadUrl = useMemo(() => {
    if (!selected || selected.node.content == null) return null;
    return URL.createObjectURL(new Blob([String(selected.node.content)], { type: "text/plain" }));
  }, [selected]);
  useEffect(() => {
    return () => { if (downloadUrl) URL.revokeObjectURL(downloadUrl); };
  }, [downloadUrl]);

  const renderTree = (node: any, name: string, path: string, depth: number): any => {
    if (!node || typeof node !== "object") return null;
    const isDir = node.type === "dir" || (node.children && typeof node.children === "object" && !node.content);
    const children = node.children && typeof node.children === "object" ? node.children : null;
    return (
      <div key={path} style={{ paddingInlineStart: depth * 14 }}>
        <button
          onClick={() => !isDir && setSelected({ path, node })}
          className={`flex items-center gap-2 text-sm md:text-xs py-2 md:py-1 min-h-[36px] md:min-h-0 hover:text-cyan-300 w-full text-right ${selected?.path === path ? "text-cyan-300" : "text-white/80"}`}
        >
          <span>{isDir ? "📁" : "📄"}</span>
          <span dir="ltr" className="truncate">{name}</span>
        </button>
        {isDir && children && Object.entries(children).map(([k, v]) => renderTree(v, k, `${path}/${k}`, depth + 1))}
      </div>
    );
  };

  // On mobile we use auto height with a sane min so the explorer doesn't
  // collapse to nothing; desktop respects the explicit `height` prop so the
  // two panes align side-by-side.
  return (
    <Card title={comp.title || "نظام الملفات"}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:!h-[var(--fs-h)]" style={{ ["--fs-h" as any]: `${height}px` }}>
        <div className="overflow-auto border border-white/10 rounded p-2 bg-black/30 min-h-[180px] max-h-[260px] md:max-h-none">
          {root && typeof root === "object"
            ? renderTree(root, root.name || "/", "/", 0)
            : <div className="text-xs text-white/40">لا توجد ملفات.</div>}
        </div>
        <div className="overflow-auto border border-white/10 rounded p-2 bg-black/30 min-h-[180px] max-h-[320px] md:max-h-none">
          {selected ? (
            <>
              {/* Breadcrumb: split selected path into clickable parts. The last
                  segment is the current file; earlier segments echo the
                  directory chain so the user always knows where they are. */}
              <div className="flex items-center flex-wrap gap-1 mb-2 text-[11px] font-mono" dir="ltr">
                {selected.path.split("/").filter(Boolean).map((seg, i, arr) => (
                  <span key={i} className="flex items-center gap-1">
                    <span className={i === arr.length - 1 ? "text-cyan-300 font-bold" : "text-white/60"}>{seg}</span>
                    {i < arr.length - 1 && <span className="text-white/30">/</span>}
                  </span>
                ))}
              </div>
              <pre className="text-[12px] md:text-[11px] text-white/85 whitespace-pre-wrap font-mono" dir="ltr">{String(selected.node.content ?? "")}</pre>
              {comp.allowDownload && downloadUrl && (
                <a
                  href={downloadUrl}
                  download={selected.node.name || "file.txt"}
                  className="inline-block mt-2 text-xs bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 rounded px-3 py-2 text-cyan-200 min-h-[36px]"
                >تنزيل</a>
              )}
            </>
          ) : (
            <div className="text-xs text-white/40 text-center pt-8">اختر ملفاً لعرض محتواه.</div>
          )}
        </div>
      </div>
    </Card>
  );
}

// ─── Mini sandboxed browser ────────────────────────────────────────────────
function BrowserBlock({ comp, state }: { comp: Extract<DynComponent, { type: "browser" }>; state: any }) {
  const pages = comp.bindTo ? arr<any>(envUtils.getByPath(state, comp.bindTo)) : arr<any>(comp.pages);
  const [idx, setIdx] = useState(0);
  const current = pages[idx] || null;
  const height = typeof comp.height === "number" && comp.height > 200 ? comp.height : 480;
  const ref = useRef<HTMLIFrameElement>(null);
  const { pushConsole, mutate } = useEnvState();
  const nonce = useMemo(() => Math.random().toString(36).slice(2, 12) + Date.now().toString(36), [idx, current?.html]);

  // Same console-capture bridge as WebAppBlock so console output from any
  // browsed page flows into the shared env console buffer for the AI.
  const wrappedHtml = useMemo(() => {
    if (!current) return "";
    const bridge = `<script>(function(){try{window.__envNonce=${JSON.stringify(nonce)};function send(type,data){try{parent.postMessage({__envNonce:window.__envNonce,type:String(type||"event"),data:data},"*")}catch(e){}}window.envEmit=send;function fmt(a){try{return typeof a==="string"?a:JSON.stringify(a)}catch(e){return String(a)}}["log","info","warn","error"].forEach(function(level){var orig=console[level]&&console[level].bind(console);console[level]=function(){try{send("console",{level:level,text:Array.prototype.map.call(arguments,fmt).join(" ")})}catch(e){}if(orig)orig.apply(null,arguments)}});window.addEventListener("error",function(e){try{send("console",{level:"error",text:(e.message||"error")+(e.filename?" @"+e.filename+":"+e.lineno:"")})}catch(_){}});}catch(e){}})();<\/script>`;
    const html = String(current.html || "");
    if (/<\/head>/i.test(html)) return html.replace(/<\/head>/i, bridge + "</head>");
    if (/<body[^>]*>/i.test(html)) return html.replace(/<body([^>]*)>/i, "<body$1>" + bridge);
    return bridge + html;
  }, [current, nonce]);

  useEffect(() => {
    function onMsg(ev: MessageEvent) {
      if (!ref.current || ev.source !== ref.current.contentWindow) return;
      const d: any = ev.data;
      if (!d || typeof d !== "object" || d.__envNonce !== nonce) return;
      if (d.type === "console" && d.data && typeof d.data === "object") {
        const level = (["log", "info", "warn", "error"].includes(d.data.level) ? d.data.level : "log") as "log" | "info" | "warn" | "error";
        pushConsole({ level, text: String(d.data.text ?? "").slice(0, 500) });
        return;
      }
      // eventMap → state mutations (same contract as WebAppBlock).
      const map = comp.eventMap;
      if (map && typeof map === "object" && typeof d.type === "string") {
        const ops = (map as any)[d.type] || (map as any)["*"];
        if (Array.isArray(ops) && ops.length > 0) {
          try {
            const expanded = ops
              .filter((o: any) => o && typeof o.op === "string")
              .map((o: any) => interpolateEventOp(o, d.data));
            mutate(expanded as any);
          } catch { /* swallow */ }
        }
      }
    }
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [nonce, pushConsole, mutate, comp.eventMap]);

  return (
    <Card title={comp.title || "المتصفح"}>
      <div className="flex flex-wrap gap-1 mb-2 border-b border-white/10 pb-1">
        {pages.length === 0 && <span className="text-xs text-white/40">لا توجد صفحات.</span>}
        {pages.map((p: any, i: number) => (
          <button
            key={i}
            onClick={() => setIdx(i)}
            className={`text-xs px-2 py-1 rounded ${idx === i ? "bg-cyan-500/20 text-cyan-200" : "bg-white/5 text-white/70 hover:bg-white/10"}`}
          >{p.title || p.url}</button>
        ))}
      </div>
      {current && (
        <>
          <div className="flex items-center gap-1 mb-1 text-[11px] font-mono text-white/70 bg-black/40 border border-white/10 rounded px-2 py-1" dir="ltr">
            <span>🌐</span>
            <span className="truncate">{current.url || "about:blank"}</span>
          </div>
          {/* Same sandbox policy as WebAppBlock — see security note above. */}
          <iframe
            ref={ref}
            title={current.url || "browser"}
            sandbox="allow-scripts allow-forms"
            srcDoc={wrappedHtml}
            className="w-full rounded-lg border border-white/10 bg-white"
            style={{ height }}
          />
        </>
      )}
    </Card>
  );
}

// ─── Network topology diagram ──────────────────────────────────────────────
// Uses a fixed viewBox + preserveAspectRatio so the SVG scales fluidly on
// every device. Accent colours come from the active subject theme so
// "networking" feels distinctly different from "cybersecurity".
function NetworkDiagramBlock({ comp, state }: { comp: Extract<DynComponent, { type: "networkDiagram" }>; state: any }) {
  const t = useEnvTheme();
  const data = comp.bindTo ? envUtils.getByPath(state, comp.bindTo) : { nodes: comp.nodes, edges: comp.edges };
  const nodes = arr<any>(data?.nodes || comp.nodes);
  const edges = arr<any>(data?.edges || comp.edges);
  const height = typeof comp.height === "number" && comp.height > 120 ? comp.height : 320;
  const W = 600, H = 360;

  const positioned = nodes.map((n: any, i: number) => {
    if (typeof n.x === "number" && typeof n.y === "number") return n;
    const angle = (i / Math.max(nodes.length, 1)) * Math.PI * 2;
    const r = Math.min(W, H) * 0.36;
    return { ...n, x: W / 2 + Math.cos(angle) * r, y: H / 2 + Math.sin(angle) * r };
  });
  const byId = new Map(positioned.map((n: any) => [n.id, n]));

  return (
    <Card title={comp.title || "طوبولوجيا الشبكة"}>
      <div className="bg-black/40 border border-white/10 rounded overflow-hidden" style={{ height }}>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" className="w-full h-full block">
          {edges.map((e: any, i: number) => {
            const a: any = byId.get(e.from); const b: any = byId.get(e.to);
            if (!a || !b) return null;
            return (
              <g key={i}>
                <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={t.accentBorder} strokeWidth="1.5" />
                {e.label && (
                  <text x={(a.x + b.x) / 2} y={(a.y + b.y) / 2 - 4} fontSize="11" fill="#cbd5e1" textAnchor="middle">{e.label}</text>
                )}
              </g>
            );
          })}
          {positioned.map((n: any) => (
            <g key={n.id}>
              <circle cx={n.x} cy={n.y} r="24" fill={t.accentSoft} stroke={t.accent} strokeWidth="1.5" />
              <text x={n.x} y={n.y + 4} fontSize="12" fill="#f1f5f9" textAnchor="middle" fontWeight="bold">{n.label || n.id}</text>
              {n.kind && <text x={n.x} y={n.y + 40} fontSize="10" fill="#94a3b8" textAnchor="middle">{n.kind}</text>}
            </g>
          ))}
        </svg>
      </div>
    </Card>
  );
}

// ─── Structured log viewer ─────────────────────────────────────────────────
function LogViewerBlock({ comp, state }: { comp: Extract<DynComponent, { type: "logViewer" }>; state: any }) {
  const entries = comp.bindTo ? arr<any>(envUtils.getByPath(state, comp.bindTo)) : arr<any>(comp.entries);
  const [filter, setFilter] = useState("");
  const [level, setLevel] = useState<string>("");
  const filtered = entries.filter((e: any) => {
    if (level && e.level !== level) return false;
    if (filter && !(`${e.message || ""} ${e.source || ""}`.toLowerCase().includes(filter.toLowerCase()))) return false;
    return true;
  });
  const height = typeof comp.height === "number" && comp.height > 120 ? comp.height : 320;
  const levelColor = (lv?: string) =>
    lv === "error" ? "bg-red-500/20 text-red-200 border-red-500/40"
    : lv === "warn" ? "bg-amber-500/20 text-amber-200 border-amber-500/40"
    : lv === "debug" ? "bg-purple-500/20 text-purple-200 border-purple-500/40"
    : lv === "trace" ? "bg-white/10 text-white/60 border-white/20"
    : "bg-cyan-500/20 text-cyan-200 border-cyan-500/40";
  return (
    <Card title={comp.title || "السجلات"}>
      <div className="flex flex-wrap gap-2 mb-2" dir="ltr">
        <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="filter…" className="flex-1 min-w-[120px] bg-black/30 border border-white/15 rounded px-2 py-1 text-xs text-white" />
        <select value={level} onChange={(e) => setLevel(e.target.value)} className="bg-black/30 border border-white/15 rounded px-2 py-1 text-xs text-white">
          <option value="">all levels</option>
          <option value="info">info</option>
          <option value="warn">warn</option>
          <option value="error">error</option>
          <option value="debug">debug</option>
          <option value="trace">trace</option>
        </select>
      </div>
      <div className="bg-black/40 border border-white/10 rounded p-2 overflow-auto font-mono text-[11px] space-y-0.5" style={{ height }} dir="ltr">
        {filtered.length === 0 && <div className="text-white/40 text-center py-4">لا توجد سجلات مطابقة.</div>}
        {filtered.map((e: any, i: number) => (
          <div key={i} className="flex items-start gap-2 py-0.5 border-b border-white/5">
            {e.ts && <span className="text-white/40 shrink-0">{e.ts}</span>}
            {e.level && <span className={`text-[10px] font-bold uppercase border rounded px-1 py-0.5 shrink-0 ${levelColor(e.level)}`}>{e.level}</span>}
            {e.source && <span className="text-amber-300 shrink-0">{e.source}</span>}
            <span className="text-white/85 break-all">{e.message}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
