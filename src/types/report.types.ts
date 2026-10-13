export interface ReportStudent {
  id?: string;
  firstName?: string;
  lastName?: string;
}

export interface ReportTeacher {
  firstName?: string;
  lastName?: string;
}

export interface ReportItem {
  id: string;
  studentId?: string;
  filename?: string;
  filepath?: string;
  description?: string;
  createdAt: string;
  student?: ReportStudent;
  teacher?: ReportTeacher;
}

export interface ReportFilters {
  studentId?: string;
  teacherId?: string;
  agencyId?: string;
  status?: string;
  year?: string;
  month?: string;
  date?: string;
  page?: number;
  limit?: number;
}
