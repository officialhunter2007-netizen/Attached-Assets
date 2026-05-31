import { useEffect, useState } from "react";

const STORAGE_KEY = "nukhba:mobile-desktop-hint:dismissed:v1";

function isLikelyMobileViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 767px)").matches;
}

interface Props {
  show: boolean;
}

export function MobileDesktopHint({ show }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!show) { setVisible(false); return; }
    if (typeof window === "undefined") return;
    const dismissed = window.localStorage.getItem(STORAGE_KEY) === "1";
    if (dismissed) return;
    setVisible(isLikelyMobileViewport());
  }, [show]);

  if (!visible) return null;

  const dismiss = () => {
    try { window.localStorage.setItem(STORAGE_KEY, "1"); } catch { /* ignore */ }
    setVisible(false);
  };

  return (
    <div
      role="status"
      className="md:hidden mx-3 mt-3 rounded-2xl border border-amber-400/30 bg-gradient-to-l from-amber-500/15 via-amber-500/10 to-amber-500/5 backdrop-blur-sm shadow-lg"
      style={{ direction: "rtl" }}
    >
      <div className="flex items-start gap-3 p-3">
        <div className="shrink-0 w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-lg">💻</div>
        <div className="flex-1 min-w-0">
          <p className="text-amber-100 text-sm font-bold leading-snug">
            للحصول على تجربة أفضل
          </p>
          <p className="text-amber-100/80 text-[12px] leading-relaxed mt-0.5">
            هذه البيئة تطبيقية متقدّمة، تعمل بأفضل صورة على شاشة الكمبيوتر. إن أمكن، افتح نُخبة من الحاسوب لرؤية الأدوات بشكل أوسع.
          </p>
        </div>
        <button
          onClick={dismiss}
          className="shrink-0 text-amber-200/70 hover:text-amber-100 text-xl leading-none px-1"
          aria-label="إخفاء التنبيه"
        >
          ×
        </button>
      </div>
    </div>
  );
}
