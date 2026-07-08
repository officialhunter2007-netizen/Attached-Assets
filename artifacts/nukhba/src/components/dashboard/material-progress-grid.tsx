import { Link } from "wouter";
import { BookOpen, ChevronLeft } from "lucide-react";
import { MaterialWithProgress } from "./types";
import { useLang } from "@/lib/lang-context";

function MaterialProgressCard({ material, locked }: { material: MaterialWithProgress; locked: boolean }) {
  const { tr } = useLang();
  const td = tr.dashboard;
  const p = material.progress!;
  const pct = p.chaptersTotal > 0 ? Math.round((p.completedCount / p.chaptersTotal) * 100) : 0;
  const href = locked
    ? "/subscription"
    : `/subject/${material.subjectId}?sources=${material.id}`;
  return (
    <Link href={href}>
      <div
        className="rounded-2xl p-5 hover:bg-white/5 hover:border-amber-400/30 transition-all cursor-pointer h-full flex flex-col"
        style={{
          background: "linear-gradient(135deg, rgba(251,191,36,0.05), rgba(10,13,22,0.85))",
          border: "1px solid rgba(251,191,36,0.18)",
        }}
      >
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5 text-amber-400" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-bold text-sm truncate" title={material.fileName}>{material.fileName}</h4>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{material.subjectName}</p>
          </div>
          <ChevronLeft className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
        </div>
        <div className="mt-auto">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
            <span>{td.readingProgress}: {p.completedCount} / {p.chaptersTotal} {td.chapters}</span>
            <span className="font-bold text-amber-300">{pct}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
            <div className="h-full bg-gradient-to-l from-amber-400 to-emerald-400 transition-all" style={{ width: `${pct}%` }} />
          </div>
          {p.currentChapterTitle && (
            <p className="mt-2 text-[11px] text-muted-foreground truncate">
              {td.currentChapter}: <span className="text-white/70">{p.currentChapterTitle}</span>
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

export function MaterialProgressGrid({
  materials, locked = false,
}: { materials: MaterialWithProgress[]; locked?: boolean }) {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {materials.map(m => <MaterialProgressCard key={m.id} material={m} locked={locked} />)}
    </div>
  );
}
