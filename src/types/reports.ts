// Gemeinsame Typdefinitionen für Reports

// Definition für einen Arbeitsrapport-Eintrag
export interface WorkReportEntry {
  date: Date | string;
  orderNumber: string;
  object: string;
  location: string;
  hours: number;
  absences: number;
  overtime: number;
  expenses: string;
  expenseAmount: number;
  notes?: string;
}

// Definition für die Arbeitsrapport-Daten
export interface WorkReportData {
  client: string; // Kunde hinzugefügt
  month: string; // Monat hinzugefügt (ersetzt period)
  year: string; // Jahr hinzugefügt (ersetzt period)
  employeeName: string; // Umbenannt von name
  totalHours: number; // Gesamtstunden hinzugefügt (könnte optional sein)
  date?: string;
  entries: WorkReportEntry[];
}

// Basistyp für gespeicherte Berichte
export interface BaseSavedReport {
  id: string;
  name: string;
  period: string;
  date: string;
}

// Typ für Berichte aus der Datenbank (ReportHistory)
export interface DatabaseSavedReport extends BaseSavedReport {
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  ordernumber?: string;
  objects?: string;
  location?: string;
  workhours?: number;
  absencehours?: number;
  overtimehours?: number;
  expenses?: number;
  files?: any;
}

// Typ für lokal gespeicherte Berichte (WorkReportPage)
export interface LocalSavedReport extends BaseSavedReport {
  entries: WorkReportEntry[];
}

// Vereinigungstyp für beide Report-Typen
export type SavedReport = DatabaseSavedReport | LocalSavedReport;

// Hilfsfunktion zur Typprüfung
export function isDatabaseReport(report: SavedReport): report is DatabaseSavedReport {
  return 'content' in report && typeof report.content === 'string';
}

export function isLocalReport(report: SavedReport): report is LocalSavedReport {
  return 'entries' in report && Array.isArray(report.entries);
}