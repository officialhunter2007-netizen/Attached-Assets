import { useState } from "react";
import { Share2, Play, Loader2, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

interface ScanResult {
  port: number;
  state: "open" | "closed" | "filtered";
  service: string;
  version: string;
  risk: "high" | "medium" | "low" | "info";
}

const TARGETS: Record<string, { name: string; os: string; ports: ScanResult[] }> = {
  "192.168.1.100": {
    name: "خادم الويب",
    os: "Ubuntu 22.04 LTS",
    ports: [
      { port: 22, state: "open", service: "ssh", version: "OpenSSH 8.9p1", risk: "low" },
      { port: 80, state: "open", service: "http", version: "Apache/2.4.52", risk: "medium" },
      { port: 443, state: "open", service: "https", version: "Apache/2.4.52", risk: "low" },
      { port: 3306, state: "open", service: "mysql", version: "MySQL 8.0.32", risk: "high" },
      { port: 8080, state: "open", service: "http-proxy", version: "Tomcat 9.0.68", risk: "medium" },
      { port: 21, state: "filtered", service: "ftp", version: "", risk: "info" },
      { port: 23, state: "closed", service: "telnet", version: "", risk: "info" },
      { port: 25, state: "closed", service: "smtp", version: "", risk: "info" },
    ]
  },
  "10.0.0.5": {
    name: "خادم قاعدة البيانات",
    os: "CentOS 8",
    ports: [
      { port: 22, state: "open", service: "ssh", version: "OpenSSH 8.0", risk: "low" },
      { port: 5432, state: "open", service: "postgresql", version: "PostgreSQL 14.6", risk: "medium" },
      { port: 6379, state: "open", service: "redis", version: "Redis 7.0.7", risk: "high" },
      { port: 27017, state: "open", service: "mongodb", version: "MongoDB 6.0", risk: "high" },
      { port: 3389, state: "closed", service: "rdp", version: "", risk: "info" },
    ]
  },
  "172.16.0.1": {
    name: "جهاز التوجيه",
    os: "Cisco IOS 15.7",
    ports: [
      { port: 22, state: "open", service: "ssh", version: "Cisco SSH 2.0", risk: "low" },
      { port: 23, state: "open", service: "telnet", version: "Cisco Telnet", risk: "high" },
      { port: 80, state: "open", service: "http", version: "Cisco HTTP 1.0", risk: "medium" },
      { port: 161, state: "open", service: "snmp", version: "SNMPv2c", risk: "high" },
      { port: 443, state: "filtered", service: "https", version: "", risk: "info" },
    ]
  },
  "192.168.1.200": {
    name: "خادم Windows",
    os: "Windows Server 2019",
    ports: [
      { port: 135, state: "open", service: "msrpc", version: "Microsoft Windows RPC", risk: "medium" },
      { port: 139, state: "open", service: "netbios-ssn", version: "Microsoft Windows netbios-ssn", risk: "medium" },
      { port: 445, state: "open", service: "microsoft-ds", version: "Windows Server 2019 SMB", risk: "high" },
      { port: 3389, state: "open", service: "ms-wbt-server", version: "Microsoft Terminal Services", risk: "high" },
      { port: 5985, state: "open", service: "wsman", version: "WinRM", risk: "medium" },
    ]
  },
};

const riskColors = {
  high: "text-red-400 bg-red-500/15 border-red-500/30",
  medium: "text-amber-400 bg-amber-500/15 border-amber-500/30",
  low: "text-emerald-400 bg-emerald-500/15 border-emerald-500/30",
  info: "text-blue-400 bg-blue-500/15 border-blue-500/30",
};
const riskLabels = { high: "خطر عالي", medium: "متوسط", low: "منخفض", info: "معلومات" };
const stateIcons = {
  open: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />,
  closed: <XCircle className="w-3.5 h-3.5 text-red-400/50" />,
  filtered: <AlertTriangle className="w-3.5 h-3.5 text-amber-400/50" />,
};

export default function PortScanner({ onShare }: { onShare: (c: string) => void }) {
  const [target, setTarget] = useState("192.168.1.100");
  const [scanType, setScanType] = useState<"syn" | "connect" | "udp" | "version">("syn");
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState<ScanResult[] | null>(null);
  const [targetInfo, setTargetInfo] = useState<{ name: string; os: string } | null>(null);
  const [progress, setProgress] = useState(0);

  const scan = () => {
    setScanning(true);
    setResults(null);
    setProgress(0);

    const t = TARGETS[target];
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) { clearInterval(interval); return 100; }
        return p + Math.random() * 15 + 5;
      });
    }, 200);

    setTimeout(() => {
      clearInterval(interval);
      setProgress(100);
      setScanning(false);
      if (t) {
        setResults(t.ports);
        setTargetInfo({ name: t.name, os: t.os });
      } else {
        setResults([]);
        setTargetInfo(null);
      }
    }, 2500);
  };

  const shareResults = () => {
    if (!results) return;
    const lines = [
      `نتائج مسح المنافذ - الهدف: ${target}`,
      targetInfo ? `النظام: ${targetInfo.os}` : "",
      `نوع المسح: ${scanType.toUpperCase()}`,
      "",
      "PORT     STATE     SERVICE        VERSION",
      ...results.map(r =>
        `${String(r.port).padEnd(9)}${r.state.padEnd(10)}${r.service.padEnd(15)}${r.version}`
      ),
      "",
      `المنافذ المفتوحة: ${results.filter(r => r.state === "open").length}`,
      `المخاطر العالية: ${results.filter(r => r.risk === "high" && r.state === "open").length}`,
    ];
    onShare(lines.join("\n"));
  };

  return (
    <div className="flex flex-col h-full overflow-hidden" dir="rtl">
      <div className="shrink-0 p-4 border-b border-white/5 space-y-3 bg-[#0d1119]">
        <div className="flex flex-wrap gap-2">
          <select
            value={target}
            onChange={e => { setTarget(e.target.value); setResults(null); }}
            className="flex-1 min-w-[180px] bg-black/30 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/40"
          >
            {Object.entries(TARGETS).map(([ip, t]) => (
              <option key={ip} value={ip}>{ip} — {t.name}</option>
            ))}
          </select>
          <select
            value={scanType}
            onChange={e => setScanType(e.target.value as any)}
            className="bg-black/30 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none"
          >
            <option value="syn">SYN Scan (-sS)</option>
            <option value="connect">Connect Scan (-sT)</option>
            <option value="udp">UDP Scan (-sU)</option>
            <option value="version">Version Scan (-sV)</option>
          </select>
          <button
            onClick={scan}
            disabled={scanning}
            className="px-5 py-2.5 bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded-xl text-sm font-bold hover:bg-blue-500/30 transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {scanning ? "جاري المسح..." : "ابدأ المسح"}
          </button>
        </div>

        {scanning && (
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>جاري مسح {target}...</span>
              <span>{Math.min(100, Math.round(progress))}%</span>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${Math.min(100, progress)}%` }} />
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {results !== null && (
          <>
            {targetInfo && (
              <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-white">{targetInfo.name} ({target})</p>
                  <p className="text-xs text-muted-foreground">نظام التشغيل: {targetInfo.os}</p>
                </div>
                <button onClick={shareResults} className="text-[10px] text-muted-foreground hover:text-white flex items-center gap-1">
                  <Share2 className="w-3 h-3" /> مشاركة
                </button>
              </div>
            )}

            <div className="bg-black/20 rounded-xl border border-white/5 overflow-hidden">
              <div className="grid grid-cols-[60px_70px_1fr_1fr_90px] gap-0 text-[11px] font-bold text-muted-foreground border-b border-white/5 px-3 py-2 bg-white/3">
                <span>المنفذ</span><span>الحالة</span><span>الخدمة</span><span>الإصدار</span><span>المخاطر</span>
              </div>
              {results.map((r, i) => (
                <div key={i} className="grid grid-cols-[60px_70px_1fr_1fr_90px] gap-0 text-xs px-3 py-2 border-b border-white/3 hover:bg-white/3 transition-colors items-center">
                  <span className="font-mono font-bold text-white">{r.port}</span>
                  <span className="flex items-center gap-1">{stateIcons[r.state]} <span className="text-[10px]">{r.state}</span></span>
                  <span className="text-white font-medium">{r.service}</span>
                  <span className="text-muted-foreground font-mono text-[10px]">{r.version || "—"}</span>
                  {r.state === "open" ? (
                    <span className={`text-[9px] px-2 py-0.5 rounded-full border font-bold text-center ${riskColors[r.risk]}`}>
                      {riskLabels[r.risk]}
                    </span>
                  ) : <span className="text-[10px] text-muted-foreground/40">—</span>}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3 text-center">
                <div className="text-lg font-bold text-emerald-400">{results.filter(r => r.state === "open").length}</div>
                <div className="text-[10px] text-muted-foreground">منافذ مفتوحة</div>
              </div>
              <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-3 text-center">
                <div className="text-lg font-bold text-red-400">{results.filter(r => r.risk === "high" && r.state === "open").length}</div>
                <div className="text-[10px] text-muted-foreground">مخاطر عالية</div>
              </div>
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 text-center">
                <div className="text-lg font-bold text-amber-400">{results.filter(r => r.state === "filtered").length}</div>
                <div className="text-[10px] text-muted-foreground">مُفلترة</div>
              </div>
            </div>

            {results.filter(r => r.risk === "high" && r.state === "open").length > 0 && (
              <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-3">
                <p className="text-xs font-bold text-red-400 mb-2 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> تنبيهات أمنية
                </p>
                {results.filter(r => r.risk === "high" && r.state === "open").map((r, i) => (
                  <p key={i} className="text-[11px] text-muted-foreground mb-1">
                    • المنفذ {r.port} ({r.service}): خدمة مكشوفة — يُنصح بتقييد الوصول أو استخدام جدار ناري
                  </p>
                ))}
              </div>
            )}
          </>
        )}

        {results === null && !scanning && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <Play className="w-7 h-7 text-blue-400/50" />
            </div>
            <p className="text-sm text-muted-foreground">اختر هدفاً واضغط "ابدأ المسح" لمحاكاة مسح المنافذ</p>
            <p className="text-[11px] text-muted-foreground/50">يحاكي أداة Nmap لمسح الشبكات</p>
          </div>
        )}
      </div>
    </div>
  );
}
