import ExcelJS from 'exceljs';
import { WorkReportData } from '@/types/reports';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

/**
 * Erstellt eine formatierte Excel-Datei aus den Arbeitsrapport-Daten
 * @param reportData Die Daten des Arbeitsrapports
 * @param includeCompanyInfo Ob Firmeninformationen hinzugefügt werden sollen
 * @returns Ein Blob-Objekt der Excel-Datei
 */
export async function createExcelReport(reportData: WorkReportData, includeCompanyInfo: boolean = true): Promise<Blob> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Arbeitsrapport');

  // Metadaten setzen
  workbook.creator = 'RapportGenius';
  workbook.lastModifiedBy = 'RapportGenius';
  workbook.created = new Date();
  workbook.modified = new Date();
  
  // Dokumenteigenschaften
  workbook.creator = `Arbeitsrapport: ${reportData.name}`;
  workbook.lastModifiedBy = `RapportGenius`;
  workbook.company = 'RapportGenius';

  // Titel und Zeitraum
  worksheet.mergeCells('A1:J1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = `Arbeitsrapport: ${reportData.name}`;
  titleCell.font = { size: 16, bold: true, color: { argb: '2B5FB6' } };
  titleCell.alignment = { horizontal: 'center' };
  
  worksheet.mergeCells('A2:J2');
  const periodCell = worksheet.getCell('A2');
  periodCell.value = `Zeitraum: ${reportData.period}`;
  periodCell.font = { size: 12, bold: true };
  periodCell.alignment = { horizontal: 'center' };
  
  // Erstellungsdatum
  worksheet.mergeCells('H3:J3');
  const dateCell = worksheet.getCell('H3');
  dateCell.value = `Erstellt am: ${format(new Date(), 'PPP', { locale: de })}`;
  dateCell.font = { size: 10, italic: true };
  dateCell.alignment = { horizontal: 'right' };
  
  // Firmeninformationen, falls gewünscht
  if (includeCompanyInfo) {
    worksheet.mergeCells('A3:D3');
    const companyCell = worksheet.getCell('A3');
    companyCell.value = `Erstellt mit RapportGenius`;
    companyCell.font = { size: 10, italic: true };
    companyCell.alignment = { horizontal: 'left' };
  }

  // Leerzeile
  worksheet.addRow([]);

  // Spaltenüberschriften
  const headerRow = worksheet.addRow([
    'Datum', 
    'Auftrag Nr.', 
    'Objekt oder Strasse', 
    'Ort', 
    'Std.', 
    'Absenzen', 
    'Überstd.', 
    'Auslagen und Bemerkungen', 
    'Auslagen Fr.', 
    'Notizen'
  ]);
  
  // Styling für Header
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '2B5FB6' }
    };
    cell.border = {
      top: { style: 'thin', color: { argb: 'B2B2B2' } },
      left: { style: 'thin', color: { argb: 'B2B2B2' } },
      bottom: { style: 'thin', color: { argb: 'B2B2B2' } },
      right: { style: 'thin', color: { argb: 'B2B2B2' } }
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  });

  // Spaltenbreiten setzen
  worksheet.getColumn(1).width = 12; // Datum
  worksheet.getColumn(2).width = 12; // Auftrag Nr.
  worksheet.getColumn(3).width = 25; // Objekt oder Strasse
  worksheet.getColumn(4).width = 15; // Ort
  worksheet.getColumn(5).width = 8;  // Std.
  worksheet.getColumn(6).width = 8;  // Absenzen
  worksheet.getColumn(7).width = 8;  // Überstd.
  worksheet.getColumn(8).width = 25; // Auslagen und Bemerkungen
  worksheet.getColumn(9).width = 12; // Auslagen Fr.
  worksheet.getColumn(10).width = 20; // Notizen

  // Daten einfügen
  reportData.entries.forEach(entry => {
    const dateValue = entry.date instanceof Date 
      ? entry.date.toLocaleDateString('de-CH') 
      : typeof entry.date === 'string' 
        ? entry.date 
        : '';

    const row = worksheet.addRow([
      dateValue,
      entry.orderNumber,
      entry.object,
      entry.location,
      entry.hours,
      entry.absences > 0 ? entry.absences : '',
      entry.overtime > 0 ? entry.overtime : '',
      entry.expenses || '',
      entry.expenseAmount > 0 ? entry.expenseAmount : '',
      entry.notes || ''
    ]);

    // Styling für Datenzeilen
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'E0E0E0' } },
        left: { style: 'thin', color: { argb: 'E0E0E0' } },
        bottom: { style: 'thin', color: { argb: 'E0E0E0' } },
        right: { style: 'thin', color: { argb: 'E0E0E0' } }
      };
      
      // Zahlenformatierung für Stunden und Beträge
      const colNumber = typeof cell.col === 'string' ? parseInt(cell.col, 10) : cell.col;
      if ([5, 6, 7].includes(colNumber)) {
        cell.numFmt = '0.00';
        cell.alignment = { horizontal: 'right' };
      } else if (colNumber === 9) {
        cell.numFmt = '#,##0.00 "CHF"';
        cell.alignment = { horizontal: 'right' };
      }
      
      // Zebrastreifen-Muster für bessere Lesbarkeit
      if (row.number % 2 === 0) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'F9F9F9' }
        };
      }
    });
  });

  // Leerzeile
  worksheet.addRow([]);

  // Summen berechnen
  const totalHours = reportData.entries.reduce((sum, entry) => sum + entry.hours, 0);
  const totalAbsences = reportData.entries.reduce((sum, entry) => sum + entry.absences, 0);
  const totalOvertime = reportData.entries.reduce((sum, entry) => sum + entry.overtime, 0);
  const totalExpenses = reportData.entries.reduce((sum, entry) => sum + entry.expenseAmount, 0);
  const totalRequiredHours = totalHours + totalAbsences;

  // Summenzeile
  const totalRow = worksheet.addRow([
    'Total', '', '', '', 
    totalHours, 
    totalAbsences > 0 ? totalAbsences : '', 
    totalOvertime > 0 ? totalOvertime : '',
    '',
    totalExpenses > 0 ? totalExpenses : '',
    ''
  ]);

  // Styling für Summenzeile
  totalRow.eachCell((cell) => {
    cell.font = { bold: true };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'E6EFF9' }
    };
    cell.border = {
      top: { style: 'thin', color: { argb: 'B2B2B2' } },
      left: { style: 'thin', color: { argb: 'B2B2B2' } },
      bottom: { style: 'thin', color: { argb: 'B2B2B2' } },
      right: { style: 'thin', color: { argb: 'B2B2B2' } }
    };
    const colNumber = typeof cell.col === 'string' ? parseInt(cell.col, 10) : cell.col;
    if (colNumber === 5 || colNumber === 6 || colNumber === 7) {
      cell.numFmt = '0.00';
      cell.alignment = { horizontal: 'right' };
    } else if (colNumber === 9) {
      cell.numFmt = '#,##0.00 "CHF"';
      cell.alignment = { horizontal: 'right' };
    }
  });

  // Sollstunden Zeile
  const requiredRow = worksheet.addRow([
    'Total Sollstunden', '', '', '', 
    totalRequiredHours,
    '', '', '', '', ''
  ]);

  // Styling für Sollstunden
  requiredRow.eachCell((cell, colIndex) => {
    const colNumber = typeof colIndex === 'string' ? parseInt(colIndex, 10) : colIndex;
    if (colNumber === 1) {
      cell.font = { bold: true };
    }
    if (colNumber === 5) {
      cell.font = { bold: true };
      cell.numFmt = '0.00';
      cell.alignment = { horizontal: 'right' };
      // Hervorhebung der Sollstunden
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'E6EFF9' }
      };
    }
    cell.border = {
      top: { style: 'thin', color: { argb: 'B2B2B2' } },
      left: { style: 'thin', color: { argb: 'B2B2B2' } },
      bottom: { style: 'thin', color: { argb: 'B2B2B2' } },
      right: { style: 'thin', color: { argb: 'B2B2B2' } }
    };
  });
  
  // Füge eine Fußzeile mit Informationen hinzu
  const footerRow = worksheet.addRow(['']);
  worksheet.mergeCells(`A${footerRow.number}:J${footerRow.number}`);
  const footerCell = worksheet.getCell(`A${footerRow.number}`);
  footerCell.value = 'Erstellt mit RapportGenius - www.rapportgenius.app';
  footerCell.font = { size: 8, italic: true, color: { argb: '808080' } };
  footerCell.alignment = { horizontal: 'center' };

  // Excel-Datei als Blob zurückgeben
  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

/**
 * Erstellt eine Excel-Datei und bietet sie zum Download an
 * @param reportData Die Daten des Arbeitsrapports
 * @param includeCompanyInfo Ob Firmeninformationen hinzugefügt werden sollen
 */
export async function downloadExcelReport(reportData: WorkReportData, includeCompanyInfo: boolean = true): Promise<void> {
  try {
    const blob = await createExcelReport(reportData, includeCompanyInfo);
    
    // Dateinamen erstellen
    const fileName = `Arbeitsrapport_${reportData.name.replace(/\s+/g, '_')}_${reportData.period.replace(/\s+/g, '_')}.xlsx`;
    
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
    console.error('Fehler beim Erstellen der Excel-Datei:', error);
    throw error;
  }
}
