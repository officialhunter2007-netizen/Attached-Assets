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
  const [showOther, setShowOther] = useState(false);
  const [otherText, setOtherText] = useState("");
  const [picked, setPicked] = useState<string | null>(null);

  if (picked) {
    return (
      <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-3 text-sm text-cyan-100">
        <div className="text-xs text-white/60 mb-1">اخترت:</div>
        <div>{picked}</div>
      </div>
    );
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-3 my-2">
      <div className="text-sm text-white/90 mb-3 font-medium">{question}</div>
      <div className="space-y-2">
        {options.map((opt, i) => (
          <button
            key={i}
            onClick={() => { setPicked(opt); onAnswer(opt); }}
            className="block w-full text-right text-sm bg-white/5 hover:bg-cyan-500/20 hover:border-cyan-500/40 border border-white/10 text-white/90 rounded-lg p-2 transition-colors"
          >
            {opt}
          </button>
        ))}
        {allowOther && !showOther && (
          <button
            onClick={() => setShowOther(true)}
            className="block w-full text-right text-sm bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-200 rounded-lg p-2"
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
            className="space-y-2 pt-2"
          >
            <textarea
              value={otherText}
              onChange={(e) => setOtherText(e.target.value)}
              placeholder="اكتب تفاصيل ما تريد تعلّمه أو تجربته بالضبط..."
              rows={3}
              className="w-full bg-black/30 border border-white/15 rounded-lg p-2 text-sm text-white"
              autoFocus
            />
            <button
              type="submit"
              disabled={!otherText.trim()}
              className="bg-purple-500 hover:bg-purple-400 disabled:bg-white/10 text-white text-sm font-bold rounded-lg px-4 py-2"
            >
              إرسال
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
