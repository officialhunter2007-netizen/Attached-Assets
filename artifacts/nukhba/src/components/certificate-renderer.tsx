// ─────────────────────────────────────────────────────────────────────────────
// CertificateRenderer — fixed 900×638px (A4 landscape) certificate visual.
// Uses ALL inline styles so html2canvas captures it faithfully.
// ─────────────────────────────────────────────────────────────────────────────
export interface CertData {
  type: string;
  specialty_name: string;
  scope_label: string;
  score_pct: number;
  issued_at: string;
  verification_code: string;
  key_topics?: string[];
  scope_goal?: string;
}

interface Props {
  cert: CertData;
  studentName: string;
}

export default function CertificateRenderer({ cert, studentName }: Props) {
  const { type, specialty_name, scope_label, score_pct, issued_at, verification_code, key_topics = [], scope_goal = "" } = cert;

  const date = new Date(issued_at).toLocaleDateString("ar", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const certTitle =
    type === "specialty_complete" ? "شهادة إتمام التخصص" :
    type === "level_exam"         ? "شهادة اجتياز المستوى" :
    type === "stage_exam"         ? "شهادة اجتياز المرحلة" :
                                    "شهادة اجتياز وحدة";

  // ── Color tokens ─────────────────────────────────────────────────────────
  const G   = "#D4AF37";                      // primary gold
  const GL  = "#EFC84A";                      // light gold
  const GB  = "rgba(212,175,55,0.65)";       // gold border
  const GF  = "rgba(212,175,55,0.22)";       // faint gold
  const GS  = "rgba(212,175,55,0.07)";       // subtle gold fill

  return (
    <div
      style={{
        width: 900,
        height: 638,
        position: "relative",
        background: "#070B18",
        fontFamily: '"Cairo", "Segoe UI", Tahoma, Arial, sans-serif',
        direction: "rtl",
        overflow: "hidden",
        userSelect: "none",
      }}
    >
      {/* ── Background diamond grid ─────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `
            repeating-linear-gradient(45deg, ${GS} 0px, ${GS} 1px, transparent 1px, transparent 26px),
            repeating-linear-gradient(-45deg, ${GS} 0px, ${GS} 1px, transparent 1px, transparent 26px)
          `,
        }}
      />

      {/* ── Radial glow (top center) ────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          top: -100,
          left: "50%",
          marginLeft: -300,
          width: 600,
          height: 300,
          background: "radial-gradient(ellipse, rgba(212,175,55,0.13) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* ── Double border frame ─────────────────────────────────────── */}
      <div style={{ position: "absolute", inset: 10, border: `2px solid ${GB}`, pointerEvents: "none" }} />
      <div style={{ position: "absolute", inset: 17, border: `1px solid ${GF}`, pointerEvents: "none" }} />

      {/* ── Corner ornaments ─────────────────────────────────────────── */}
      {/* top-right */}
      <div style={{ position: "absolute", top: 6, right: 6, width: 34, height: 34, borderTop: `3px solid ${G}`, borderRight: `3px solid ${G}` }} />
      {/* top-left */}
      <div style={{ position: "absolute", top: 6, left: 6, width: 34, height: 34, borderTop: `3px solid ${G}`, borderLeft: `3px solid ${G}` }} />
      {/* bottom-right */}
      <div style={{ position: "absolute", bottom: 6, right: 6, width: 34, height: 34, borderBottom: `3px solid ${G}`, borderRight: `3px solid ${G}` }} />
      {/* bottom-left */}
      <div style={{ position: "absolute", bottom: 6, left: 6, width: 34, height: 34, borderBottom: `3px solid ${G}`, borderLeft: `3px solid ${G}` }} />

      {/* ── Main content ─────────────────────────────────────────────── */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "28px 64px 24px",
        }}
      >
        {/* Platform header */}
        <div style={{ textAlign: "center", marginBottom: 10 }}>
          {/* Stars row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, marginBottom: 4 }}>
            <div style={{ width: 72, height: 1, background: `linear-gradient(90deg, transparent, ${GB})` }} />
            <span style={{ color: G, fontSize: 10, letterSpacing: 4 }}>✦ ✦ ✦</span>
            <div style={{ width: 72, height: 1, background: `linear-gradient(90deg, ${GB}, transparent)` }} />
          </div>
          <div style={{ fontSize: 24, fontWeight: 900, color: G, letterSpacing: 4, lineHeight: 1 }}>
            نُـخـبـة
          </div>
          <div style={{ fontSize: 10, color: "rgba(212,175,55,0.5)", letterSpacing: 1.5, marginTop: 3 }}>
            المنصة التعليمية التقنية
          </div>
        </div>

        {/* Cert title divider */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, width: "85%", margin: "10px 0 14px" }}>
          <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, transparent, ${GB})` }} />
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: G, fontSize: 12 }}>✦</span>
            <span style={{ fontSize: 18, fontWeight: 900, color: G, letterSpacing: 2 }}>{certTitle}</span>
            <span style={{ color: G, fontSize: 12 }}>✦</span>
          </div>
          <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${GB}, transparent)` }} />
        </div>

        {/* "Presented to" label */}
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", letterSpacing: 1, marginBottom: 8 }}>
          تُقدَّم هذه الشهادة إلى
        </div>

        {/* Student name */}
        <div
          style={{
            fontSize: 40,
            fontWeight: 900,
            color: "#FFFFFF",
            textAlign: "center",
            lineHeight: 1.15,
            letterSpacing: 1,
            textShadow: "0 0 40px rgba(212,175,55,0.22), 0 2px 6px rgba(0,0,0,0.6)",
            maxWidth: 680,
            marginBottom: 6,
          }}
        >
          {studentName}
        </div>

        {/* Underline accent */}
        <div
          style={{
            width: 210,
            height: 2,
            background: `linear-gradient(90deg, transparent, ${G}, transparent)`,
            marginBottom: 12,
          }}
        />

        {/* "Successfully completed" */}
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.42)", letterSpacing: 0.5, marginBottom: 6 }}>
          لإتمامه / ها بنجاح متميز
        </div>

        {/* Specialty name */}
        <div
          style={{
            fontSize: 20,
            fontWeight: 900,
            color: GL,
            textAlign: "center",
            marginBottom: 4,
            letterSpacing: 0.5,
          }}
        >
          {specialty_name}
        </div>

        {/* Scope label */}
        {scope_label && type !== "specialty_complete" && (
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", textAlign: "center" }}>
            {scope_label}
          </div>
        )}
        {type === "specialty_complete" && (
          <div style={{ fontSize: 11, color: G, textAlign: "center", letterSpacing: 1.5 }}>
            ✦ إتمام التخصص كاملاً ✦
          </div>
        )}

        {/* ── What was learned ─────────────────────────────────────── */}
        <div
          style={{
            marginTop: 10,
            maxWidth: 660,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 7,
          }}
        >
          {/* Arabic goal sentence */}
          {scope_goal && (
            <div
              style={{
                fontSize: 11,
                color: "rgba(255,255,255,0.58)",
                textAlign: "center",
                lineHeight: 1.7,
                padding: "5px 16px",
                borderRight: `2px solid ${G}`,
                background: "rgba(212,175,55,0.04)",
              }}
            >
              <span style={{ color: G, fontWeight: 700, marginLeft: 4 }}>أتقن خلالها:</span>
              {scope_goal}
            </div>
          )}

          {/* Key concept tags — secondary row */}
          {key_topics.length > 0 && (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 4,
                justifyContent: "center",
              }}
            >
              {key_topics.slice(0, 6).map((topic, i) => (
                <div
                  key={i}
                  style={{
                    fontSize: 8.5,
                    color: "rgba(212,175,55,0.6)",
                    padding: "1px 7px",
                    borderRadius: 100,
                    border: `1px solid rgba(212,175,55,0.15)`,
                    fontFamily: "monospace",
                    letterSpacing: 0.5,
                    direction: "ltr",
                  }}
                >
                  {topic}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* ── Bottom row ────────────────────────────────────────────── */}
        <div
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: 14,
            borderTop: `1px solid ${GF}`,
          }}
        >
          {/* Score badge */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, minWidth: 86 }}>
            <div
              style={{
                width: 74,
                height: 74,
                borderRadius: "50%",
                border: `2px solid ${G}`,
                boxShadow: `0 0 16px rgba(212,175,55,0.22)`,
                background: `radial-gradient(circle, rgba(212,175,55,0.18) 0%, rgba(212,175,55,0.04) 100%)`,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div style={{ fontSize: 23, fontWeight: 900, color: G, lineHeight: 1 }}>
                {score_pct}%
              </div>
              <div style={{ fontSize: 8, color: "rgba(212,175,55,0.55)", marginTop: 2 }}>الدرجة</div>
            </div>
            <div style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", textAlign: "center" }}>
              {type === "specialty_complete" ? "متوسط المستويات" : "اختبار المستوى"}
            </div>
          </div>

          {/* Center seal */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
            <div style={{ position: "relative", width: 78, height: 78 }}>
              {/* Outer ring */}
              <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `2px solid ${G}`, background: GS }} />
              {/* Middle ring */}
              <div style={{ position: "absolute", inset: 8, borderRadius: "50%", border: `1px solid ${GF}` }} />
              {/* Text */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div style={{ fontSize: 18, fontWeight: 900, color: G, lineHeight: 1 }}>نُخبة</div>
                <div style={{ fontSize: 7, color: "rgba(212,175,55,0.45)", letterSpacing: 0.5, marginTop: 2 }}>
                  معتمد رقمياً
                </div>
              </div>
            </div>
            <div style={{ fontSize: 9, color: "rgba(212,175,55,0.35)", letterSpacing: 0.5, textAlign: "center" }}>
              منصة نُخبة التعليمية
            </div>
          </div>

          {/* Date + verification code */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, minWidth: 150 }}>
            <div>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.28)", marginBottom: 1 }}>تاريخ الإصدار</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.72)", fontWeight: 600 }}>{date}</div>
            </div>
            <div>
              <div style={{ fontSize: 9, color: "rgba(212,175,55,0.45)", marginBottom: 1 }}>رمز التحقق</div>
              <div
                style={{
                  fontSize: 11,
                  color: G,
                  fontFamily: "monospace",
                  letterSpacing: 2,
                  background: "rgba(212,175,55,0.06)",
                  border: `1px solid ${GF}`,
                  padding: "3px 8px",
                  borderRadius: 4,
                  direction: "ltr",
                  display: "inline-block",
                }}
              >
                {verification_code}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
