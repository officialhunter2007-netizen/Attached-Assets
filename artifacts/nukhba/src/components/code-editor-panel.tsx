import { useState, useRef } from "react";
import Editor from "@monaco-editor/react";
import { Play, RotateCcw, Terminal, Circle, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const LANGUAGES = [
  { id: "python",     label: "Python",     ext: "main.py",   icon: "🐍", monacoLang: "python"  },
  { id: "javascript", label: "JavaScript", ext: "main.js",   icon: "⚡", monacoLang: "javascript" },
  { id: "java",       label: "Java",       ext: "Main.java", icon: "☕", monacoLang: "java"    },
  { id: "cpp",        label: "C++",        ext: "main.cpp",  icon: "⚙️", monacoLang: "cpp"     },
  { id: "c",          label: "C",          ext: "main.c",    icon: "🔩", monacoLang: "c"       },
  { id: "go",         label: "Go",         ext: "main.go",   icon: "🐹", monacoLang: "go"      },
  { id: "rust",       label: "Rust",       ext: "main.rs",   icon: "🦀", monacoLang: "rust"    },
  { id: "ruby",       label: "Ruby",       ext: "main.rb",   icon: "💎", monacoLang: "ruby"    },
  { id: "php",        label: "PHP",        ext: "main.php",  icon: "🐘", monacoLang: "php"     },
  { id: "bash",       label: "Bash",       ext: "script.sh", icon: "🐚", monacoLang: "shell"   },
];

const DEFAULT_CODE: Record<string, string> = {
  python:     `# اكتب كودك هنا\nprint("مرحباً من نُخبة! 🎓")\n`,
  javascript: `// اكتب كودك هنا\nconsole.log("مرحباً من نُخبة! 🎓");\n`,
  java: `public class Main {\n    public static void main(String[] args) {\n        System.out.println("مرحباً من نُخبة! 🎓");\n    }\n}\n`,
  cpp: `#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "مرحباً من نُخبة! 🎓" << endl;\n    return 0;\n}\n`,
  c: `#include <stdio.h>\n\nint main() {\n    printf("مرحباً من نُخبة! 🎓\\n");\n    return 0;\n}\n`,
  go: `package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("مرحباً من نُخبة! 🎓")\n}\n`,
  rust: `fn main() {\n    println!("مرحباً من نُخبة! 🎓");\n}\n`,
  ruby: `# اكتب كودك هنا\nputs "مرحباً من نُخبة! 🎓"\n`,
  php: `<?php\necho "مرحباً من نُخبة! 🎓\\n";\n`,
  bash: `#!/bin/bash\n# اكتب كودك هنا\necho "مرحباً من نُخبة! 🎓"\n`,
};

function extractStarterCode(html: string): string {
  const match = html.match(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/i);
  if (!match) return "";
  return match[1]
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
}

function detectLanguage(html: string, subjectId?: string): string {
  const lower = (html + (subjectId || "")).toLowerCase();
  if (lower.includes("java") && !lower.includes("javascript")) return "java";
  if (lower.includes("javascript") || lower.includes("js")) return "javascript";
  if (lower.includes("python") || lower.includes("بايثون")) return "python";
  if (lower.includes("c++") || lower.includes("cpp")) return "cpp";
  if (lower.includes("rust")) return "rust";
  if (lower.includes("golang") || lower.includes(" go ")) return "go";
  if (lower.includes("ruby")) return "ruby";
  if (lower.includes("php")) return "php";
  if (lower.includes("bash") || lower.includes("shell")) return "bash";
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
  const [code, setCode] = useState(starter || DEFAULT_CODE[detectedLang] || "");
  const [output, setOutput] = useState<string | null>(null);
  const [outputType, setOutputType] = useState<"success" | "error">("success");
  const [running, setRunning] = useState(false);
  const [showOutput, setShowOutput] = useState(false);

  const langInfo = LANGUAGES.find(l => l.id === language)!;

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
    if (!starter) setCode(DEFAULT_CODE[lang] || "");
    setOutput(null);
    setShowOutput(false);
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
      const hasError = data.exitCode !== 0 || (!data.output && data.error);
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
    setCode(starter || DEFAULT_CODE[language] || "");
    setOutput(null);
    setShowOutput(false);
  };

  return (
    <div className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-black/40 mt-6" style={{ direction: "ltr" }}>
      {/* Title Bar */}
      <div className="bg-[#1e1e2e] px-4 py-2.5 flex items-center gap-3 border-b border-white/5">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
          <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
          <div className="w-3 h-3 rounded-full bg-[#28c840]" />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <span className="text-xs text-[#6e6a86] font-mono">Nukhba IDE — {langInfo.ext}</span>
        </div>
        <button
          onClick={handleReset}
          title="Reset"
          className="text-[#6e6a86] hover:text-white/70 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Language Tab Bar — scrollable */}
      <div className="bg-[#181825] flex items-center border-b border-white/5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        <div className="flex shrink-0">
          {LANGUAGES.map(lang => (
            <button
              key={lang.id}
              onClick={() => handleLanguageChange(lang.id)}
              className={`px-3 py-2 text-xs font-mono flex items-center gap-1 border-b-2 whitespace-nowrap transition-all ${
                language === lang.id
                  ? "border-[#F59E0B] text-white bg-[#1e1e2e]"
                  : "border-transparent text-[#6e6a86] hover:text-white/60"
              }`}
            >
              <span className="text-sm">{lang.icon}</span>
              <span>{lang.label}</span>
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <div className="px-3 shrink-0">
          <button
            onClick={handleRun}
            disabled={running}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md transition-all ${
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
                <span>تشغيل ▶</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Monaco Editor */}
      <div className="bg-[#1e1e2e]">
        <Editor
          height="300px"
          language={langInfo.monacoLang}
          value={code}
          onChange={(val) => setCode(val || "")}
          theme="vs-dark"
          options={{
            fontSize: 14,
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            wordWrap: "on",
            lineNumbers: "on",
            glyphMargin: false,
            folding: true,
            lineNumbersMinChars: 3,
            renderLineHighlight: "all",
            smoothScrolling: true,
            cursorBlinking: "smooth",
            cursorSmoothCaretAnimation: "on",
            padding: { top: 12, bottom: 12 },
            scrollbar: { verticalScrollbarSize: 6, horizontalScrollbarSize: 6 },
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
            <div className="bg-[#0d1117] border-t border-white/5">
              <div className="flex items-center gap-2 px-4 py-2 border-b border-white/5">
                <Terminal className="w-3.5 h-3.5 text-[#6e6a86]" />
                <span className="text-xs text-[#6e6a86] font-mono">TERMINAL OUTPUT</span>
                <div className="flex-1" />
                {output !== null && (
                  <div className={`flex items-center gap-1 text-xs font-mono ${outputType === "success" ? "text-[#28c840]" : "text-[#ff5f57]"}`}>
                    <Circle className="w-2 h-2 fill-current" />
                    {outputType === "success" ? "✓ Process exited with code 0" : "✗ Process exited with error"}
                  </div>
                )}
                <button onClick={() => setShowOutput(false)} className="text-[#6e6a86] hover:text-white/60 mr-2">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="p-4 font-mono min-h-[80px] max-h-[220px] overflow-y-auto bg-[#0d1117]">
                {output === null && running ? (
                  <div className="flex items-center gap-2 text-[#6e6a86] text-sm">
                    <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span>$ running {langInfo.label}...</span>
                  </div>
                ) : output !== null ? (
                  <pre className={`whitespace-pre-wrap text-xs leading-relaxed ${outputType === "success" ? "text-[#a6e3a1]" : "text-[#f38ba8]"}`}>
                    <span className="text-[#6e6a86]">$ {langInfo.ext}{"\n"}</span>
                    {output}
                  </pre>
                ) : null}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status Bar */}
      <div className="bg-[#007acc] px-4 py-0.5 flex items-center gap-4">
        <span className="text-[10px] text-white/80 font-mono">{langInfo.icon} {langInfo.label}</span>
        <span className="text-[10px] text-white/50 font-mono">UTF-8</span>
        <span className="text-[10px] text-white/50 font-mono">LF</span>
        <div className="flex-1" />
        <span className="text-[10px] text-white/80 font-mono">Nukhba IDE</span>
      </div>
    </div>
  );
}
