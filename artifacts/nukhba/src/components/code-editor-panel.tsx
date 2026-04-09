import { useState, useRef } from "react";
import Editor from "@monaco-editor/react";
import { Play, RotateCcw, Terminal, Circle, X, Minus, Square, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

const LANGUAGES = [
  { id: "python", label: "Python", ext: "main.py", icon: "🐍" },
  { id: "javascript", label: "JavaScript", ext: "main.js", icon: "⚡" },
];

function extractStarterCode(html: string): string {
  const match = html.match(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/i);
  if (!match) return "";
  return match[1]
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function detectLanguage(html: string, subjectId?: string): string {
  const lower = (html + (subjectId || "")).toLowerCase();
  if (lower.includes("python") || lower.includes("بايثون")) return "python";
  if (lower.includes("javascript") || lower.includes("js") || lower.includes("جافا سكريبت")) return "javascript";
  return "python";
}

interface Props {
  sectionContent: string;
  subjectId?: string;
}

export function CodeEditorPanel({ sectionContent, subjectId }: Props) {
  const starter = extractStarterCode(sectionContent);
  const detectedLang = detectLanguage(sectionContent, subjectId);
  const [language, setLanguage] = useState(detectedLang);
  const [code, setCode] = useState(starter || getDefaultCode(language));
  const [output, setOutput] = useState<string | null>(null);
  const [outputType, setOutputType] = useState<"success" | "error">("success");
  const [running, setRunning] = useState(false);
  const [showOutput, setShowOutput] = useState(false);
  const editorRef = useRef<any>(null);

  const langInfo = LANGUAGES.find(l => l.id === language)!;

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
    if (!starter) setCode(getDefaultCode(lang));
    setOutput(null);
  };

  const handleRun = async () => {
    if (running) return;
    setRunning(true);
    setShowOutput(true);
    setOutput(null);
    try {
      const res = await fetch("/api/ai/run-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code, language }),
      });
      const data = await res.json();
      const hasError = data.exitCode !== 0 || (data.error && !data.output);
      setOutputType(hasError ? "error" : "success");
      setOutput(
        data.output
          ? data.output + (data.error ? `\n${data.error}` : "")
          : data.error || "لا يوجد إخراج"
      );
    } catch {
      setOutputType("error");
      setOutput("خطأ في الاتصال بالخادم");
    } finally {
      setRunning(false);
    }
  };

  const handleReset = () => {
    setCode(starter || getDefaultCode(language));
    setOutput(null);
    setShowOutput(false);
  };

  return (
    <div className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-black/40 mt-6" style={{ direction: "ltr" }}>
      {/* Window Title Bar */}
      <div className="bg-[#1e1e2e] px-4 py-2.5 flex items-center gap-3 border-b border-white/5">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
          <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
          <div className="w-3 h-3 rounded-full bg-[#28c840]" />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <span className="text-xs text-[#6e6a86] font-mono">Nukhba Code — {langInfo.ext}</span>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="bg-[#181825] flex items-center border-b border-white/5">
        <div className="flex">
          {LANGUAGES.map(lang => (
            <button
              key={lang.id}
              onClick={() => handleLanguageChange(lang.id)}
              className={`px-4 py-2 text-xs font-mono flex items-center gap-1.5 border-b-2 transition-all ${
                language === lang.id
                  ? "border-[#F59E0B] text-white bg-[#1e1e2e]"
                  : "border-transparent text-[#6e6a86] hover:text-white/60"
              }`}
            >
              <span>{lang.icon}</span>
              {lang.ext}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2 px-3">
          <button
            onClick={handleReset}
            title="إعادة تعيين"
            className="text-[#6e6a86] hover:text-white/70 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleRun}
            disabled={running}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-md transition-all ${
              running
                ? "bg-[#F59E0B]/30 text-[#F59E0B]/60 cursor-not-allowed"
                : "bg-[#F59E0B] text-black hover:bg-[#F59E0B]/90 shadow shadow-[#F59E0B]/20"
            }`}
          >
            {running ? (
              <>
                <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                <span>جاري...</span>
              </>
            ) : (
              <>
                <Play className="w-3 h-3 fill-current" />
                <span>تشغيل</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="bg-[#1e1e2e]">
        <Editor
          height="280px"
          language={language}
          value={code}
          onChange={(val) => setCode(val || "")}
          onMount={(editor) => { editorRef.current = editor; }}
          theme="vs-dark"
          options={{
            fontSize: 14,
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
            fontLigatures: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            wordWrap: "on",
            lineNumbers: "on",
            glyphMargin: false,
            folding: true,
            lineDecorationsWidth: 0,
            lineNumbersMinChars: 3,
            renderLineHighlight: "all",
            smoothScrolling: true,
            cursorBlinking: "smooth",
            cursorSmoothCaretAnimation: "on",
            padding: { top: 12, bottom: 12 },
            scrollbar: {
              verticalScrollbarSize: 6,
              horizontalScrollbarSize: 6,
            },
          }}
        />
      </div>

      {/* Output Panel */}
      <AnimatePresence>
        {showOutput && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="bg-[#181825] border-t border-white/5">
              <div className="flex items-center gap-2 px-4 py-2 border-b border-white/5">
                <Terminal className="w-3.5 h-3.5 text-[#6e6a86]" />
                <span className="text-xs text-[#6e6a86] font-mono">OUTPUT</span>
                <div className="flex-1" />
                {output !== null && (
                  <div className={`flex items-center gap-1 text-xs font-mono ${outputType === "success" ? "text-[#28c840]" : "text-[#ff5f57]"}`}>
                    <Circle className="w-2 h-2 fill-current" />
                    {outputType === "success" ? "نجح" : "خطأ"}
                  </div>
                )}
                <button onClick={() => setShowOutput(false)} className="text-[#6e6a86] hover:text-white/60">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="p-4 font-mono text-sm min-h-[80px] max-h-[200px] overflow-y-auto">
                {output === null && running ? (
                  <div className="flex items-center gap-2 text-[#6e6a86]">
                    <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span>جاري تنفيذ الكود...</span>
                  </div>
                ) : output !== null ? (
                  <pre className={`whitespace-pre-wrap text-xs leading-relaxed ${outputType === "success" ? "text-[#a6e3a1]" : "text-[#f38ba8]"}`}>
                    {output}
                  </pre>
                ) : null}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status Bar */}
      <div className="bg-[#181825] px-4 py-1 flex items-center gap-4 border-t border-white/5">
        <span className="text-[10px] text-[#6e6a86] font-mono">{langInfo.icon} {langInfo.label}</span>
        <span className="text-[10px] text-[#6e6a86] font-mono">UTF-8</span>
        <div className="flex-1" />
        <span className="text-[10px] text-[#F59E0B] font-mono">نُخبة IDE</span>
      </div>
    </div>
  );
}

function getDefaultCode(lang: string): string {
  if (lang === "python") {
    return `# اكتب كودك هنا
print("مرحباً من نُخبة! 🎓")
`;
  }
  return `// اكتب كودك هنا
console.log("مرحباً من نُخبة! 🎓");
`;
}
