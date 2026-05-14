import { ReactNode } from "react";
import { Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { useLang } from "@/lib/lang-context";

export type AccentVariant = "gold" | "emerald" | "amber" | "blue" | "red" | "yellow" | "neutral";

const ACCENT_TOKENS: Record<AccentVariant, { border: string; glow: string; bar: string; text: string; bgFrom: string }> = {
  gold:    { border: "rgba(245,158,11,0.25)",  glow: "0 0 24px rgba(245,158,11,0.10)",  bar: "linear-gradient(180deg, #F59E0B, #D97706)", text: "#F59E0B", bgFrom: "rgba(245,158,11,0.06)" },
  emerald: { border: "rgba(16,185,129,0.25)",  glow: "0 0 24px rgba(16,185,129,0.10)",  bar: "linear-gradient(180deg, #10B981, #059669)", text: "#10B981", bgFrom: "rgba(16,185,129,0.06)" },
  amber:   { border: "rgba(251,191,36,0.30)",  glow: "0 0 24px rgba(251,191,36,0.10)",  bar: "linear-gradient(180deg, #FBBF24, #F59E0B)", text: "#FBBF24", bgFrom: "rgba(251,191,36,0.06)" },
  blue:    { border: "rgba(59,130,246,0.25)",  glow: "0 0 24px rgba(59,130,246,0.10)",  bar: "linear-gradient(180deg, #60A5FA, #3B82F6)", text: "#60A5FA", bgFrom: "rgba(59,130,246,0.06)" },
  red:     { border: "rgba(239,68,68,0.40)",   glow: "0 0 24px rgba(239,68,68,0.15)",   bar: "linear-gradient(180deg, #F87171, #DC2626)", text: "#F87171", bgFrom: "rgba(239,68,68,0.08)" },
  yellow:  { border: "rgba(234,179,8,0.30)",   glow: "0 0 24px rgba(234,179,8,0.10)",   bar: "linear-gradient(180deg, #FACC15, #CA8A04)", text: "#FACC15", bgFrom: "rgba(234,179,8,0.06)" },
  neutral: { border: "rgba(255,255,255,0.08)", glow: "0 4px 20px rgba(0,0,0,0.30)",     bar: "linear-gradient(180deg, #6B7280, #374151)", text: "#9CA3AF", bgFrom: "rgba(255,255,255,0.02)" },
};

export function DashboardCard({
  accent = "neutral",
  className = "",
  padding = "p-6",
  children,
}: {
  accent?: AccentVariant;
  className?: string;
  padding?: string;
  children: ReactNode;
}) {
  const tk = ACCENT_TOKENS[accent];
  return (
    <div
      className={`relative rounded-3xl overflow-hidden ${padding} ${className}`}
      style={{
        background: `linear-gradient(135deg, ${tk.bgFrom} 0%, rgba(10,13,22,0.85) 70%)`,
        border: `1px solid ${tk.border}`,
        boxShadow: tk.glow,
      }}
    >
      {children}
    </div>
  );
}

export function SectionHeading({
  accent = "gold",
  icon,
  children,
  level = 2,
}: {
  accent?: AccentVariant;
  icon?: ReactNode;
  children: ReactNode;
  level?: 2 | 3;
}) {
  const tk = ACCENT_TOKENS[accent];
  const Tag = (level === 2 ? "h2" : "h3") as "h2" | "h3";
  return (
    <Tag className={`flex items-center gap-3 mb-6 font-bold ${level === 2 ? "text-2xl md:text-[26px]" : "text-xl"}`}>
      <span
        aria-hidden
        className="inline-block w-1.5 h-7 rounded-full shrink-0"
        style={{ background: tk.bar, boxShadow: `0 0 10px ${tk.border}` }}
      />
      {icon && <span style={{ color: tk.text }} className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </Tag>
  );
}

export function SectionState({
  loading,
  error,
  empty,
  emptyIcon,
  emptyMessage,
  onRetry,
  children,
}: {
  loading: boolean;
  error: string | null;
  empty: boolean;
  emptyIcon?: ReactNode;
  emptyMessage: string;
  onRetry?: () => void;
  children: ReactNode;
}) {
  const { tr } = useLang();
  const td = tr.dashboard;

  if (loading) {
    return (
      <DashboardCard padding="p-10">
        <div className="flex flex-col items-center justify-center text-muted-foreground gap-3">
          <Loader2 className="w-7 h-7 animate-spin opacity-70" />
          <span className="text-sm">{td.loadingText}</span>
        </div>
      </DashboardCard>
    );
  }
  if (error) {
    return (
      <DashboardCard accent="red" padding="p-8">
        <div className="flex flex-col items-center text-center gap-3">
          <AlertCircle className="w-8 h-8 text-red-400" />
          <p className="text-sm text-red-200/90">{error}</p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-red-500/15 hover:bg-red-500/25 border border-red-500/40 text-red-200 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              {td.retryBtn}
            </button>
          )}
        </div>
      </DashboardCard>
    );
  }
  if (empty) {
    return (
      <DashboardCard padding="p-10">
        <div className="flex flex-col items-center text-center text-muted-foreground gap-3">
          {emptyIcon && <div className="opacity-40">{emptyIcon}</div>}
          <p className="text-sm leading-relaxed max-w-md">{emptyMessage}</p>
        </div>
      </DashboardCard>
    );
  }
  return <>{children}</>;
}
