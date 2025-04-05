import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { WorkReportData } from '@/types/reports';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

// Farben für das PDF
const COLORS = {
  PRIMARY: [43, 95, 182] as [number, number, number],    // #2B5FB6
  SECONDARY: [230, 239, 249] as [number, number, number], // #E6EFF9
  TEXT: [51, 51, 51] as [number, number, number],        // #333333
  LIGHT_TEXT: [128, 128, 128] as [number, number, number], // #808080
  BORDER: [224, 224, 224] as [number, number, number]    // #E0E0E0
};

/**
 * Erstellt ein PDF-Dokument aus den Arbeitsrapport-Daten
 * @param reportData Die Daten des Arbeitsrapports
 * @param includeCompanyInfo Ob Firmeninformationen hinzugefügt werden sollen
 * @returns Ein jsPDF-Dokument
 */
export function createPDFReport(reportData: WorkReportData, includeCompanyInfo: boolean = true): jsPDF {
  // PDF im A4-Format erstellen
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Dokumenteigenschaften
  doc.setProperties({
    title: `Arbeitsrapport: ${reportData.name}`,
    subject: `Zeitraum: ${reportData.period}`,
    author: 'RapportGenius',
    keywords: 'Arbeitsrapport, Stunden, Rapport',
    creator: 'RapportGenius'
  });

  // Seitenränder
  const margin = 15;
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const contentWidth = pageWidth - 2 * margin;

  // Titel mit Farbakzent
  doc.setFillColor(COLORS.PRIMARY[0], COLORS.PRIMARY[1], COLORS.PRIMARY[2]);
  doc.rect(margin, margin, contentWidth, 12, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(`Arbeitsrapport: ${reportData.name}`, pageWidth / 2, margin + 8, { align: 'center' });

  // Zeitraum
  doc.setTextColor(COLORS.TEXT[0], COLORS.TEXT[1], COLORS.TEXT[2]);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Zeitraum: ${reportData.period}`, pageWidth / 2, margin + 20, { align: 'center' });

  // Erstellungsdatum
  doc.setFontSize(10);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(COLORS.LIGHT_TEXT[0], COLORS.LIGHT_TEXT[1], COLORS.LIGHT_TEXT[2]);
  doc.text(
    `Erstellt am: ${format(new Date(), 'PPP', { locale: de })}`,
    pageWidth - margin,
    margin + 28,
    { align: 'right' }
  );

  // Firmeninformationen, falls gewünscht
  if (includeCompanyInfo) {
    doc.text(
      'Erstellt mit RapportGenius',
      margin,
      margin + 28,
      { align: 'left' }
    );
  }

  // Tabelle mit Daten
  const tableColumn = [
    'Datum', 
    'Auftrag Nr.', 
    'Objekt/Strasse', 
    'Ort', 
    'Std.', 
    'Absenzen', 
    'Überstd.', 
    'Auslagen', 
    'Auslagen Fr.', 
    'Notizen'
  ];

  // Daten für die Tabelle vorbereiten
  const tableRows = reportData.entries.map((entry, index) => {
    const dateValue = entry.date instanceof Date 
      ? entry.date.toLocaleDateString('de-CH') 
      : typeof entry.date === 'string' 
        ? entry.date 
        : '';

    return [
      dateValue,
      entry.orderNumber || '',
      entry.object || '',
      entry.location || '',
      entry.hours.toFixed(2),
      entry.absences > 0 ? entry.absences.toFixed(2) : '',
      entry.overtime > 0 ? entry.overtime.toFixed(2) : '',
      entry.expenses || '',
      entry.expenseAmount > 0 ? entry.expenseAmount.toFixed(2) + ' CHF' : '',
      entry.notes || ''
    ];
  });

  // Summen berechnen
  const totalHours = reportData.entries.reduce((sum, entry) => sum + entry.hours, 0);
  const totalAbsences = reportData.entries.reduce((sum, entry) => sum + entry.absences, 0);
  const totalOvertime = reportData.entries.reduce((sum, entry) => sum + entry.overtime, 0);
  const totalExpenses = reportData.entries.reduce((sum, entry) => sum + entry.expenseAmount, 0);
  const totalRequiredHours = totalHours + totalAbsences;

  // Summenzeile
  const totalRow = [
    'Total', '', '', '', 
    totalHours.toFixed(2), 
    totalAbsences > 0 ? totalAbsences.toFixed(2) : '', 
    totalOvertime > 0 ? totalOvertime.toFixed(2) : '',
    '',
    totalExpenses > 0 ? totalExpenses.toFixed(2) + ' CHF' : '',
    ''
  ];

  // Sollstunden Zeile
  const requiredRow = [
    'Total Sollstunden', '', '', '', 
    totalRequiredHours.toFixed(2),
    '', '', '', '', ''
  ];

  // Zusammenfassung für Fußzeile
  const summary = [
    `Gesamtstunden: ${totalHours.toFixed(2)}`,
    `Absenzen: ${totalAbsences > 0 ? totalAbsences.toFixed(2) : '0.00'}`,
    `Überstunden: ${totalOvertime > 0 ? totalOvertime.toFixed(2) : '0.00'}`,
    `Auslagen: ${totalExpenses > 0 ? totalExpenses.toFixed(2) + ' CHF' : '0.00 CHF'}`,
    `Sollstunden: ${totalRequiredHours.toFixed(2)}`
  ];

  // Tabelle erstellen
  autoTable(doc, {
    head: [tableColumn],
    body: [...tableRows, totalRow, requiredRow],
    startY: margin + 35,
    theme: 'grid',
    styles: {
      fontSize: 9,
      cellPadding: 3,
      lineColor: COLORS.BORDER,
      lineWidth: 0.1,
      font: 'helvetica',
      textColor: COLORS.TEXT
    },
    headStyles: {
      fillColor: COLORS.PRIMARY,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { cellWidth: 20 },  // Datum
      1: { cellWidth: 18 },  // Auftrag Nr.
      2: { cellWidth: 30 },  // Objekt/Strasse
      3: { cellWidth: 20 },  // Ort
      4: { cellWidth: 12, halign: 'right' },  // Std.
      5: { cellWidth: 12, halign: 'right' },  // Absenzen
      6: { cellWidth: 12, halign: 'right' },  // Überstd.
      7: { cellWidth: 25 },  // Auslagen
      8: { cellWidth: 18, halign: 'right' },  // Auslagen Fr.
      9: { cellWidth: 23 },  // Notizen
    },
    didParseCell: function(data) {
      // Zebrastreifen für bessere Lesbarkeit
      if (data.row.index < tableRows.length && data.row.index % 2 === 1) {
        data.cell.styles.fillColor = [249, 249, 249];
      }

      // Styling für Summenzeile
      const lastRowIndex = tableRows.length;
      if (data.row.index === lastRowIndex) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = COLORS.SECONDARY;
      }

      // Styling für Sollstunden
      if (data.row.index === lastRowIndex + 1) {
        if (data.column.index === 0 || data.column.index === 4) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = COLORS.SECONDARY;
        }
      }
    },
    didDrawPage: function(data) {
      // Fußzeile auf jeder Seite
      const footerY = pageHeight - 10;
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(COLORS.LIGHT_TEXT[0], COLORS.LIGHT_TEXT[1], COLORS.LIGHT_TEXT[2]);
      doc.text('Erstellt mit RapportGenius - www.rapportgenius.app', pageWidth / 2, footerY, { align: 'center' });

      // Seitenzahl
      doc.text(`Seite ${doc.getNumberOfPages()}`, pageWidth - margin, footerY, { align: 'right' });
    }
  });

  // Zusammenfassung am Ende des Dokuments
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  if (finalY < pageHeight - 40) { // Prüfen, ob genug Platz auf der Seite ist
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(COLORS.TEXT[0], COLORS.TEXT[1], COLORS.TEXT[2]);
    doc.text('Zusammenfassung:', margin, finalY);

    doc.setFont('helvetica', 'normal');
    summary.forEach((line, index) => {
      doc.text(line, margin + 5, finalY + 6 + (index * 5));
    });
  }

  return doc;
}

/**
 * Erstellt ein PDF-Dokument und bietet es zum Download an
 * @param reportData Die Daten des Arbeitsrapports
 * @param includeCompanyInfo Ob Firmeninformationen hinzugefügt werden sollen
 */
export function downloadPDFReport(reportData: WorkReportData, includeCompanyInfo: boolean = true): void {
  try {
    const doc = createPDFReport(reportData, includeCompanyInfo);

    // Dateinamen erstellen
    const fileName = `Arbeitsrapport_${reportData.name.replace(/\s+/g, '_')}_${reportData.period.replace(/\s+/g, '_')}.pdf`;

    // PDF herunterladen
    doc.save(fileName);
  } catch (error) {
    console.error('Fehler beim Erstellen der PDF-Datei:', error);
    throw error;
  }
}

/**
 * Erstellt ein PDF und gibt die Daten-URL zurück (für Vorschau)
 * @param reportData Die Daten des Arbeitsrapports
 * @returns Eine Daten-URL des PDF-Dokuments
 */
export function getPDFDataUrl(reportData: WorkReportData): string {
  try {
    const doc = createPDFReport(reportData);
    return doc.output('datauristring');
  } catch (error) {
    console.error('Fehler beim Erstellen der PDF-Vorschau:', error);
    throw error;
  }
}
