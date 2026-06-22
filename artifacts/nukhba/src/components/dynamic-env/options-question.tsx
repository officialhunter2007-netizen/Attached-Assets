import { useState } from "react";

// Arabic ordinal letters used as option badges (أ، ب، ج، د …).
const OPTION_LETTERS = ["أ", "ب", "ج", "د", "هـ", "و", "ز", "ح"];

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
          <span className="opt-question-text">{question}</span>
        </div>
      )}
      {!tooFewOptions && (
        <div className="opt-list">
          {options.map((opt, i) => {
            const isSelected = opt === picked;
            const dimmed = locked && !isSelected;
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
                  isSelected ? "opt-btn-selected" : "",
                  dimmed ? "opt-btn-dimmed" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                style={{ animationDelay: `${i * 55}ms` }}
              >
                <span className="opt-badge">{OPTION_LETTERS[i] ?? String(i + 1)}</span>
                <span className="opt-text">{opt}</span>
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
