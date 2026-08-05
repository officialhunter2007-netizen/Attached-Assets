import { useState } from "react";

// Arabic ordinal letters used as option badges (أ، ب، ج، د …).
const OPTION_LETTERS = ["أ", "ب", "ج", "د", "هـ", "و", "ز", "ح"];

/**
 * Expand common single-line code constructs (Python/JS) into proper
 * multi-line form.  Applied only to full-block code options so the
 * model's one-liner habit becomes readable without a prompt change alone.
 *
 * Examples:
 *   "if x > 0: print(x) else: print(-x)"
 *   → "if x > 0:\n    print(x)\nelse:\n    print(-x)"
 */
function expandCodeOneLiner(raw: string): string {
  // Normalise literal \n escape sequences the model occasionally emits
  let code = raw.replace(/\\n/g, "\n").replace(/\\t/g, "    ");

  // Already multi-line — nothing to do
  if (code.includes("\n")) return code;

  // ── Python if / elif … else ─────────────────────────────────────────
  // Pattern: "if COND: BODY else: BODY2"  (else is optional)
  // We match the FIRST colon-space that ends the condition header,
  // not a colon buried inside a string literal.
  const ifElse = code.match(
    /^((?:if|elif)\s+.+?):\s+([\s\S]+?)\s+else:\s+([\s\S]+)$/
  );
  if (ifElse) {
    return `${ifElse[1]}:\n    ${ifElse[2]}\nelse:\n    ${ifElse[3]}`;
  }

  // Pattern: "if COND: BODY"  (no else)
  const ifOnly = code.match(/^((?:if|elif)\s+.+?):\s+([\s\S]+)$/);
  if (ifOnly) return `${ifOnly[1]}:\n    ${ifOnly[2]}`;

  // Pattern: "for VAR in ITER: BODY"
  const forLoop = code.match(/^(for\s+.+?):\s+([\s\S]+)$/);
  if (forLoop) return `${forLoop[1]}:\n    ${forLoop[2]}`;

  // Pattern: "while COND: BODY"
  const whileLoop = code.match(/^(while\s+.+?):\s+([\s\S]+)$/);
  if (whileLoop) return `${whileLoop[1]}:\n    ${whileLoop[2]}`;

  // Pattern: "def NAME(ARGS): BODY"  or  "function NAME(ARGS) { BODY }"
  const defFn = code.match(/^(def\s+\w+\([^)]*\)):\s+([\s\S]+)$/);
  if (defFn) return `${defFn[1]}:\n    ${defFn[2]}`;

  // Pattern: JS arrow "const f = (x) => { BODY }" or "{ BODY }"  — leave as-is,
  // too varied to expand safely.

  return code;
}

/**
 * Render option text with inline/block code formatting.
 *
 * - Entire text wrapped in backticks → opt-code-block (full-width monospace block, LTR)
 * - Mixed text with `inline code` segments → opt-code-inline spans
 * - No backticks → plain string (current behaviour, unchanged)
 */
function renderOptionContent(text: string) {
  const trimmed = text.trim();

  // Full option is a code block: `...`
  const fullMatch = trimmed.match(/^`([\s\S]+)`$/);
  if (fullMatch) {
    const formatted = expandCodeOneLiner(fullMatch[1]);
    return <code className="opt-code-block">{formatted}</code>;
  }

  // Mixed: some inline `code` segments inside Arabic text
  const segments = trimmed.split(/(`[^`\n]+`)/);
  if (segments.length === 1) return text; // no backticks — plain text

  return (
    <>
      {segments.map((seg, i) => {
        const inline = seg.match(/^`([^`\n]+)`$/);
        if (inline) return <code key={i} className="opt-code-inline">{inline[1]}</code>;
        return seg || null;
      })}
    </>
  );
}

export function OptionsQuestion({
  question,
  options,
  allowOther,
  onAnswer,
}: {
  question: string;
  options: string[];
  allowOther: boolean;
  onAnswer: (answer: string) => void;
}) {
  // When the model returns fewer than two real options (e.g. only "لا أعرف"
  // or none at all), a lonely button looks broken and discourages thinking.
  // In that case skip the buttons entirely and invite a free-text answer.
  const tooFewOptions = options.length < 2;

  const [picked, setPicked] = useState<string | null>(null);
  const [showOther, setShowOther] = useState(tooFewOptions);
  const [otherText, setOtherText] = useState("");

  // Nothing meaningful to render — no question and no usable options.
  if (!question && options.length === 0) return null;

  const locked = picked !== null;
  // A custom ("other") answer is one the student typed that isn't in options.
  const pickedIsCustom = locked && picked !== null && !options.includes(picked);

  return (
    <div className="opt-block">
      {question && (
        <div className="opt-question">
          <span className="opt-question-icon">؟</span>
          <span className="opt-question-text">{renderOptionContent(question)}</span>
        </div>
      )}
      {!tooFewOptions && (
        <div className="opt-list">
          {options.map((opt, i) => {
            const isSelected = opt === picked;
            const dimmed = locked && !isSelected;
            const hasBlockCode = /^`[\s\S]+`$/.test(opt.trim());
            return (
              <button
                key={opt}
                type="button"
                disabled={locked}
                onClick={() => {
                  if (locked) return;
                  setPicked(opt);
                  onAnswer(opt);
                }}
                className={[
                  "opt-btn",
                  hasBlockCode ? "opt-btn-has-code" : "",
                  isSelected ? "opt-btn-selected" : "",
                  dimmed ? "opt-btn-dimmed" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                style={{ animationDelay: `${i * 55}ms` }}
              >
                <span className="opt-badge">{OPTION_LETTERS[i] ?? String(i + 1)}</span>
                <span className="opt-text">{renderOptionContent(opt)}</span>
                {isSelected && <span className="opt-check">✓</span>}
              </button>
            );
          })}
        </div>
      )}
      {/* Show the typed custom answer as a selected pill once submitted. */}
      {pickedIsCustom && (
        <div className="opt-btn opt-btn-selected opt-btn-custom">
          <span className="opt-badge">✎</span>
          <span className="opt-text">{picked}</span>
          <span className="opt-check">✓</span>
        </div>
      )}
      {allowOther && !showOther && !locked && !tooFewOptions && (
        <button
          type="button"
          onClick={() => setShowOther(true)}
          className="opt-other-trigger"
        >
          <span className="opt-other-pencil">✏️</span>
          <span>هل لديك سؤال عالق في ذهنك؟</span>
        </button>
      )}
      {showOther && !locked && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const v = otherText.trim();
            if (!v) return;
            setPicked(v);
            onAnswer(v);
          }}
          className="opt-other-form"
        >
          <textarea
            value={otherText}
            onChange={(e) => setOtherText(e.target.value)}
            placeholder={
              tooFewOptions
                ? "اكتب إجابتك هنا..."
                : "اكتب تفاصيل ما تريد تعلّمه أو تجربته بالضبط..."
            }
            rows={3}
            className="opt-other-input"
            autoFocus
          />
          <div className="opt-other-actions">
            <button
              type="submit"
              disabled={!otherText.trim()}
              className="opt-other-submit"
            >
              إرسال
            </button>
            <button
              type="button"
              onClick={() => {
                setShowOther(false);
                setOtherText("");
              }}
              className="opt-other-cancel"
            >
              إلغاء
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
