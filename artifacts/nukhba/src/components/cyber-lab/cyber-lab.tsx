import { useState, lazy, Suspense, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Terminal, Network, Lock, Bug, Shield, Database,
  FileSearch, Loader2
} from "lucide-react";

const TerminalSim = lazy(() => import("./tabs/terminal-sim"));
const PortScanner = lazy(() => import("./tabs/port-scanner"));
const CryptoLab = lazy(() => import("./tabs/crypto-lab"));
const SqliLab = lazy(() => import("./tabs/sqli-lab"));
const XssLab = lazy(() => import("./tabs/xss-lab"));
const PacketLab = lazy(() => import("./tabs/packet-lab"));
const HashCracker = lazy(() => import("./tabs/hash-cracker"));

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

export default function CyberLab({ onShare }: { onShare?: (content: string) => void }) {
  const [activeTab, setActiveTab] = useState<CyberTabId>("terminal");

  const handleShare = (content: string) => {
    onShare?.(`🔐 نتائج من مختبر الأمن السيبراني:\n${content}`);
  };

  return (
    <div className="flex flex-col h-full w-full overflow-hidden" style={{ background: "#0a0e18", direction: "rtl" }}>
      <div className="shrink-0 border-b border-white/5 bg-[#0d1119]">
        <div className="flex items-center gap-2 px-3 py-2 overflow-x-auto scrollbar-hide">
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
