import { WorkReportData } from '@/types/reports';

/**
 * Erstellt eine CSV-Datei aus den Arbeitsrapport-Daten
 * @param reportData Die Daten des Arbeitsrapports
 * @returns Ein Blob-Objekt der CSV-Datei
 */
export function createCSVReport(reportData: WorkReportData): Blob {
  // CSV-Header
  let csvContent = "Datum,Auftrag Nr.,Objekt oder Strasse,Ort,Std.,Absenzen,Überstd.,Auslagen und Bemerkungen,Auslagen Fr.,Notizen\n";
  
  // Daten hinzufügen
  reportData.entries.forEach((entry) => {
    // Datum formatieren
    const dateValue = entry.date instanceof Date 
      ? entry.date.toLocaleDateString('de-CH') 
      : typeof entry.date === 'string' 
        ? entry.date 
        : '';
    
    // Textwerte mit Anführungszeichen umschließen und Anführungszeichen im Text verdoppeln (CSV-Escape)
    const escapeCsvValue = (value: string) => {
      if (!value) return '';
      return `"${value.replace(/"/g, '""')}"`;
    };
    
    // Zahlenwerte formatieren
    const formatNumber = (value: number) => {
      if (value === 0) return '';
      return value.toFixed(2).replace('.', ',');
    };
    
    // Zeile zusammenstellen
    const row = [
      escapeCsvValue(dateValue),
      escapeCsvValue(entry.orderNumber || ''),
      escapeCsvValue(entry.object || ''),
      escapeCsvValue(entry.location || ''),
      formatNumber(entry.hours),
      formatNumber(entry.absences),
      formatNumber(entry.overtime),
      escapeCsvValue(entry.expenses || ''),
      formatNumber(entry.expenseAmount),
      escapeCsvValue(entry.notes || '')
    ];
    
    csvContent += row.join(',') + '\n';
  });
  
  // Summen berechnen
  const totalHours = reportData.entries.reduce((sum, entry) => sum + entry.hours, 0);
  const totalAbsences = reportData.entries.reduce((sum, entry) => sum + entry.absences, 0);
  const totalOvertime = reportData.entries.reduce((sum, entry) => sum + entry.overtime, 0);
  const totalExpenses = reportData.entries.reduce((sum, entry) => sum + entry.expenseAmount, 0);
  const totalRequiredHours = totalHours + totalAbsences;
  
  // Summenzeile
  csvContent += `"Total",,,,${totalHours.toFixed(2).replace('.', ',')},${totalAbsences > 0 ? totalAbsences.toFixed(2).replace('.', ',') : ''},${totalOvertime > 0 ? totalOvertime.toFixed(2).replace('.', ',') : ''},,${totalExpenses > 0 ? totalExpenses.toFixed(2).replace('.', ',') : ''}\n`;
  
  // Sollstunden
  csvContent += `"Total Sollstunden",,,,${totalRequiredHours.toFixed(2).replace('.', ',')}\n`;
  
  // Metadaten
  csvContent += `\n"Arbeitsrapport: ${reportData.name}"\n"Zeitraum: ${reportData.period}"\n"Erstellt am: ${new Date().toLocaleDateString('de-CH')}"\n`;
  
  // CSV als Blob zurückgeben mit UTF-8 BOM für bessere Excel-Kompatibilität
  const BOM = new Uint8Array([0xEF, 0xBB, 0xBF]);
  const csvBlob = new Blob([BOM, csvContent], { type: 'text/csv;charset=utf-8' });
  
  return csvBlob;
}

/**
 * Erstellt eine CSV-Datei und bietet sie zum Download an
 * @param reportData Die Daten des Arbeitsrapports
 */
export function downloadCSVReport(reportData: WorkReportData): void {
  try {
    const blob = createCSVReport(reportData);
    
    // Dateinamen erstellen
    const fileName = `Arbeitsrapport_${reportData.name.replace(/\s+/g, '_')}_${reportData.period.replace(/\s+/g, '_')}.csv`;
    
    // Download initiieren
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    
    // Aufräumen
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Fehler beim Erstellen der CSV-Datei:', error);
    throw error;
  }
}
