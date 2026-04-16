import { useState, useEffect, lazy, Suspense, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Terminal, Network, Lock, Bug, Shield, Database,
  FileSearch, Loader2, Wrench, FlaskConical
} from "lucide-react";
import type { CyberEnvironment } from "./env/cyber-env-types";

const TerminalSim = lazy(() => import("./tabs/terminal-sim"));
const PortScanner = lazy(() => import("./tabs/port-scanner"));
const CryptoLab = lazy(() => import("./tabs/crypto-lab"));
const SqliLab = lazy(() => import("./tabs/sqli-lab"));
const XssLab = lazy(() => import("./tabs/xss-lab"));
const PacketLab = lazy(() => import("./tabs/packet-lab"));
const HashCracker = lazy(() => import("./tabs/hash-cracker"));
const CyberLabSetup = lazy(() => import("./env/cyber-lab-setup"));
const CyberLabEnvironment = lazy(() => import("./env/cyber-lab-environment"));

export type CyberTabId = "terminal" | "portscan" | "crypto" | "sqli" | "xss" | "packets" | "hashcrack";

interface TabDef {
  id: CyberTabId;
  label: string;
  icon: ReactNode;
  color: string;
}

const TABS: TabDef[] = [
  { id: "terminal", label: "طرفية Linux", icon: <Terminal className="w-4 h-4" />, color: "text-emerald-400" },
  { id: "portscan", label: "ماسح المنافذ", icon: <Network className="w-4 h-4" />, color: "text-blue-400" },
  { id: "crypto", label: "التشفير", icon: <Lock className="w-4 h-4" />, color: "text-purple-400" },
  { id: "hashcrack", label: "كسر الهاش", icon: <FileSearch className="w-4 h-4" />, color: "text-orange-400" },
  { id: "sqli", label: "حقن SQL", icon: <Database className="w-4 h-4" />, color: "text-red-400" },
  { id: "xss", label: "هجوم XSS", icon: <Bug className="w-4 h-4" />, color: "text-amber-400" },
  { id: "packets", label: "تحليل الحزم", icon: <Shield className="w-4 h-4" />, color: "text-cyan-400" },
];

function TabLoader() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-red-400" />
    </div>
  );
}

type ViewMode = "menu" | "tools" | "env-setup" | "env-active";

interface CyberLabProps {
  onShare?: (content: string) => void;
  onAskHelp?: (context: string) => void;
  pendingAIEnv?: CyberEnvironment | null;
  onClearPendingEnv?: () => void;
}

export default function CyberLab({ onShare, onAskHelp, pendingAIEnv, onClearPendingEnv }: CyberLabProps) {
  const [view, setView] = useState<ViewMode>(pendingAIEnv ? "env-setup" : "menu");
  const [activeTab, setActiveTab] = useState<CyberTabId>("terminal");
  const [activeEnv, setActiveEnv] = useState<CyberEnvironment | null>(null);

  useEffect(() => {
    if (pendingAIEnv && view === "menu") {
      setView("env-setup");
    }
  }, [pendingAIEnv]);

  const handleShare = (content: string) => {
    onShare?.(`🔐 نتائج من مختبر الأمن السيبراني:\n${content}`);
  };

  const handleEnvReady = (env: CyberEnvironment) => {
    setActiveEnv(env);
    setView("env-active");
    onClearPendingEnv?.();
  };

  if (view === "env-setup") {
    return (
      <div className="flex flex-col h-full w-full overflow-hidden" style={{ background: "#080a11" }}>
        <Suspense fallback={<TabLoader />}>
          <CyberLabSetup
            onEnvReady={handleEnvReady}
            onBack={() => setView("menu")}
            pendingAIEnv={pendingAIEnv}
          />
        </Suspense>
      </div>
    );
  }

  if (view === "env-active" && activeEnv) {
    return (
      <div className="flex flex-col h-full w-full overflow-hidden" style={{ background: "#0d1117" }}>
        <Suspense fallback={<TabLoader />}>
          <CyberLabEnvironment
            env={activeEnv}
            onBack={() => { setActiveEnv(null); setView("menu"); }}
            onShare={onShare ? handleShare : undefined}
            onAskHelp={onAskHelp}
          />
        </Suspense>
      </div>
    );
  }

  if (view === "tools") {
    return (
      <div className="flex flex-col h-full w-full overflow-hidden" style={{ background: "#0a0e18", direction: "rtl" }}>
        <div className="shrink-0 border-b border-white/5 bg-[#0d1119]">
          <div className="flex items-center gap-2 px-3 py-2 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setView("menu")}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-muted-foreground/60 hover:text-muted-foreground hover:bg-white/5 border border-transparent shrink-0"
            >
              ← رجوع
            </button>
            {TABS.map(tab => {
              const active = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                    active
                      ? `bg-white/10 border border-white/15 ${tab.color}`
                      : "text-muted-foreground/60 hover:text-muted-foreground hover:bg-white/5 border border-transparent"
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="h-full"
            >
              <Suspense fallback={<TabLoader />}>
                {activeTab === "terminal" && <TerminalSim onShare={handleShare} />}
                {activeTab === "portscan" && <PortScanner onShare={handleShare} />}
                {activeTab === "crypto" && <CryptoLab onShare={handleShare} />}
                {activeTab === "hashcrack" && <HashCracker onShare={handleShare} />}
                {activeTab === "sqli" && <SqliLab onShare={handleShare} />}
                {activeTab === "xss" && <XssLab onShare={handleShare} />}
                {activeTab === "packets" && <PacketLab onShare={handleShare} />}
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full overflow-hidden items-center justify-center p-6" style={{ background: "#080a11", direction: "rtl" }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-4"
      >
        <div className="text-center mb-6">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/15 border border-red-500/25">
            <span className="text-3xl">🔬</span>
          </div>
          <h2 className="text-xl font-black text-white mb-1">مختبر الأمن السيبراني</h2>
          <p className="text-xs text-muted-foreground">اختر نوع التجربة التي تريدها</p>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setView("env-setup")}
          className="w-full p-5 rounded-2xl border border-red-500/20 bg-gradient-to-l from-red-500/10 to-transparent hover:border-red-500/40 transition-all text-right group"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/15 border border-red-500/25 shrink-0 group-hover:scale-110 transition-transform">
              <FlaskConical className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white mb-0.5">🚀 بيئة تطبيقية تفاعلية</h3>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                بيئة محاكاة واقعية كاملة — أجهزة بأنظمة مختلفة، أدوات اختراق حقيقية، شبكة كاملة. اختر السيناريو وابدأ التجربة!
              </p>
            </div>
          </div>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setView("tools")}
          className="w-full p-5 rounded-2xl border border-white/10 bg-white/[0.02] hover:border-white/20 transition-all text-right group"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 border border-white/10 shrink-0 group-hover:scale-110 transition-transform">
              <Wrench className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white mb-0.5">🛠️ أدوات سريعة</h3>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                7 أدوات تفاعلية مستقلة — طرفية Linux، ماسح منافذ، تشفير، كسر هاش، حقن SQL، هجوم XSS، تحليل حزم
              </p>
            </div>
          </div>
        </motion.button>
      </motion.div>
    </div>
  );
}
