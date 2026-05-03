import { FileText } from "lucide-react";
import { SectionState } from "./dashboard-card";
import { SummaryCard } from "./summary-card";
import { LessonSummary } from "./types";

export function SummariesSection({
  summaries, loading, error, onRetry,
}: { summaries: LessonSummary[]; loading: boolean; error: string | null; onRetry: () => void }) {
  return (
    <SectionState
      loading={loading}
      error={error}
      empty={summaries.length === 0}
      emptyIcon={<FileText className="w-10 h-10" />}
      emptyMessage="لم تُكمل أي جلسة تعليمية بعد. أكمل مراحل جلسة لتظهر ملخصاتها هنا."
      onRetry={onRetry}
    >
      <div className="space-y-4">
        {summaries.map(s => <SummaryCard key={s.id} summary={s} />)}
      </div>
    </SectionState>
  );
}
