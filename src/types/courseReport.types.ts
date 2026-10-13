export interface CourseReportEntryForm {
  date: string;
  duration: string;
  note: string;
}

export interface UpsertWeeklyReportPayload {
  studentId: string;
  teacherId: string;
  weekStart: string;
  positivePoints: string;
  negativePoints: string;
  additionalNotes?: string;
  entries: Array<{
    date: string;
    duration: number;
    note?: string;
  }>;
}

export interface CourseReportEntryBackend {
  id: string;
  reportId: string;
  date: string;
  duration: number;
  note: string | null;
}

export interface WeeklyCourseReportBackend {
  id: string;
  studentId: string;
  teacherId: string;
  weekStart: string;
  positivePoints: string;
  negativePoints: string;
  additionalNotes: string | null;
  createdAt: string;
  updatedAt: string;
  entries: CourseReportEntryBackend[];
}

export interface ReportHistoryWeek {
  weekStart: string;
  weekStartFormatted: string;
  completed: boolean;
  hasEntries: boolean;
  entryCount: number;
  lastModified: string | null;
  createdAt: string | null;
  reportId: string | null;
}

export interface ReportHistoryResponse {
  success: boolean;
  data: {
    teacherId: string;
    studentId: string;
    startDate: string;
    endDate: string;
    totalWeeks: number;
    completedWeeks: number;
    weeks: ReportHistoryWeek[];
  };
  message: string;
}
