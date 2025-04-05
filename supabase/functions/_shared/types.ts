// Shared types for Supabase functions

/**
 * Interface for work report entry data
 */
export interface WorkReportEntry {
  date: string;
  project?: string;
  description: string;
  hours?: number;
}

/**
 * Interface for work report data
 */
export interface WorkReportData {
  client: string;
  month: string | number;
  year: string | number;
  totalHours: number;
  employeeName: string;
  entries: WorkReportEntry[];
}
