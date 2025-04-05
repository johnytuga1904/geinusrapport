import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import WorkReport from "@/components/WorkReport";
import ReportHistory from "@/components/ReportHistory";
import { supabase } from "@/lib/supabase";
import { v4 as uuidv4 } from "uuid";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { 
  SavedReport, 
  isDatabaseReport, 
  isLocalReport, 
  LocalSavedReport, 
  DatabaseSavedReport,
  WorkReportData 
} from "@/types/reports";
import { Save, Download, FileText, Mail, FileSpreadsheet, Eye } from "lucide-react";
import { downloadExcelReport } from "@/utils/excelExport";
import { downloadPDFReport, getPDFDataUrl } from "@/utils/pdfExport";
import { emailService } from "@/services/emailService";
import { toast } from "sonner";

// Einfache Toast-Funktion ohne externe Abhängigkeiten
const showToast = {
  success: (message: string) => {
    console.log(`SUCCESS: ${message}`);
    alert(message);
  },
  error: (message: string) => {
    console.error(`ERROR: ${message}`);
    alert(`Fehler: ${message}`);
  }
};

export default function WorkReportPage() {
  // State für den aktuellen Arbeitsrapport
  const [workReportData, setWorkReportData] = useState<WorkReportData>({
    name: "",
    period: "",
    entries: [],
  });

  // State für gespeicherte Berichte
  const [savedReports, setSavedReports] = useState<LocalSavedReport[]>([]);
  const [currentReportId, setCurrentReportId] = useState<string | null>(null);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);

  // Ref für die PDF-Vorschau
  const pdfPreviewRef = useRef<HTMLIFrameElement>(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string>("");
  const [emailRecipient, setEmailRecipient] = useState<string>("");
  const [emailFormat, setEmailFormat] = useState<'excel' | 'pdf' | 'csv'>('excel');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isSendingEmail, setIsSendingEmail] = useState<boolean>(false);
  const [showPdfPreview, setShowPdfPreview] = useState<boolean>(false);

  // Excel exportieren
  const exportToExcel = async () => {
    if (
      !workReportData ||
      !workReportData.entries ||
      workReportData.entries.length === 0
    ) {
      toast.error("Es gibt keine Daten zum Exportieren.");
      return;
    }

    try {
      setIsExporting(true);
      await downloadExcelReport(workReportData);
      toast.success("Excel-Datei wurde erfolgreich exportiert");
    } catch (error) {
      console.error("Fehler beim Excel-Export:", error);
      toast.error("Fehler beim Exportieren der Excel-Datei");
    } finally {
      setIsExporting(false);
    }
  };

  // PDF exportieren
  const exportToPDF = async () => {
    if (
      !workReportData ||
      !workReportData.entries ||
      workReportData.entries.length === 0
    ) {
      toast.error("Es gibt keine Daten zum Exportieren.");
      return;
    }

    try {
      setIsExporting(true);
      await downloadPDFReport(workReportData);
      toast.success("PDF-Datei wurde erfolgreich exportiert");
    } catch (error) {
      console.error("Fehler beim PDF-Export:", error);
      toast.error("Fehler beim Exportieren der PDF-Datei");
    } finally {
      setIsExporting(false);
    }
  };

  // PDF-Vorschau anzeigen
  const showPDFPreview = async () => {
    if (
      !workReportData ||
      !workReportData.entries ||
      workReportData.entries.length === 0
    ) {
      toast.error("Es gibt keine Daten für die Vorschau.");
      return;
    }

    try {
      setIsExporting(true);
      const dataUrl = getPDFDataUrl(workReportData);
      setPdfPreviewUrl(dataUrl);
      setShowPdfPreview(true);
    } catch (error) {
      console.error("Fehler bei der PDF-Vorschau:", error);
      toast.error("Fehler beim Erstellen der PDF-Vorschau");
    } finally {
      setIsExporting(false);
    }
  };

  // E-Mail-Dialog öffnen
  const sendEmail = () => {
    if (
      !workReportData ||
      !workReportData.entries ||
      workReportData.entries.length === 0
    ) {
      toast.error("Es gibt keine Daten zum Versenden.");
      return;
    }
    
    // E-Mail-Dialog öffnen
    setEmailDialogOpen(true);
  };

  // E-Mail mit Anhang senden
  const handleSendEmail = async () => {
    if (!emailRecipient) {
      toast.error("Bitte geben Sie eine E-Mail-Adresse ein.");
      return;
    }

    try {
      setIsSendingEmail(true);
      
      await emailService.sendReport(
        emailRecipient,
        workReportData,
        emailFormat
      );
      
      toast.success(`Arbeitsrapport wurde als ${emailFormat.toUpperCase()} an ${emailRecipient} gesendet.`);
      setEmailDialogOpen(false);
    } catch (error) {
      console.error("Fehler beim Senden der E-Mail:", error);
      toast.error(`Fehler beim Senden der E-Mail: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    } finally {
      setIsSendingEmail(false);
    }
  };

  const saveReport = () => {
    if (!workReportData) {
      alert("Es gibt keine Daten zum Speichern.");
      return;
    }

    const reportToSave: LocalSavedReport = {
      id: currentReportId || uuidv4(),
      name: workReportData.name || "Unbenannter Bericht",
      period: workReportData.period || "Kein Zeitraum",
      date: new Date().toISOString(),
      entries: workReportData.entries || [],
    };

    // Get existing reports
    const existingReportsStr = localStorage.getItem("savedReports");
    let existingReports: LocalSavedReport[] = [];

    if (existingReportsStr) {
      existingReports = JSON.parse(existingReportsStr);

      // If editing an existing report, remove the old version
      if (currentReportId) {
        existingReports = existingReports.filter(
          (r) => r.id !== currentReportId,
        );
      }
    }

    // Add the new/updated report
    existingReports.push(reportToSave);

    // Save back to localStorage
    localStorage.setItem("savedReports", JSON.stringify(existingReports));

    // Update current report ID
    setCurrentReportId(reportToSave.id);

    showToast.success("Bericht wurde gespeichert!");
  };

  // Adapter-Funktion, um die verschiedenen SavedReport-Typen zu konvertieren
  const handleLoadReport = (report: SavedReport) => {
    if (isDatabaseReport(report)) {
      try {
        // Für Berichte aus der Datenbank
        const parsedContent = JSON.parse(report.content);
        setWorkReportData({
          name: report.name,
          period: report.period,
          date: report.date,
          entries: parsedContent.entries || []
        });
      } catch (error) {
        console.error("Fehler beim Parsen des Berichts:", error);
        showToast.error("Der Bericht konnte nicht geladen werden.");
      }
    } else {
      // Für lokale Berichte
      setWorkReportData({
        name: report.name,
        period: report.period,
        date: report.date,
        entries: report.entries
      });
    }
  };

  // Lade gespeicherte Berichte aus der Datenbank
  useEffect(() => {
    const fetchDatabaseReports = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          return;
        }

        const { data, error } = await supabase
          .from('reports')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Fehler beim Laden der Berichte:', error);
          return;
        }

        // Lokale Berichte aus den Datenbankberichten laden
        const localReports = data.map(report => {
          try {
            const content = JSON.parse(report.content);
            return {
              id: report.id,
              name: report.name,
              period: report.period,
              date: report.created_at,
              entries: content.entries || []
            };
          } catch (e) {
            console.error('Fehler beim Parsen des Berichtsinhalts:', e);
            return null;
          }
        }).filter(Boolean) as LocalSavedReport[];
        
        setSavedReports(prevReports => {
          // Kombiniere lokale und Datenbankberichte, entferne Duplikate
          const combinedReports = [...prevReports];
          localReports.forEach(report => {
            if (!combinedReports.some(r => r.id === report.id)) {
              combinedReports.push(report);
            }
          });
          return combinedReports;
        });
      } catch (error) {
        console.error('Fehler beim Laden der Berichte aus der Datenbank:', error);
      }
    };

    fetchDatabaseReports();
  }, []);

  // Load saved reports from localStorage when component mounts
  useEffect(() => {
    const reports = localStorage.getItem("savedReports");
    if (reports) {
      try {
        setSavedReports(JSON.parse(reports));
      } catch (error) {
        console.error("Error parsing saved reports:", error);
      }
    }
  }, []);

  // Add a CSS class to maintain background color after loading a report
  useEffect(() => {
    // Set the background color of the body element
    document.body.style.backgroundColor = "#ffffff";
    
    // Clean up function to reset when component unmounts
    return () => {
      document.body.style.backgroundColor = "";
    };
  }, []);

  // Calculate total hours
  const calculateTotalHours = (entries: any[]) => {
    return entries.reduce(
      (total: number, entry: any) => {
        // Sicherstellen, dass wir eine Zahl haben, egal welchen Typ entry.hours hat
        const hours = typeof entry.hours === 'number' 
          ? entry.hours 
          : parseFloat(entry.hours || '0');
        return total + hours;
      },
      0
    );
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto p-3 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 text-center sm:text-left">
            Arbeitsrapport-Generator
          </h1>
          <div className="flex flex-wrap justify-center sm:justify-end gap-3">
            <ReportHistory 
              onLoadReport={handleLoadReport} 
              iconOnly={true} 
            />
            <Button 
              variant="outline" 
              onClick={saveReport} 
              className="inline-flex items-center justify-center p-2 border-blue-600 text-blue-600 hover:bg-blue-50 transition-colors" 
              title="Speichern"
              disabled={isExporting || isSendingEmail}
            >
              <Save className="h-5 w-5" />
            </Button>
            <Button 
              variant="outline" 
              onClick={exportToExcel} 
              className="inline-flex items-center justify-center p-2 border-blue-600 text-blue-600 hover:bg-blue-50 transition-colors" 
              title="Excel exportieren"
              disabled={isExporting || isSendingEmail}
            >
              <FileSpreadsheet className="h-5 w-5" />
            </Button>
            <Button 
              variant="outline" 
              onClick={exportToPDF} 
              className="inline-flex items-center justify-center p-2 border-blue-600 text-blue-600 hover:bg-blue-50 transition-colors" 
              title="PDF exportieren"
              disabled={isExporting || isSendingEmail}
            >
              <FileText className="h-5 w-5" />
            </Button>
            <Button 
              variant="outline" 
              onClick={showPDFPreview} 
              className="inline-flex items-center justify-center p-2 border-blue-600 text-blue-600 hover:bg-blue-50 transition-colors" 
              title="PDF-Vorschau"
              disabled={isExporting || isSendingEmail}
            >
              <Eye className="h-5 w-5" />
            </Button>
            <Button 
              variant="outline" 
              onClick={sendEmail} 
              className="inline-flex items-center justify-center p-2 border-blue-600 text-blue-600 hover:bg-blue-50 transition-colors" 
              title="Per E-Mail senden"
              disabled={isExporting || isSendingEmail}
            >
              <Mail className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <WorkReport
          report={workReportData || {}}
          initialData={workReportData}
          onDataChange={(data) => setWorkReportData(data)}
        />

        {/* PDF-Vorschau Dialog */}
        <Dialog open={showPdfPreview} onOpenChange={setShowPdfPreview}>
          <DialogContent className="sm:max-w-[800px] max-h-[90vh] bg-white">
            <DialogHeader>
              <DialogTitle>PDF-Vorschau</DialogTitle>
              <DialogDescription>
                Vorschau des PDF-Dokuments
              </DialogDescription>
            </DialogHeader>
            <div className="h-[70vh] w-full overflow-auto">
              <iframe 
                ref={pdfPreviewRef}
                src={pdfPreviewUrl} 
                className="w-full h-full border-0"
                title="PDF-Vorschau"
              />
            </div>
            <DialogFooter>
              <Button onClick={() => setShowPdfPreview(false)}>Schließen</Button>
              <Button onClick={exportToPDF} variant="default">Herunterladen</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Email Dialog */}
        <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
          <DialogContent className="sm:max-w-[600px] bg-white">
            <DialogHeader>
              <DialogTitle className="text-xl text-gray-800">Bericht per E-Mail senden</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-Mail-Adresse</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="empfaenger@beispiel.de"
                  value={emailRecipient}
                  onChange={(e) => setEmailRecipient(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="format">Anhang-Format</Label>
                <div className="flex gap-4">
                  <div className="flex items-center">
                    <input 
                      type="radio" 
                      id="excel" 
                      name="format" 
                      value="excel"
                      checked={emailFormat === 'excel'}
                      onChange={() => setEmailFormat('excel')}
                      className="mr-2"
                    />
                    <Label htmlFor="excel">Excel</Label>
                  </div>
                  <div className="flex items-center">
                    <input 
                      type="radio" 
                      id="pdf" 
                      name="format" 
                      value="pdf"
                      checked={emailFormat === 'pdf'}
                      onChange={() => setEmailFormat('pdf')}
                      className="mr-2"
                    />
                    <Label htmlFor="pdf">PDF</Label>
                  </div>
                  <div className="flex items-center">
                    <input 
                      type="radio" 
                      id="csv" 
                      name="format" 
                      value="csv"
                      checked={emailFormat === 'csv'}
                      onChange={() => setEmailFormat('csv')}
                      className="mr-2"
                    />
                    <Label htmlFor="csv">CSV</Label>
                  </div>
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setEmailDialogOpen(false)}>Abbrechen</Button>
              <Button 
                onClick={handleSendEmail} 
                disabled={isSendingEmail}
              >
                {isSendingEmail ? 'Senden...' : 'Senden'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
