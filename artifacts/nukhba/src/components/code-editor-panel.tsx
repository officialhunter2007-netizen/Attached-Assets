import { useState, useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import { Play, RotateCcw, Terminal, Circle, X, Plus, FileCode, Zap, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Languages aligned with the Nukhba curriculum subjects and skills
const LANGUAGES = [
  // Web Development track
  { id: "javascript", label: "JavaScript", ext: "js",    icon: "⚡", monacoLang: "javascript" },
  { id: "typescript", label: "TypeScript", ext: "ts",    icon: "💙", monacoLang: "typescript" },
  // Programming skills track
  { id: "python",     label: "Python",     ext: "py",    icon: "🐍", monacoLang: "python"     },
  { id: "java",       label: "Java",       ext: "java",  icon: "☕", monacoLang: "java"       },
  { id: "cpp",        label: "C++",        ext: "cpp",   icon: "⚙️", monacoLang: "cpp"        },
  { id: "c",          label: "C",          ext: "c",     icon: "🔩", monacoLang: "c"          },
  // Mobile Development track
  { id: "dart",       label: "Dart",       ext: "dart",  icon: "🎯", monacoLang: "dart"       },
  { id: "kotlin",     label: "Kotlin",     ext: "kt",    icon: "🤖", monacoLang: "kotlin"     },
  { id: "swift",      label: "Swift",      ext: "swift", icon: "🍎", monacoLang: "swift"      },
  // OS / Cloud / Security track
  { id: "bash",       label: "Bash",       ext: "sh",    icon: "🐚", monacoLang: "shell"      },
  // Data & Databases track
  { id: "sql",        label: "SQL",        ext: "sql",   icon: "🗄️", monacoLang: "sql"        },
];

const EXT_TO_LANG: Record<string, string> = {
  py: "python", js: "javascript", ts: "typescript", java: "java",
  cpp: "cpp", cc: "cpp", cxx: "cpp", c: "c",
  kt: "kotlin", swift: "swift", dart: "dart",
  sql: "sql", sh: "bash", bash: "bash",
};

const DEFAULT_CODE: Record<string, string> = {
  // Web Development
  javascript: `// مرحباً بك في بيئة نُخبة 🎓\nconsole.log("مرحباً من نُخبة!");\n`,
  typescript: `// TypeScript في نُخبة 🎓\nconst greeting: string = "مرحباً من نُخبة!";\nconsole.log(greeting);\n`,
  // Programming Skills
  python:     `# مرحباً بك في بيئة نُخبة 🎓\nprint("مرحباً من نُخبة!")\n`,
  java:       `public class Main {\n    public static void main(String[] args) {\n        System.out.println("مرحباً من نُخبة! 🎓");\n    }\n}\n`,
  cpp:        `#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "مرحباً من نُخبة! 🎓" << endl;\n    return 0;\n}\n`,
  c:          `#include <stdio.h>\n\nint main() {\n    printf("مرحباً من نُخبة! 🎓\\n");\n    return 0;\n}\n`,
  // Mobile Development
  dart:       `void main() {\n    print("مرحباً من نُخبة! 🎓");\n}\n`,
  kotlin:     `fun main() {\n    println("مرحباً من نُخبة! 🎓")\n}\n`,
  swift:      `print("مرحباً من نُخبة! 🎓")\n`,
  // OS / Cloud / Security
  bash:       `#!/bin/bash\n# مرحباً بك\necho "مرحباً من نُخبة! 🎓"\n`,
  // Data & Databases
  sql:        `-- استعلام SQL تجريبي\nSELECT 'مرحباً من نُخبة! 🎓' AS greeting;\nSELECT 1+1 AS result;\n`,
};

interface IDEFile {
  id: string;
  name: string;
  language: string;
  content: string;
}

const LS_KEY = "nukhba-ide-files-v2";

function detectLangFromExt(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  return EXT_TO_LANG[ext] || "python";
}

function detectLanguageFromContent(html: string, subjectId?: string): string {
  const lower = (html + (subjectId || "")).toLowerCase();
  if (lower.includes("typescript") || lower.includes("تايب")) return "typescript";
  if (lower.includes("java") && !lower.includes("javascript")) return "java";
  if (lower.includes("javascript") || lower.includes("js")) return "javascript";
  if (lower.includes("python") || lower.includes("بايثون")) return "python";
  if (lower.includes("kotlin")) return "kotlin";
  if (lower.includes("swift")) return "swift";
  if (lower.includes("dart") || lower.includes("flutter")) return "dart";
  if (lower.includes("rust")) return "rust";
  if (lower.includes("golang") || lower.includes(" go ")) return "go";
  if (lower.includes("ruby")) return "ruby";
  if (lower.includes("php")) return "php";
  if (lower.includes("sql")) return "sql";
  if (lower.includes("lua")) return "lua";
  if (lower.includes("elixir")) return "elixir";
  if (lower.includes("c++") || lower.includes("cpp")) return "cpp";
  if (lower.includes("bash") || lower.includes("shell")) return "bash";
  if (lower.includes("perl")) return "perl";
  if (lower.includes("awk")) return "awk";
  if (lower.includes(" r ") || lower.includes("rstudio")) return "r";
  return "python";
}

function extractStarterCode(html: string): string {
  const match = html.match(/<pre[^>]*>\s*<code[^>]*>([\s\S]*?)<\/code>\s*<\/pre>/i);
  if (!match) return "";
  return match[1]
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\\n/g, "\n").replace(/\\t/g, "\t")
    .trim();
}

interface Props {
  sectionContent: string;
  subjectId?: string;
  onShareWithTeacher?: (code: string, language: string, output: string) => void;
}

export function CodeEditorPanel({ sectionContent, subjectId, onShareWithTeacher }: Props) {
  const starter = extractStarterCode(sectionContent);
  const detectedLang = detectLanguageFromContent(sectionContent, subjectId);
  const langInfo = (l: string) => LANGUAGES.find(x => x.id === l) || LANGUAGES[0];

  const initFiles = (): IDEFile[] => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    const lang = detectedLang;
    const ext = langInfo(lang).ext;
    return [{ id: "main", name: `main.${ext}`, language: lang, content: starter || DEFAULT_CODE[lang] || "" }];
  };

  const [files, setFiles] = useState<IDEFile[]>(initFiles);
  const [activeId, setActiveId] = useState<string>(() => initFiles()[0]?.id || "main");
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [nameError, setNameError] = useState("");
  const [output, setOutput] = useState<string | null>(null);
  const [outputType, setOutputType] = useState<"success" | "error">("success");
  const [running, setRunning] = useState(false);
  const [showOutput, setShowOutput] = useState(false);
  const newNameRef = useRef<HTMLInputElement>(null);

  const activeFile = files.find(f => f.id === activeId) || files[0];
  const activeLangInfo = langInfo(activeFile?.language || "python");

  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(files)); } catch {}
  }, [files]);

  useEffect(() => {
    if (isCreating && newNameRef.current) newNameRef.current.focus();
  }, [isCreating]);

  const updateContent = (content: string) => {
    setFiles(prev => prev.map(f => f.id === activeFile.id ? { ...f, content } : f));
  };

  const createFile = () => {
    const name = newName.trim();
    if (!name) { setNameError("أدخل اسم الملف"); return; }
    if (files.some(f => f.name === name)) { setNameError("اسم مستخدم مسبقاً"); return; }
    const lang = detectLangFromExt(name);
    const newFile: IDEFile = {
      id: `${Date.now()}`,
      name,
      language: lang,
      content: DEFAULT_CODE[lang] || "",
    };
    setFiles(prev => [...prev, newFile]);
    setActiveId(newFile.id);
    setIsCreating(false);
    setNewName("");
    setNameError("");
    setOutput(null);
    setShowOutput(false);
  };

  const deleteFile = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (files.length <= 1) return;
    const newFiles = files.filter(f => f.id !== id);
    setFiles(newFiles);
    if (activeId === id) setActiveId(newFiles[0]?.id || "");
  };

  const switchFile = (id: string) => {
    setActiveId(id);
    setOutput(null);
    setShowOutput(false);
  };

  const handleRun = async () => {
    if (running || !activeFile) return;
    setRunning(true);
    setShowOutput(true);
    setOutput(null);
    try {
      const res = await fetch("/api/ai/run-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code: activeFile.content, language: activeFile.language }),
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
    if (!activeFile) return;
    setFiles(prev => prev.map(f => f.id === activeFile.id
      ? { ...f, content: DEFAULT_CODE[f.language] || "" }
      : f
    ));
    setOutput(null);
    setShowOutput(false);
  };

  return (
    <div className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-black/40" style={{ direction: "ltr" }}>

      {/* ── Title Bar ── */}
      <div className="bg-[#1e1e2e] px-4 py-2 flex items-center gap-3 border-b border-white/5">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
          <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
          <div className="w-3 h-3 rounded-full bg-[#28c840]" />
        </div>
        <FileCode className="w-3.5 h-3.5 text-[#6e6a86]" />
        <span className="text-xs text-[#6e6a86] font-mono flex-1">Nukhba IDE</span>
        <button
          onClick={handleReset}
          title="Reset file"
          className="text-[#6e6a86] hover:text-white/70 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ── File Tabs ── */}
      <div className="bg-[#181825] border-b border-white/5 flex items-center overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        <div className="flex min-w-0">
          {files.map(file => {
            const li = langInfo(file.language);
            return (
              <button
                key={file.id}
                onClick={() => switchFile(file.id)}
                className={`group flex items-center gap-1.5 px-3 py-2 text-xs font-mono border-b-2 whitespace-nowrap transition-all shrink-0 ${
                  activeId === file.id
                    ? "border-[#F59E0B] text-white bg-[#1e1e2e]"
                    : "border-transparent text-[#6e6a86] hover:text-white/60 hover:bg-white/5"
                }`}
              >
                <span>{li.icon}</span>
                <span>{file.name}</span>
                {files.length > 1 && (
                  <span
                    onClick={(e) => deleteFile(file.id, e)}
                    className="opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all ml-0.5 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* New File Button / Input */}
        {isCreating ? (
          <div className="flex items-center gap-1 px-2 shrink-0">
            <input
              ref={newNameRef}
              value={newName}
              onChange={e => { setNewName(e.target.value); setNameError(""); }}
              onKeyDown={e => { if (e.key === "Enter") createFile(); if (e.key === "Escape") { setIsCreating(false); setNewName(""); setNameError(""); } }}
              placeholder="main.py"
              className="bg-[#1e1e2e] border border-[#F59E0B]/50 rounded px-2 py-1 text-xs font-mono text-white outline-none w-28 placeholder:text-[#6e6a86]"
            />
            <button onClick={createFile} className="text-[#28c840] hover:text-green-300 transition-colors">
              <Check className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => { setIsCreating(false); setNewName(""); setNameError(""); }} className="text-[#ff5f57] hover:text-red-300 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
            {nameError && <span className="text-[10px] text-red-400">{nameError}</span>}
          </div>
        ) : (
          <button
            onClick={() => setIsCreating(true)}
            title="ملف جديد"
            className="shrink-0 px-3 py-2 text-[#6e6a86] hover:text-white transition-colors flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        )}

        <div className="flex-1" />

        {/* Run button in tab bar */}
        <div className="px-2 shrink-0">
          <button
            onClick={handleRun}
            disabled={running}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md transition-all ${
              running
                ? "bg-[#F59E0B]/30 text-[#F59E0B]/60 cursor-not-allowed"
                : "bg-[#F59E0B] text-black hover:bg-[#fbbf24] shadow shadow-[#F59E0B]/20"
            }`}
          >
            {running
              ? <><div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" /><span>تشغيل...</span></>
              : <><Play className="w-3 h-3 fill-current" /><span>تشغيل ▶</span></>
            }
          </button>
        </div>
      </div>

      {/* ── Language Info Bar ── */}
      <div className="bg-[#181825] border-b border-white/5 px-3 py-1 flex items-center gap-2">
        <span className="text-sm">{activeLangInfo.icon}</span>
        <span className="text-[11px] text-[#6e6a86] font-mono">{activeLangInfo.label} · {activeFile?.name}</span>
        <div className="flex-1" />
        <span className="text-[11px] text-[#6e6a86] font-mono">{files.length} {files.length === 1 ? "ملف" : "ملفات"}</span>
      </div>

      {/* ── Monaco Editor ── */}
      <div className="bg-[#1e1e2e]">
        <Editor
          key={activeFile?.id}
          height="280px"
          language={activeLangInfo.monacoLang}
          value={activeFile?.content || ""}
          onChange={(val) => updateContent(val || "")}
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

      {/* ── Run Button Bar ── */}
      <div className="bg-[#181825] px-4 py-3 border-t border-white/5 flex items-center gap-3 flex-wrap">
        <button
          onClick={handleRun}
          disabled={running}
          className={`flex items-center gap-2 font-bold px-5 py-2.5 rounded-xl transition-all text-sm shadow-lg ${
            running
              ? "bg-[#F59E0B]/30 text-[#F59E0B]/60 cursor-not-allowed"
              : "bg-[#F59E0B] text-black hover:bg-[#fbbf24] shadow-[#F59E0B]/30 active:scale-95"
          }`}
        >
          {running
            ? <><div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /><span>جاري التنفيذ...</span></>
            : <><Zap className="w-4 h-4 fill-current" /><span>تشغيل الكود ▶</span></>
          }
        </button>
        <button
          onClick={handleReset}
          className="flex items-center gap-2 text-[#6e6a86] hover:text-white/70 transition-colors text-sm px-3 py-2.5 rounded-xl hover:bg-white/5"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>إعادة تعيين</span>
        </button>
        <div className="flex-1" />
        {output !== null && !running && (
          <div className="flex items-center gap-3">
            <div className={`text-xs font-mono flex items-center gap-1.5 ${outputType === "success" ? "text-[#28c840]" : "text-[#ff5f57]"}`}>
              <Circle className="w-2 h-2 fill-current" />
              {outputType === "success" ? "نجح التنفيذ ✓" : "خطأ في التنفيذ ✗"}
            </div>
            {onShareWithTeacher && (
              <button
                onClick={() => onShareWithTeacher(activeFile?.content || "", activeFile?.language || "python", output ?? "")}
                className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 transition-all"
                style={{ direction: "rtl" }}
              >
                <span>📤</span>
                <span>شارك مع المعلم</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Terminal Output ── */}
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
              <div className="p-4 font-mono min-h-[80px] max-h-[200px] overflow-y-auto bg-[#0d1117]">
                {output === null && running ? (
                  <div className="flex items-center gap-2 text-[#6e6a86] text-sm">
                    <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span>$ running {activeLangInfo.label}...</span>
                  </div>
                ) : output !== null ? (
                  <pre className={`whitespace-pre-wrap text-xs leading-relaxed ${outputType === "success" ? "text-[#a6e3a1]" : "text-[#f38ba8]"}`}>
                    <span className="text-[#6e6a86]">$ {activeFile?.name}{"\n"}</span>
                    {output}
                  </pre>
                ) : null}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Status Bar ── */}
      <div className="bg-[#007acc] px-4 py-0.5 flex items-center gap-4">
        <span className="text-[10px] text-white/80 font-mono">{activeLangInfo.icon} {activeLangInfo.label}</span>
        <span className="text-[10px] text-white/50 font-mono">UTF-8</span>
        <span className="text-[10px] text-white/50 font-mono">LF</span>
        <div className="flex-1" />
        <span className="text-[10px] text-white/80 font-mono">Nukhba IDE · {LANGUAGES.length} languages</span>
      </div>
    </div>
  );
}
