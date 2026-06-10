import { useState } from "react";

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
  const [picked, setPicked] = useState<string | null>(null);
  const [showOther, setShowOther] = useState(false);
  const [otherText, setOtherText] = useState("");

  // ── After selection: show options with the chosen one highlighted ───────
  if (picked) {
    return (
      <div className="my-3">
        <div className="text-sm text-white/90 mb-3 font-medium leading-relaxed">
          {question}
        </div>
        <div className="space-y-2">
          {options.map((opt) => {
            const isSelected = opt === picked;
            return (
              <button
                key={opt}
                disabled
                className={`block w-full text-right text-sm rounded-xl p-4 border transition-colors flex items-center justify-between ${
                  isSelected
                    ? "bg-[#4c1d95] border-purple-400/50 text-white"
                    : "bg-[#1f2937] border-gray-700/30 text-white/50 opacity-50"
                }`}
              >
                <span>{opt}</span>
                {isSelected && (
                  <span className="text-purple-200 shrink-0 mr-3 text-lg">
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {allowOther && (
          <button
            type="button"
            onClick={() => {
              setPicked(null);
              setShowOther(true);
            }}
            className="mt-2 block w-full text-right text-sm border border-dashed border-gray-500 text-gray-400 hover:text-white hover:border-gray-400 rounded-xl p-3 transition-colors"
          >
            ✏️ غير ذلك (اكتب بنفسك)
          </button>
        )}
      </div>
    );
  }

  // ── Not yet selected — clickable options ─────────────────────────────────
  return (
    <div className="my-3">
      <div className="text-sm text-white/90 mb-3 font-medium leading-relaxed">
        {question}
      </div>
      <div className="space-y-2">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => {
              setPicked(opt);
              onAnswer(opt);
            }}
            className="block w-full text-right text-sm bg-[#1f2937] hover:bg-gray-700 hover:border-gray-500 border border-gray-600 text-white/90 rounded-xl p-4 transition-colors"
          >
            {opt}
          </button>
        ))}
      </div>
      {allowOther && !showOther && (
        <button
          type="button"
          onClick={() => setShowOther(true)}
          className="mt-2 block w-full text-right text-sm border border-dashed border-gray-500 text-gray-400 hover:text-white hover:border-gray-400 rounded-xl p-3 transition-colors"
        >
          ✏️ غير ذلك (اكتب بنفسك)
        </button>
      )}
      {showOther && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const v = otherText.trim();
            if (!v) return;
            setPicked(v);
            onAnswer(v);
          }}
          className="mt-3 space-y-2"
        >
          <textarea
            value={otherText}
            onChange={(e) => setOtherText(e.target.value)}
            placeholder="اكتب تفاصيل ما تريد تعلّمه أو تجربته بالضبط..."
            rows={3}
            className="w-full bg-black/30 border border-white/15 rounded-xl p-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-purple-400/50 resize-none"
            autoFocus
          />
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={!otherText.trim()}
              className="bg-purple-500 hover:bg-purple-400 disabled:bg-white/10 text-white text-sm font-bold rounded-xl px-5 py-2.5 transition-colors disabled:cursor-not-allowed"
            >
              إرسال
            </button>
            <button
              type="button"
              onClick={() => setShowOther(false)}
              className="text-white/50 hover:text-white text-sm px-3 py-2.5 transition-colors"
            >
              إلغاء
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
