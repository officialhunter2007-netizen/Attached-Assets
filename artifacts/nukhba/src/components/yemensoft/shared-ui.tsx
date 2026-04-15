import { ArrowLeftRight } from "lucide-react";

export function SimField({ label, value, onChange, placeholder, type = "text", dir = "rtl" as "rtl" | "ltr" }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  dir?: "rtl" | "ltr";
}) {
  return (
    <div>
      <label className="block text-[11px] text-[#6e6a86] mb-1 font-bold">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-[#1e1e2e] border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-teal-400/50 transition-colors"
        style={{ direction: dir }}
      />
    </div>
  );
}

export function SimSelect({ label, value, onChange, options }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="block text-[11px] text-[#6e6a86] mb-1 font-bold">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-[#1e1e2e] border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-teal-400/50 transition-colors"
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

export function ShareButton({ onClick, label = "شارك مع المعلم" }: { onClick: () => void; label?: string }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition-all"
    >
      <ArrowLeftRight className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}

export function SectionCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-white/5 bg-white/[0.02] p-3 sm:p-4 space-y-3 ${className}`}>
      {children}
    </div>
  );
}

export function StatCard({ label, value, color = "text-white", icon }: {
  label: string;
  value: string;
  color?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/5 p-3 bg-white/[0.02]">
      <div className="flex items-center gap-2 mb-1">
        {icon && <span className={color}>{icon}</span>}
        <span className="text-[10px] text-[#6e6a86] font-bold">{label}</span>
      </div>
      <span className={`text-xs sm:text-sm font-bold font-mono ${color}`}>{value}</span>
    </div>
  );
}

export function EmptyState({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="text-center py-10 text-[#6e6a86]">
      <div className="mx-auto mb-3 opacity-30">{icon}</div>
      <p className="text-sm font-bold">{title}</p>
      <p className="text-xs mt-1">{subtitle}</p>
    </div>
  );
}

export function ActionButton({ onClick, disabled, children, variant = "teal" }: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  variant?: "teal" | "amber" | "red" | "blue";
}) {
  const colors = {
    teal: "bg-teal-600 hover:bg-teal-500",
    amber: "bg-amber-600 hover:bg-amber-500",
    red: "bg-red-600 hover:bg-red-500",
    blue: "bg-blue-600 hover:bg-blue-500",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl ${colors[variant]} text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  );
}

export function Badge({ children, color = "teal" }: { children: React.ReactNode; color?: "teal" | "amber" | "red" | "emerald" | "blue" | "purple" }) {
  const colors = {
    teal: "bg-teal-500/20 text-teal-400",
    amber: "bg-amber-500/20 text-amber-400",
    red: "bg-red-500/20 text-red-400",
    emerald: "bg-emerald-500/20 text-emerald-400",
    blue: "bg-blue-500/20 text-blue-400",
    purple: "bg-purple-500/20 text-purple-400",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${colors[color]}`}>
      {children}
    </span>
  );
}
