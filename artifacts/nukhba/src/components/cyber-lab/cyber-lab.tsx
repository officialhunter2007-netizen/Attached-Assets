import { useState, useEffect, lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import type { CyberEnvironment } from "./env/cyber-env-types";

const CyberLabWizard = lazy(() => import("./env/cyber-lab-wizard"));
const CyberLabEnvironment = lazy(() => import("./env/cyber-lab-environment"));

function TabLoader() {
  return (
    <div className="flex-1 flex items-center justify-center" style={{ background: "#080a11" }}>
      <Loader2 className="w-6 h-6 animate-spin text-red-400" />
    </div>
  );
}

type ViewMode = "wizard" | "env-active";

interface CyberLabProps {
  onShare?: (content: string) => void;
  onAskHelp?: (context: string) => void;
  pendingAIEnv?: CyberEnvironment | null;
  onClearPendingEnv?: () => void;
}

export default function CyberLab({ onShare, onAskHelp, pendingAIEnv, onClearPendingEnv }: CyberLabProps) {
  const [view, setView] = useState<ViewMode>("wizard");
  const [activeEnv, setActiveEnv] = useState<CyberEnvironment | null>(null);
  const [wizardKey, setWizardKey] = useState(0);

  useEffect(() => {
    if (pendingAIEnv && view === "wizard") {
      setWizardKey(k => k + 1);
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

  if (view === "env-active" && activeEnv) {
    return (
      <div className="flex flex-col h-full w-full overflow-hidden" style={{ background: "#0d1117" }}>
        <Suspense fallback={<TabLoader />}>
          <CyberLabEnvironment
            env={activeEnv}
            onBack={() => { setActiveEnv(null); setView("wizard"); }}
            onShare={onShare ? handleShare : undefined}
            onAskHelp={onAskHelp}
          />
        </Suspense>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full overflow-hidden" style={{ background: "#080a11" }}>
      <Suspense fallback={<TabLoader />}>
        <CyberLabWizard
          key={wizardKey}
          onEnvReady={handleEnvReady}
          onBack={() => {}}
          pendingAIEnv={pendingAIEnv}
        />
      </Suspense>
    </div>
  );
}
