export interface LessonSummary {
  id: number;
  subjectId: string;
  subjectName: string;
  title: string;
  summaryHtml: string;
  conversationDate: string;
  messagesCount: number;
}

export interface LabReport {
  id: number;
  subjectId: string;
  subjectName: string;
  envTitle: string;
  envBriefing: string;
  reportText: string;
  feedbackHtml: string;
  createdAt: string;
}

export interface SubjectSub {
  id: number;
  subjectId: string;
  subjectName: string | null;
  planType: string;
  messagesUsed: number;
  messagesLimit: number;
  expiresAt: string;
  // ── New gems-wallet fields. Optional during the migration window so
  // older cached responses don't hard-fail at parse time.
  gemsBalance?: number;
  gemsDailyLimit?: number;
  gemsUsedToday?: number;
  dailyRemaining?: number;
}

export interface MaterialProgressInfo {
  chaptersTotal: number;
  completedCount: number;
  currentChapterIndex: number;
  currentChapterTitle: string | null;
}

export interface MaterialWithProgress {
  id: number;
  fileName: string;
  status: "processing" | "ready" | "error";
  subjectId: string;
  subjectName: string;
  progress: MaterialProgressInfo | null;
  createdAt: string | null;
  lastInteractedAt: string | null;
}
