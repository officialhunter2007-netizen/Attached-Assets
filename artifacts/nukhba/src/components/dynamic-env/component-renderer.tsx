import { useState, type ReactNode } from "react";
import type { DynComponent, DynFormField } from "./types";

type Ctx = {
  onAction?: (action: { type: string; [k: string]: any }) => void;
  onGoToScreen?: (screenId: string) => void;
  onAskAi?: (prompt: string) => void;
};

function Card({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4 mb-3">
      {title && <h3 className="font-bold text-white mb-3">{title}</h3>}
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

function FormBlock({ comp, ctx }: { comp: Extract<DynComponent, { type: "form" }>; ctx: Ctx }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  const setVal = (k: string, v: string) => setValues((p) => ({ ...p, [k]: v }));

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (comp.submit.type === "check") {
      const tol = comp.submit.tolerance ?? 0.01;
      let allOk = true;
      const wrong: string[] = [];
      for (const [k, expected] of Object.entries(comp.submit.expected)) {
        const got = (values[k] || "").trim();
        if (typeof expected === "number") {
          const n = parseFloat(got.replace(/,/g, ""));
          if (isNaN(n) || Math.abs(n - expected) > Math.abs(expected * tol) + 0.0001) {
            allOk = false;
            wrong.push(k);
          }
        } else {
          if (got.toLowerCase().replace(/\s+/g, "") !== String(expected).toLowerCase().replace(/\s+/g, "")) {
            allOk = false;
            wrong.push(k);
          }
        }
      }
      setFeedback({
        ok: allOk,
        msg: allOk
          ? (comp.submit.correctMessage || "إجابة صحيحة! ✓")
          : (comp.submit.incorrectMessage || `راجع الحقول: ${wrong.join("، ")}`),
      });
    } else if (comp.submit.type === "ask-ai") {
      const filled = Object.entries(values).map(([k, v]) => `${k}: ${v}`).join("\n");
      ctx.onAskAi?.(`${comp.submit.prompt}\n\nإجابة الطالب:\n${filled}`);
      setFeedback({ ok: true, msg: "تم إرسال إجابتك للمعلم الذكي للمراجعة." });
    }
  };

  return (
    <Card title={comp.title}>
      {comp.description && <p className="text-sm text-white/70 mb-3">{comp.description}</p>}
      <form onSubmit={onSubmit} className="space-y-3">
        {(Array.isArray(comp.fields) ? comp.fields : []).map((f: DynFormField) => (
          <div key={f.name}>
            <label className="block text-sm text-white/80 mb-1">
              {f.label}{f.required && <span className="text-red-400 mr-1">*</span>}
              {"unit" in f && f.unit && <span className="text-white/50 mr-2">({f.unit})</span>}
            </label>
            {f.type === "textarea" ? (
              <textarea
                className="w-full bg-black/30 border border-white/15 rounded-lg p-2 text-white text-sm"
                rows={3}
                placeholder={"placeholder" in f ? f.placeholder : ""}
                value={values[f.name] || ""}
                onChange={(e) => setVal(f.name, e.target.value)}
                required={f.required}
              />
            ) : f.type === "select" ? (
              <select
                className="w-full bg-black/30 border border-white/15 rounded-lg p-2 text-white text-sm"
                value={values[f.name] || ""}
                onChange={(e) => setVal(f.name, e.target.value)}
                required={f.required}
              >
                <option value="">— اختر —</option>
                {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : (
              <input
                className="w-full bg-black/30 border border-white/15 rounded-lg p-2 text-white text-sm"
                type={f.type === "number" ? "number" : "text"}
                step="any"
                placeholder={"placeholder" in f ? f.placeholder : ""}
                value={values[f.name] || ""}
                onChange={(e) => setVal(f.name, e.target.value)}
                required={f.required}
              />
            )}
          </div>
        ))}
        <button
          type="submit"
          className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold rounded-lg px-4 py-2 text-sm"
        >
          {comp.submitLabel || "إرسال"}
        </button>
        {feedback && (
          <div className={`mt-2 p-3 rounded-lg border text-sm ${toneClasses(feedback.ok ? "success" : "error")}`}>
            {feedback.msg}
          </div>
        )}
      </form>
    </Card>
  );
}

function ChartBlock({ comp }: { comp: Extract<DynComponent, { type: "chart" }> }) {
  const ds = comp.datasets[0];
  const max = Math.max(...(ds?.data || [1]), 1);
  return (
    <Card title={comp.title}>
      <div className="space-y-2">
        {(ds?.data || []).map((v, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-24 text-xs text-white/70 truncate">{comp.labels[i] ?? ""}</div>
            <div className="flex-1 bg-white/5 rounded h-5 overflow-hidden">
              <div className="bg-cyan-500 h-full" style={{ width: `${(v / max) * 100}%` }} />
            </div>
            <div className="w-16 text-xs text-white/80 text-left">{v}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function arr<T>(v: any): T[] {
  return Array.isArray(v) ? v : [];
}

export function ComponentRenderer({ comp, ctx }: { comp: DynComponent; ctx: Ctx }) {
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

    case "kpi":
      return (
        <Card>
          <div className="text-xs text-white/60 mb-1">{comp.label}</div>
          <div className="text-2xl font-bold text-cyan-300">{comp.value}</div>
          {comp.sublabel && <div className="text-xs text-white/50 mt-1">{comp.sublabel}</div>}
        </Card>
      );

    case "kpiGrid":
      return (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
          {arr<any>(comp.items).map((it, i) => (
            <div key={i} className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="text-xs text-white/60 mb-1">{it.label}</div>
              <div className="text-xl font-bold text-cyan-300">{it.value}</div>
              {it.sublabel && <div className="text-[11px] text-white/50 mt-1">{it.sublabel}</div>}
            </div>
          ))}
        </div>
      );

    case "table":
      return (
        <Card title={comp.title}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead>
                <tr className="border-b border-white/10 text-white/70">
                  {arr<string>(comp.columns).map((c, i) => <th key={i} className="px-2 py-2 font-medium">{c}</th>)}
                </tr>
              </thead>
              <tbody>
                {arr<any>(comp.rows).map((r, i) => (
                  <tr key={i} className="border-b border-white/5">
                    {arr<string>(r).map((cell, j) => <td key={j} className="px-2 py-2 text-white/90">{cell}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      );

    case "journal":
      return (
        <Card title={comp.title || "اليومية"}>
          <div className="space-y-2">
            {arr<any>(comp.items).map((it, i) => (
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

    case "list":
      return (
        <Card title={comp.title}>
          <ul className="space-y-2">
            {arr<any>(comp.items).map((it, i) => (
              <li key={i} className="flex items-start justify-between gap-2 text-sm">
                <div>
                  <div className="text-white/90">{it.title}</div>
                  {it.subtitle && <div className="text-xs text-white/60">{it.subtitle}</div>}
                </div>
                {it.badge && <span className="text-xs bg-white/10 text-white/80 rounded px-2 py-1 shrink-0">{it.badge}</span>}
              </li>
            ))}
          </ul>
        </Card>
      );

    case "kvList":
      return (
        <Card title={comp.title}>
          <dl className="space-y-1 text-sm">
            {arr<any>(comp.items).map((it, i) => (
              <div key={i} className="flex justify-between gap-3 py-1 border-b border-white/5 last:border-0">
                <dt className="text-white/60">{it.key}</dt>
                <dd className="text-white/90 text-left">{it.value}</dd>
              </div>
            ))}
          </dl>
        </Card>
      );

    case "form":
      return <FormBlock comp={comp} ctx={ctx} />;

    case "button":
      return (
        <button
          onClick={() => {
            if (comp.action.type === "go-to-screen") ctx.onGoToScreen?.(comp.action.screenId);
            else if (comp.action.type === "ask-ai") ctx.onAskAi?.(comp.action.prompt);
            else ctx.onAction?.(comp.action);
          }}
          className={`rounded-lg px-4 py-2 text-sm font-bold mb-3 ${
            comp.tone === "secondary"
              ? "bg-white/10 hover:bg-white/15 text-white"
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

    case "chart":
      return <ChartBlock comp={comp} />;

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

    default:
      return null;
  }
}
