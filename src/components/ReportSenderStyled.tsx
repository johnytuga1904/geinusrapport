import { useState, useEffect } from 'react';
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { emailService } from "@/services/emailService";

interface ReportEntry {
  date: string;
  project: string;
  description: string;
  hours: number;
  note: string;
}

interface ReportSenderProps {
  userId: string;
  reports: ReportEntry[];
  onClose: () => void;
}

export default function ReportSender({ userId, reports, onClose }: ReportSenderProps) {
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('Wochenrapport');
  const [format, setFormat] = useState<"xlsx" | "pdf">("xlsx");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);

  // PDF-Vorschau generieren
  useEffect(() => {
    if (format === 'pdf') {
      const doc = new jsPDF();
      
      // Titel
      doc.setFontSize(16);
      doc.text('Wochenrapport', 14, 20);
      
      // Untertitel
      doc.setFontSize(12);
      (doc as any).text(`Erstellt am: ${new Date().toLocaleDateString()}`, 14, 30);
      
      // Tabelle
      (doc as any).autoTable({
        startY: 40,
        head: [['Datum', 'Projekt', 'Beschreibung', 'Stunden', 'Bemerkung']],
        body: reports.map(entry => [
          entry.date,
          entry.project,
          entry.description,
          entry.hours.toString(),
          entry.note || ''
        ]),
        styles: {
          fontSize: 10,
          cellPadding: 3,
        },
        headStyles: {
          fillColor: [66, 139, 202],
          textColor: 255,
          fontStyle: 'bold'
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245]
        }
      });

      const pdfBlob = doc.output('blob');
      const url = URL.createObjectURL(pdfBlob);
      setPdfPreviewUrl(url);

      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setPdfPreviewUrl(null);
    }
  }, [format, reports]);

  const sendReport = async () => {
    if (!email || reports.length === 0) {
      setError('Bitte eine E-Mail eingeben und mindestens einen Bericht haben.');
      return;
    }

    try {
      // Annahme: employeeName und clientName sind im Scope verfügbar
      const employeeName = 'Platzhalter Mitarbeitername'; // TODO: Ersetze durch tatsächlichen Mitarbeiternamen
      const clientName = 'Platzhalter Kundenname'; // TODO: Ersetze durch tatsächlichen Kundennamen
      const currentDate = new Date();
      const month = (currentDate.getMonth() + 1).toString().padStart(2, '0'); // Monat (01-12)
      const year = currentDate.getFullYear().toString(); // Jahr

      // Gesamtstunden berechnen
      const totalHours = reports.reduce((sum, entry) => sum + entry.hours, 0);

      // Erstelle ein WorkReportData-Objekt aus den Berichten
      const workReportData = {
        employeeName: employeeName, // Verwende die Variable von oben
        client: clientName,         // Verwende die Variable von oben
        month: month,               // Verwende die Variable von oben
        year: year,                 // Verwende die Variable von oben
        totalHours: totalHours,       // Verwende die berechnete Summe
        entries: reports.map(entry => ({
          date: entry.date,
          orderNumber: '',
          object: entry.project,
          location: '',
          hours: entry.hours,
          absences: 0,
          overtime: 0,
          expenses: '',
          expenseAmount: 0,
          notes: entry.note || entry.description || ''
        })),
        emailSubject: subject,
        emailMessage: `Sehr geehrte Damen und Herren,\n\nanbei erhalten Sie meinen Wochenrapport.\n\nMit freundlichen Grüssen`
      };

      // Verwende den verbesserten E-Mail-Service
      await emailService.sendReport(email, workReportData, format === 'pdf' ? 'pdf' : 'excel');

      setSuccess(true);
    } catch (error) {
      console.error('Fehler beim Senden:', error);
      setError(error instanceof Error ? error.message : "Fehler beim Senden des Berichts");
    }
  };

  const handleSend = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await sendReport();
    } catch (error) {
      console.error('Fehler beim Senden:', error);
      setError("Fehler beim Senden des Berichts");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">Bericht per E-Mail senden</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Format
          </label>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value as "xlsx" | "pdf")}
            className="w-full p-2 border rounded"
          >
            <option value="xlsx">Excel (mit Layout)</option>
            <option value="pdf">PDF</option>
          </select>
        </div>

        {format === 'pdf' && pdfPreviewUrl && (
          <div className="border rounded p-2">
            <p className="text-sm font-medium text-gray-700 mb-2">PDF-Vorschau:</p>
            <iframe
              src={pdfPreviewUrl}
              className="w-full h-[400px] border-0"
              title="PDF-Vorschau"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            E-Mail
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-2 border rounded"
            placeholder="beispiel@firma.ch"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Betreff
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>

        {error && (
          <div className="text-red-500 text-sm">{error}</div>
        )}

        {success && (
          <div className="text-green-500 text-sm">
            Bericht wurde erfolgreich gesendet!
          </div>
        )}

        <div className="flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Abbrechen
          </button>
          <button
            onClick={handleSend}
            disabled={loading || !email}
            className={`px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 ${
              loading ? "cursor-not-allowed" : ""
            }`}
          >
            {loading ? "Wird gesendet..." : "Senden"}
          </button>
        </div>
      </div>
    </div>
  );
} 