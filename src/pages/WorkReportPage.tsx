import { useState, useEffect } from 'react';
import ReportForm, { ReportFormProps } from '@/components/ReportForm';
import WorkReport, { WorkReportProps } from '@/components/WorkReport';
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { BackToDashboardButton } from "@/components/BackToDashboardButton";
import { Download, Mail, Save, FileText } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import { useToast } from "@/components/ui/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { emailService } from '@/services/emailService';
import ReportSender from '@/components/ReportSenderStyled';

interface SavedReport {
  id: string;
  name: string;
  period: string;
  content: any;
  created_at: string;
}

interface WorkReportData {
  name: string;
  period: string;
  entries: any[];
}

interface LocalSavedReport {
  id: string;
  name: string;
  period: string;
  entries: any[];
}

export function WorkReportPage() {
  const [workReportData, setWorkReportData] = useState<WorkReportData>({
    name: "",
    period: "",
    entries: [],
  });
  const [savedReports, setSavedReports] = useState<LocalSavedReport[]>([]);
  const [currentReportId, setCurrentReportId] = useState<string | null>(null);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [selectedReport, setSelectedReport] = useState<SavedReport | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [showReportSender, setShowReportSender] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Lade Benutzer-ID beim Start
  useEffect(() => {
    const loadUserId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    loadUserId();
  }, []);

  const handleReportChange = (updatedReport: any) => {
    setWorkReportData(prev => ({
      ...prev,
      ...updatedReport
    }));
  };

  const handleSave = async () => {
    if (!workReportData) return;
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Nicht eingeloggt');

      const reportToSave = {
        user_id: user.id,
        name: workReportData.name || 'Unbenannter Bericht',
        period: workReportData.period || '',
        content: JSON.stringify(workReportData),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('reports')
        .insert([reportToSave]);

      if (error) throw error;
      
      // Lade die gespeicherten Berichte neu
      const { data: savedReports, error: fetchError } = await supabase
        .from('reports')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      // Aktualisiere den lokalen Speicher
      localStorage.setItem('savedReports', JSON.stringify(savedReports));
      
      setSuccess(true);
      alert('Bericht erfolgreich gespeichert!');
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
      setError(error instanceof Error ? error.message : 'Fehler beim Speichern');
      alert('Fehler beim Speichern: ' + (error instanceof Error ? error.message : 'Unbekannter Fehler'));
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!workReportData || !workReportData.entries || workReportData.entries.length === 0) {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Es gibt keine Daten zum Exportieren."
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Nicht eingeloggt');

      const reportData = workReportData.entries.map(entry => ({
        date: entry.date,
        project: entry.project,
        description: entry.description,
        hours: entry.hours,
        note: entry.note || ''
      }));

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-bericht`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          to: user.email,
          subject: `Wochenrapport: ${workReportData.name} - ${workReportData.period}`,
          userId: user.id,
          reportData,
          format: 'xlsx'
        })
      });

      if (!response.ok) {
        throw new Error('Fehler beim Exportieren des Berichts');
      }

      toast({
        title: "Erfolg",
        description: "Excel-Datei wurde erfolgreich erstellt und heruntergeladen"
      });
    } catch (error) {
      console.error('Fehler beim Exportieren:', error);
      toast({
        variant: "destructive",
        title: "Fehler",
        description: 'Fehler beim Exportieren des Berichts'
      });
    }
  };

  const handleEmail = () => {
    if (!workReportData) return;
    setEmailDialogOpen(true);
  };

  const handleSendEmail = async () => {
    if (!selectedReport) {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: 'Bitte wählen Sie einen Bericht aus'
      });
      return;
    }

    if (!recipientEmail) {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: 'Bitte geben Sie eine E-Mail-Adresse ein'
      });
      return;
    }

    setSendingEmail(true);
    try {
      // Konvertiere den Bericht in das richtige Format für die sendReport-Methode
      const reportData = typeof selectedReport.content === 'string' 
        ? JSON.parse(selectedReport.content) 
        : selectedReport.content;
      
      // Füge E-Mail-Betreff und -Nachricht hinzu
      const reportDataWithEmail = {
        ...reportData,
        emailSubject: `Arbeitsrapport: ${selectedReport.name} - ${selectedReport.period}`,
        emailMessage: `Sehr geehrte Damen und Herren,\n\nanbei erhalten Sie meinen Arbeitsrapport für den Zeitraum ${selectedReport.period}.\n\nMit freundlichen Grüssen,\n${reportData.name || 'Ihr Name'}`
      };
      
      // Sende den Bericht mit der neuen sendReport-Methode
      await emailService.sendReport(
        recipientEmail,
        reportDataWithEmail,
        'excel'
      );
      
      toast({
        title: "Erfolg",
        description: 'Bericht erfolgreich per E-Mail gesendet'
      });
      setEmailDialogOpen(false);
      setRecipientEmail('');
    } catch (error) {
      console.error('Fehler beim Senden der E-Mail:', error);
      toast({
        variant: "destructive",
        title: "Fehler",
        description: error instanceof Error ? error.message : 'Fehler beim Senden der E-Mail'
      });
    } finally {
      setSendingEmail(false);
    }
  };

  // Lade gespeicherte Berichte
  useEffect(() => {
    loadSavedReports();
  }, []);

  const loadSavedReports = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSavedReports(data || []);
    } catch (error) {
      console.error('Fehler beim Laden der gespeicherten Berichte:', error);
      toast({
        variant: "destructive",
        title: "Fehler",
        description: 'Fehler beim Laden der gespeicherten Berichte'
      });
    }
  };

  const convertToXLSX = (report: any) => {
    const wb = XLSX.utils.book_new();
    
    // Erstelle Arbeitsblatt für die Einträge
    const entriesData = report.entries.map((entry: any) => ({
      Datum: entry.date,
      Projekt: entry.project,
      Beschreibung: entry.description,
      Stunden: entry.hours
    }));
    const ws = XLSX.utils.json_to_sheet(entriesData);
    XLSX.utils.book_append_sheet(wb, ws, 'Einträge');

    // Erstelle Arbeitsblatt für die Zusammenfassung
    const summaryData = [{
      'Bericht': report.name,
      'Zeitraum': report.period,
      'Gesamtstunden': report.entries.reduce((sum: number, entry: any) => sum + entry.hours, 0),
      'Notizen': report.notes || ''
    }];
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Zusammenfassung');

    return XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
  };

  return (
    <div className="container mx-auto p-4">
      <BackToDashboardButton />

      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Arbeitsbericht</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <ReportForm onReportGenerated={setWorkReportData} />
        </div>
        <div>
          <WorkReport report={workReportData} onDataChange={handleReportChange} />
        </div>
      </div>

      {workReportData && (
        <div className="mt-4 flex justify-between">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleExport}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Als Excel exportieren
            </Button>
            <Button
              variant="outline"
              onClick={() => setEmailDialogOpen(true)}
              className="flex items-center gap-2"
            >
              <Mail className="h-4 w-4" />
              Per E-Mail senden
            </Button>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate('/saved-reports')}
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              Gespeicherte Berichte
            </Button>

            <Button
              onClick={handleSave}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              Speichern
            </Button>
          </div>
        </div>
      )}

      {emailDialogOpen && userId && (
        <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Arbeitsrapport per E-Mail senden</DialogTitle>
              <DialogDescription>
                Füllen Sie die Felder aus, um den Arbeitsrapport per E-Mail zu versenden.
              </DialogDescription>
            </DialogHeader>
            <ReportSender
              userId={userId}
              reports={workReportData.entries}
              onClose={() => setEmailDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      )}

      {error && (
        <div className="mt-4 p-4 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      {success && (
        <div className="mt-4 p-4 bg-green-100 text-green-700 rounded">
          Bericht erfolgreich gespeichert!
        </div>
      )}
    </div>
  );
} 