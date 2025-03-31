import { useState, useEffect, useCallback, memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import DateRangePicker from "./DateRangePicker";
import ObjectAutocomplete from "./ObjectAutocomplete";
import LocationAutocomplete from "./LocationAutocomplete";
import { Edit, Trash2, CalendarIcon, MessageSquare, FileText, Download, Save } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { emailService } from "@/services/emailService";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

// Fallback für toast, falls sonner nicht verfügbar ist
const showNotification = (message: string, type: 'success' | 'error' | 'info') => {
  try {
    // Versuche, toast aus sonner zu importieren
    const { toast } = require('sonner');
    toast[type](message);
  } catch (error) {
    // Fallback: Verwende alert, wenn sonner nicht verfügbar ist
    console.log(`${type.toUpperCase()}: ${message}`);
    if (type === 'error') {
      alert(`Fehler: ${message}`);
    } else {
      alert(message);
    }
  }
};

interface WorkEntry {
  date: Date;
  orderNumber: string;
  location: string;
  object: string;
  hours: number;
  absences: number;
  overtime: number;
  expenses: string;
  expenseAmount: number;
  notes?: string;
}

export interface WorkReportProps {
  report: any;
  onDataChange?: (data: any) => void;
  initialData?: any;
}

// Memoized table row component to prevent unnecessary re-renders
const EntryRow = memo(
  ({
    entry,
    index,
    onEdit,
    onDelete,
  }: {
    entry: WorkEntry;
    index: number;
    onEdit: (index: number, entry: WorkEntry) => void;
    onDelete: (index: number) => void;
  }) => {
    const [notesDialogOpen, setNotesDialogOpen] = useState(false);
    const [tempNotes, setTempNotes] = useState(entry.notes || "");
    const [expensesDialogOpen, setExpensesDialogOpen] = useState(false);
    const [tempExpenses, setTempExpenses] = useState(entry.expenses || "");
    
    const handleSaveNotes = () => {
      onEdit(index, { ...entry, notes: tempNotes });
      setNotesDialogOpen(false);
    };
    
    const handleSaveExpenses = () => {
      onEdit(index, { ...entry, expenses: tempExpenses });
      setExpensesDialogOpen(false);
    };
    
    return (
      <TableRow>
        <TableCell className="border border-gray-200">
          <div className="relative">
            <Popover>
              <PopoverTrigger asChild>
                <div className="flex">
                  <Input
                    value={format(entry.date, "dd.MM.yyyy")}
                    readOnly
                    className="pr-10 cursor-pointer"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    className="absolute right-0 px-3 h-full"
                  >
                    <CalendarIcon className="h-4 w-4" />
                  </Button>
                </div>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={entry.date}
                  onSelect={(date) => {
                    onEdit(index, { ...entry, date: date || new Date() });
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </TableCell>
        <TableCell className="border border-gray-200">
          {entry.orderNumber}
        </TableCell>
        <TableCell className="border border-gray-200 w-64">{entry.object}</TableCell>
        <TableCell className="border border-gray-200">{entry.location}</TableCell>
        <TableCell className="border border-gray-200 w-14 text-center">
          {entry.hours.toFixed(2)}
        </TableCell>
        <TableCell className="border border-gray-200 w-14 text-center">
          {entry.absences > 0 ? entry.absences.toFixed(2) : ""}
        </TableCell>
        <TableCell className="border border-gray-200 w-14 text-center">
          {entry.overtime > 0 ? entry.overtime.toFixed(2) : ""}
        </TableCell>
        <TableCell className="border border-gray-200">
          <div className="flex items-center gap-1">
            <span className="truncate max-w-[150px] cursor-pointer" onClick={() => {
                setTempExpenses(entry.expenses || "");
                setExpensesDialogOpen(true);
              }}>
              {entry.expenses || ""}
            </span>
            
            <Dialog open={expensesDialogOpen} onOpenChange={setExpensesDialogOpen}>
              <DialogContent className="sm:max-w-[425px] bg-white">
                <DialogHeader>
                  <DialogTitle className="text-gray-800">Auslagen und Bemerkungen bearbeiten</DialogTitle>
                </DialogHeader>
                <Textarea 
                  value={tempExpenses} 
                  onChange={(e) => setTempExpenses(e.target.value)}
                  className="min-h-[150px] border-gray-300"
                  placeholder="Auslagen und Bemerkungen hier eingeben..."
                />
                <DialogFooter>
                  <Button type="submit" onClick={handleSaveExpenses} className="bg-blue-600 hover:bg-blue-700 text-white">
                    Speichern
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </TableCell>
        <TableCell className="border border-gray-200 w-16 text-center">
          {entry.expenseAmount > 0 ? entry.expenseAmount.toFixed(2) : ""}
        </TableCell>
        <TableCell className="border border-gray-200 w-32">
          <div className="flex items-center gap-1">
            <span className="truncate max-w-[100px] cursor-pointer" onClick={() => {
                setTempNotes(entry.notes || "");
                setNotesDialogOpen(true);
              }}>
              {entry.notes || ""}
            </span>
            
            <Dialog open={notesDialogOpen} onOpenChange={setNotesDialogOpen}>
              <DialogContent className="sm:max-w-[425px] bg-white">
                <DialogHeader>
                  <DialogTitle className="text-gray-800">Notizen bearbeiten</DialogTitle>
                </DialogHeader>
                <Textarea 
                  value={tempNotes} 
                  onChange={(e) => setTempNotes(e.target.value)}
                  className="min-h-[150px] border-gray-300"
                  placeholder="Notizen hier eingeben..."
                />
                <DialogFooter>
                  <Button type="submit" onClick={handleSaveNotes} className="bg-blue-600 hover:bg-blue-700 text-white">
                    Speichern
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </TableCell>
        <TableCell className="border border-gray-200">
          <div className="flex gap-1 justify-end">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => {
                onEdit(index, entry);
              }}
            >
              <Edit className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => onDelete(index)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    );
  },
);

EntryRow.displayName = "EntryRow";

// Default empty entry
const emptyEntry: WorkEntry = {
  date: new Date(),
  orderNumber: "",
  location: "",
  object: "",
  hours: 0,
  absences: 0,
  overtime: 0,
  expenses: "",
  expenseAmount: 0,
  notes: "",
};

const WorkReport: React.FC<WorkReportProps> = ({ report, onDataChange, initialData }) => {
  const [name, setName] = useState<string>("");
  const [period, setPeriod] = useState<string>("");
  const [entries, setEntries] = useState<WorkEntry[]>([]);
  const [newEntry, setNewEntry] = useState<WorkEntry>({ ...emptyEntry });
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [tempNotes, setTempNotes] = useState("");
  const [expensesDialogOpen, setExpensesDialogOpen] = useState(false);
  const [tempExpenses, setTempExpenses] = useState("");
  
  // Update state when report changes
  useEffect(() => {
    if (report) {
      setName(report.name || "");
      setPeriod(report.period || "");
      setEntries(report.entries || []);
    }
  }, [report]);

  // Calculate totals - memoize calculations to prevent recalculations on every render
  const totals = useCallback(() => {
    const hours = entries.reduce((sum, entry) => sum + entry.hours, 0);
    const absences = entries.reduce((sum, entry) => sum + entry.absences, 0);
    const overtime = entries.reduce((sum, entry) => sum + entry.overtime, 0);
    const expenses = entries.reduce(
      (sum, entry) => sum + entry.expenseAmount,
      0,
    );
    const requiredHours = hours + absences;

    return { hours, absences, overtime, expenses, requiredHours };
  }, [entries]);

  const {
    hours: totalHours,
    absences: totalAbsences,
    overtime: totalOvertime,
    expenses: totalExpenses,
    requiredHours: totalRequiredHours,
  } = totals();

  // Update parent component when data changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (onDataChange) {
        onDataChange({
          name,
          period,
          entries,
        });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [name, period, entries, onDataChange]);

  // Memoize handlers to prevent recreating functions on each render
  const handleAddEntry = useCallback(() => {
    if (
      newEntry.date ||
      newEntry.orderNumber ||
      newEntry.location ||
      newEntry.object ||
      newEntry.hours > 0 ||
      newEntry.absences > 0 ||
      newEntry.overtime > 0 ||
      newEntry.expenses ||
      newEntry.expenseAmount > 0 ||
      newEntry.notes
    ) {
      // Finde den richtigen Index basierend auf dem Datum
      const insertIndex = entries.findIndex(entry => 
        new Date(entry.date) > new Date(newEntry.date)
      );
      
      // Wenn kein passender Index gefunden wurde, füge am Ende ein
      const finalIndex = insertIndex === -1 ? entries.length : insertIndex;
      
      // Erstelle eine neue Liste mit dem Eintrag an der richtigen Position
      const newEntries = [...entries];
      newEntries.splice(finalIndex, 0, { ...newEntry });
      
      setEntries(newEntries);
      setNewEntry({ ...emptyEntry });
    }
  }, [newEntry, entries]);

  const handleEditEntry = useCallback(
    (index: number, entryToEdit: WorkEntry) => {
      // Entferne den Eintrag aus der Liste
      const updatedEntries = entries.filter((_, i) => i !== index);
      
      // Finde den richtigen Index basierend auf dem Datum
      const insertIndex = updatedEntries.findIndex(entry => 
        new Date(entry.date) > new Date(entryToEdit.date)
      );
      
      // Wenn kein passender Index gefunden wurde, füge am Ende ein
      const finalIndex = insertIndex === -1 ? updatedEntries.length : insertIndex;
      
      // Füge den bearbeiteten Eintrag an der richtigen Position ein
      updatedEntries.splice(finalIndex, 0, entryToEdit);
      
      setEntries(updatedEntries);
      setNewEntry({ ...emptyEntry });
    },
    [entries],
  );

  const handleDeleteEntry = useCallback((index: number) => {
    setEntries((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Handle input changes for the new entry
  const handleNewEntryChange = useCallback(
    (field: keyof WorkEntry, value: any) => {
      setNewEntry((prev) => ({
        ...prev,
        [field]: value,
      }));
    },
    [],
  );

  // Handle date input with special formatting
  const handleDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      let dateValue = e.target.value;

      // If user enters just a day number (1-31)
      if (/^\d{1,2}$/.test(dateValue)) {
        const day = parseInt(dateValue, 10);
        if (day >= 1 && day <= 31) {
          // Get the selected period from localStorage
          const periodStart = localStorage.getItem("periodStart")
            ? new Date(localStorage.getItem("periodStart") || "")
            : null;

          if (periodStart) {
            const month = format(periodStart, "MMMM");
            const year = format(periodStart, "yyyy");

            // Format the day with leading zero if needed
            const formattedDay = day.toString().padStart(2, "0");
            dateValue = `${formattedDay}. ${month} ${year}`;
          }
        }
      }

      handleNewEntryChange("date", dateValue);
    },
    [handleNewEntryChange],
  );

  const handleSaveNotes = () => {
    handleNewEntryChange("notes", tempNotes);
    setNotesDialogOpen(false);
  };

  const handleSaveExpenses = () => {
    handleNewEntryChange("expenses", tempExpenses);
    setExpensesDialogOpen(false);
  };

  // CSV-Export-Funktion
  const exportToCSV = async () => {
    try {
      // CSV-Header mit Berichtsinformationen
      let csvContent = "Arbeitsrapport\n";
      csvContent += `Name: ${name}\n`;
      csvContent += `Zeitraum: ${period}\n\n`;
      
      // CSV-Header für die Tabelle
      csvContent += "Datum,Auftrag Nr.,Objekt oder Strasse,Ort,Std.,Absenzen,Überstd.,Auslagen und Bemerkungen,Auslagen Fr.,Notizen\n";
      
      // CSV-Daten aus Einträgen
      entries.forEach(entry => {
        const formattedDate = format(entry.date, "dd.MM.yyyy");
        const row = [
          formattedDate,
          entry.orderNumber,
          entry.object,
          entry.location,
          entry.hours.toString().replace('.', ','),
          entry.absences.toString().replace('.', ','),
          entry.overtime.toString().replace('.', ','),
          `"${entry.expenses.replace(/"/g, '""')}"`,
          entry.expenseAmount.toString().replace('.', ','),
          `"${entry.notes ? entry.notes.replace(/"/g, '""') : ''}"`
        ];
        csvContent += row.join(',') + '\n';
      });
      
      // Zusammenfassung hinzufügen
      csvContent += `\nTotal,,,,${totalHours.toString().replace('.', ',')},${totalAbsences.toString().replace('.', ',')},${totalOvertime.toString().replace('.', ',')},,,${totalExpenses.toString().replace('.', ',')}\n`;
      csvContent += `Total Sollstunden,,,,${totalRequiredHours.toString().replace('.', ',')}\n`;
      
      // Generiere einen Dateinamen
      const fileName = `Arbeitsrapport_${name.replace(/\s+/g, '_')}_${period.replace(/\s+/g, '_')}.csv`;
      
      // Speichere die CSV-Datei in der Datenbank
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        showNotification("Sie müssen angemeldet sein, um CSV-Dateien zu speichern", 'error');
        return;
      }
      
      // Erstelle einen Blob für den Download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      
      // Aktuelles Datum für die Datenbank
      const currentDate = new Date().toISOString().split('T')[0];
      
      // Bereite die Berichtsdaten für die Speicherung vor
      const reportData = {
        user_id: user.id,
        name: name + " (CSV-Export)",
        period: period,
        date: currentDate,
        content: JSON.stringify({
          csv_content: csvContent,
          entries: entries,
          total_hours: totalHours,
          total_absences: totalAbsences,
          total_overtime: totalOvertime,
          total_expenses: totalExpenses,
          total_required_hours: totalRequiredHours,
          is_csv_export: true
        }),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      console.log("Speichere CSV-Bericht in der Datenbank:", reportData);
      
      // Speichere die CSV-Datei in der reports-Tabelle
      const { data, error } = await supabase
        .from('reports')
        .insert(reportData);
      
      if (error) {
        console.error("Fehler beim Speichern der CSV-Datei in der Datenbank:", error);
        showNotification("Fehler beim Speichern der CSV-Datei in der Datenbank", 'error');
        return;
      }
      
      // Biete die Datei auch zum Download an
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showNotification("CSV-Datei wurde erfolgreich gespeichert und exportiert", 'success');
    } catch (error) {
      console.error("Fehler beim CSV-Export:", error);
      showNotification("Fehler beim Exportieren der CSV-Datei", 'error');
    }
  };

  // E-Mail-Versand-Funktion
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [exportFormat, setExportFormat] = useState<'csv' | 'excel'>('csv');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [savedReports, setSavedReports] = useState<any[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  // Lade gespeicherte Berichte für den Dialog
  const loadSavedReports = async () => {
    try {
      setIsLoadingReports(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        showNotification("Sie müssen angemeldet sein, um gespeicherte Berichte zu laden", 'error');
        return;
      }

      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Fehler beim Laden der gespeicherten Berichte:", error);
        showNotification("Fehler beim Laden der gespeicherten Berichte", 'error');
        return;
      }

      setSavedReports(data || []);
    } catch (error) {
      console.error("Fehler beim Laden der gespeicherten Berichte:", error);
      showNotification("Fehler beim Laden der gespeicherten Berichte", 'error');
    } finally {
      setIsLoadingReports(false);
    }
  };

  // Öffne den E-Mail-Dialog
  const openEmailDialog = () => {
    loadSavedReports();
    setEmailDialogOpen(true);
  };

  // Generiere CSV-Inhalt aus dem Bericht
  const generateCSVContent = (report: any) => {
    try {
      // Versuche zuerst, den CSV-Inhalt aus dem gespeicherten Bericht zu extrahieren
      const content = JSON.parse(report.content);
      if (content.csv_content) {
        return content.csv_content;
      }

      // Wenn kein CSV-Inhalt vorhanden ist, generiere ihn aus den Einträgen
      let reportEntries = [];
      if (content.entries) {
        reportEntries = content.entries;
      } else if (typeof content === 'string') {
        // Fallback für ältere Berichte
        const parsedContent = JSON.parse(content);
        reportEntries = parsedContent.entries || [];
      }

      // CSV-Header
      let csvContent = "Datum,Auftrag Nr.,Objekt oder Strasse,Ort,Std.,Absenzen,Überstd.,Auslagen und Bemerkungen,Auslagen Fr.,Notizen\n";
      
      // CSV-Daten aus Einträgen
      reportEntries.forEach((entry: any) => {
        const formattedDate = typeof entry.date === 'string' ? entry.date : format(new Date(entry.date), "dd.MM.yyyy");
        const row = [
          formattedDate,
          entry.orderNumber || '',
          entry.object || '',
          entry.location || '',
          (entry.hours || 0).toString().replace('.', ','),
          (entry.absences || 0).toString().replace('.', ','),
          (entry.overtime || 0).toString().replace('.', ','),
          `"${(entry.expenses || '').replace(/"/g, '""')}"`,
          (entry.expenseAmount || 0).toString().replace('.', ','),
          `"${entry.notes ? entry.notes.replace(/"/g, '""') : ''}"`
        ];
        csvContent += row.join(',') + '\n';
      });
      
      return csvContent;
    } catch (error) {
      console.error("Fehler beim Generieren des CSV-Inhalts:", error);
      throw new Error("Fehler beim Generieren des CSV-Inhalts");
    }
  };

  // Sende den Bericht per E-Mail
  const sendReportByEmail = async () => {
    // Validierung
    if (!selectedReportId) {
      toast.error('Bitte wählen Sie einen Bericht aus');
      return;
    }

    if (!recipientEmail) {
      toast.error('Bitte geben Sie eine E-Mail-Adresse ein');
      return;
    }

    setIsLoading(true);
    setEmailSent(false);

    try {
      // Ausgewählten Bericht finden
      const selectedReport = savedReports.find(report => report.id === selectedReportId);
      if (!selectedReport) {
        throw new Error('Ausgewählter Bericht wurde nicht gefunden');
      }

      // CSV generieren
      const csvContent = generateCSVContent(selectedReport);
      console.log(`CSV-Datei generiert mit Länge: ${csvContent.length}`);

      // Dateinamen erstellen
      const filename = `Arbeitsrapport_${selectedReport.name.replace(/\s+/g, '_')}_${selectedReport.period.replace(/\s+/g, '_')}.csv`;
      console.log(`Dateiname: ${filename}`);

      // Temporär: Datei direkt herunterladen und E-Mail-Dialog anzeigen
      toast.info('Die Edge-Funktion für E-Mail ist zurzeit nicht verfügbar. Bericht wird als Datei heruntergeladen.');
      
      // BOM für Excel-Kompatibilität hinzufügen und als Uint8Array vorbereiten
      const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
      const csvContentBytes = new TextEncoder().encode(csvContent);
      const fileContent = new Uint8Array([...bom, ...csvContentBytes]);
      
      // Datei herunterladen
      await downloadFile(fileContent, filename, 'text/csv;charset=utf-8');
      
      // E-Mail-Client-Öffnen-Dialog anzeigen
      const confirmed = window.confirm(
        `Der Bericht wurde als Datei heruntergeladen.\n\nMöchten Sie Ihr E-Mail-Programm öffnen, um die Datei an ${recipientEmail} zu senden?`
      );
      
      if (confirmed) {
        // E-Mail-Client mit Mailto-Link öffnen
        const emailSubject = `Arbeitsrapport ${selectedReport.name} (${selectedReport.period})`;
        const emailBody = 
          `Anbei finden Sie den Arbeitsrapport für ${selectedReport.name} für den Zeitraum ${selectedReport.period}.\n\n` +
          `Bitte fügen Sie die heruntergeladene CSV-Datei als Anhang hinzu.`;
        
        const mailtoLink = `mailto:${recipientEmail}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
        window.open(mailtoLink, '_blank');
      }
      
      setEmailSent(true);
      setRecipientEmail('');
      setIsLoading(false);
    } catch (error: any) {
      console.error('Fehler beim Vorbereiten der E-Mail:', error);
      toast.error(`Fehler: ${error.message}`);
      setIsLoading(false);
    }
  };

  // Hilfsfunktion zum Konvertieren von Blob zu Base64
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result);
      };
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(blob);
    });
  };
  
  // Hilfsfunktion zum Herunterladen einer Datei
  const downloadFile = async (content: Uint8Array, fileName: string, contentType: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      try {
        const blob = new Blob([content], { type: contentType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        
        // Kurze Verzögerung, um sicherzustellen, dass der Download startet
        setTimeout(() => {
          URL.revokeObjectURL(url);
          document.body.removeChild(link);
          showNotification("Der Bericht wurde als Datei heruntergeladen", 'success');
          resolve();
        }, 100);
      } catch (error) {
        console.error("Fehler beim Herunterladen der Datei:", error);
        showNotification("Fehler beim Herunterladen der Datei", 'error');
        reject(error);
      }
    });
  };
  
  // Hilfsfunktion für den Fallback-Download
  const tryDownloadFallback = (reportId: string | null, reports: any[]) => {
    try {
      if (reportId) {
        const report = reports.find(r => r.id === reportId);
        if (report) {
          // Generiere den CSV-Inhalt neu für den Download
          const fallbackCsvContent = generateCSVContent(report);
          const fallbackFilename = `Arbeitsrapport_${report.name.replace(/\s+/g, '_')}_${report.period.replace(/\s+/g, '_')}.csv`;
          
          // Erstelle die Datei und lade sie herunter
          downloadFile(
            new Uint8Array([...new Uint8Array([0xEF, 0xBB, 0xBF]), ...new TextEncoder().encode(fallbackCsvContent)]),
            fallbackFilename, 
            'text/csv;charset=utf-8'
          );
          toast.info('Bericht wurde stattdessen als Datei heruntergeladen');
        }
      }
    } catch (fallbackError) {
      console.error('Fehler beim Herunterladen des Berichts:', fallbackError);
    }
  };
  
  return (
    <div className="space-y-4">
      <Card className="shadow-md bg-white border-0">
        <CardHeader className="px-4 sm:px-6 pb-2">
          <CardTitle className="text-xl text-gray-800">Arbeitsrapport</CardTitle>
        </CardHeader>
        <CardContent className="px-2 sm:px-6 pb-6">
          <div className="grid gap-4 sm:grid-cols-2 mb-6">
            <div className="space-y-2">
              <Label htmlFor="report-name" className="text-sm font-medium text-gray-700">
                Name
              </Label>
              <Input
                id="report-name"
                placeholder="Name des Berichts"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="report-period" className="text-sm font-medium text-gray-700">
                Zeitraum
              </Label>
              <DateRangePicker
                value={period}
                onChange={setPeriod}
                placeholder="Zeitraum auswählen"
              />
            </div>
          </div>

          <div className="overflow-x-auto -mx-2 sm:mx-0 rounded-md border border-gray-200">
            <div className="inline-block min-w-full align-middle">
              <Table className="min-w-full">
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="border border-gray-200 text-gray-700 font-bold whitespace-nowrap py-3 px-4">
                      Datum
                    </TableHead>
                    <TableHead className="border border-gray-200 text-gray-700 font-bold whitespace-nowrap py-3 px-4">
                      Auftrag Nr.
                    </TableHead>
                    <TableHead className="border border-gray-200 text-gray-700 font-bold w-64 whitespace-nowrap py-3 px-4">
                      Objekt oder Strasse
                    </TableHead>
                    <TableHead className="border border-gray-200 text-gray-700 font-bold whitespace-nowrap py-3 px-4">
                      Ort
                    </TableHead>
                    <TableHead className="border border-gray-200 font-bold text-gray-700 w-14 text-center whitespace-nowrap py-3 px-4">
                      Std.
                    </TableHead>
                    <TableHead className="border border-gray-200 font-bold text-gray-700 w-14 text-center whitespace-nowrap py-3 px-4">
                      Absenzen
                    </TableHead>
                    <TableHead className="border border-gray-200 font-bold text-gray-700 w-14 text-center whitespace-nowrap py-3 px-4">
                      Überstd.
                    </TableHead>
                    <TableHead className="border border-gray-200 text-gray-700 font-bold whitespace-nowrap py-3 px-4">
                      Auslagen und Bemerkungen
                    </TableHead>
                    <TableHead className="border border-gray-200 font-bold text-gray-700 w-16 text-center whitespace-nowrap py-3 px-4">
                      Auslagen Fr.
                    </TableHead>
                    <TableHead className="border border-gray-200 font-bold text-gray-700 w-32 whitespace-nowrap py-3 px-4">
                      Notizen
                    </TableHead>
                    <TableHead className="border border-gray-200 text-gray-700 font-bold whitespace-nowrap py-3 px-4">
                      Aktionen
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry, index) => (
                    <EntryRow
                      key={`entry-${index}`}
                      entry={entry}
                      index={index}
                      onEdit={handleEditEntry}
                      onDelete={handleDeleteEntry}
                    />
                  ))}
                  {/* Input row for new entries */}
                  <TableRow className="hover:bg-gray-50">
                    <TableCell className="border border-gray-200 p-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !newEntry.date && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {format(newEntry.date, "dd.MM.yyyy")}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={newEntry.date}
                            onSelect={(date) => handleNewEntryChange("date", date || new Date())}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </TableCell>
                    <TableCell className="border border-gray-200 p-2">
                      <Input
                        type="text"
                        value={newEntry.orderNumber}
                        onChange={(e) =>
                          handleNewEntryChange("orderNumber", e.target.value)
                        }
                        className="border-gray-300"
                      />
                    </TableCell>
                    <TableCell className="border border-gray-200 p-2">
                      <ObjectAutocomplete
                        value={newEntry.object}
                        onChange={(value) =>
                          handleNewEntryChange("object", value)
                        }
                        placeholder="Inselweg 31"
                      />
                    </TableCell>
                    <TableCell className="border border-gray-200 p-2">
                      <LocationAutocomplete
                        value={newEntry.location}
                        onChange={(value) =>
                          handleNewEntryChange("location", value)
                        }
                        placeholder="Hurden"
                      />
                    </TableCell>
                    <TableCell className="border border-gray-200 w-14 text-center p-2">
                      <Input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*\.?[0-9]*"
                        value={newEntry.hours || ""}
                        onChange={(e) =>
                          handleNewEntryChange(
                            "hours",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        placeholder="5.00"
                        className="text-center border-gray-300"
                      />
                    </TableCell>
                    <TableCell className="border border-gray-200 w-14 text-center p-2">
                      <Input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*\.?[0-9]*"
                        value={newEntry.absences || ""}
                        onChange={(e) =>
                          handleNewEntryChange(
                            "absences",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        className="text-center border-gray-300"
                      />
                    </TableCell>
                    <TableCell className="border border-gray-200 w-14 text-center p-2">
                      <Input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*\.?[0-9]*"
                        value={newEntry.overtime || ""}
                        onChange={(e) =>
                          handleNewEntryChange(
                            "overtime",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        className="text-center border-gray-300"
                      />
                    </TableCell>
                    <TableCell className="border border-gray-200 p-2">
                      <div className="flex items-center gap-1">
                        <Input
                          type="text"
                          value={newEntry.expenses || ""}
                          className="cursor-pointer border-gray-300"
                          readOnly
                          onClick={() => {
                            setTempExpenses(newEntry.expenses || "");
                            setExpensesDialogOpen(true);
                          }}
                          placeholder="Auslagen und Bemerkungen"
                        />
                        
                        <Dialog open={expensesDialogOpen} onOpenChange={setExpensesDialogOpen}>
                          <DialogContent className="sm:max-w-[425px] bg-white">
                            <DialogHeader>
                              <DialogTitle className="text-gray-800">Auslagen und Bemerkungen eingeben</DialogTitle>
                            </DialogHeader>
                            <Textarea 
                              value={tempExpenses} 
                              onChange={(e) => setTempExpenses(e.target.value)}
                              className="min-h-[150px] border-gray-300"
                              placeholder="Auslagen und Bemerkungen hier eingeben..."
                            />
                            <DialogFooter>
                              <Button 
                                type="submit" 
                                onClick={() => {
                                  handleNewEntryChange("expenses", tempExpenses);
                                  setExpensesDialogOpen(false);
                                }}
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                              >
                                Speichern
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </TableCell>
                    <TableCell className="border border-gray-200 w-16 text-center p-2">
                      <Input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*\.?[0-9]*"
                        value={newEntry.expenseAmount || ""}
                        onChange={(e) =>
                          handleNewEntryChange(
                            "expenseAmount",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        className="text-center border-gray-300"
                      />
                    </TableCell>
                    <TableCell className="border border-gray-200 p-2">
                      <div className="flex items-center gap-1">
                        <Input
                          type="text"
                          value={newEntry.notes || ""}
                          className="cursor-pointer border-gray-300"
                          readOnly
                          onClick={() => {
                            setTempNotes(newEntry.notes || "");
                            setNotesDialogOpen(true);
                          }}
                          placeholder="Notizen"
                        />
                        
                        <Dialog open={notesDialogOpen} onOpenChange={setNotesDialogOpen}>
                          <DialogContent className="sm:max-w-[425px] bg-white">
                            <DialogHeader>
                              <DialogTitle className="text-gray-800">Notizen eingeben</DialogTitle>
                            </DialogHeader>
                            <Textarea 
                              value={tempNotes} 
                              onChange={(e) => setTempNotes(e.target.value)}
                              className="min-h-[150px] border-gray-300"
                              placeholder="Notizen hier eingeben..."
                            />
                            <DialogFooter>
                              <Button 
                                type="submit" 
                                onClick={handleSaveNotes}
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                              >
                                Speichern
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </TableCell>
                    <TableCell className="border border-gray-200 p-2"></TableCell>
                  </TableRow>
                  {/* Summary rows */}
                  <TableRow className="bg-gray-50">
                    <TableCell colSpan={3} className="border border-gray-200"></TableCell>
                    <TableCell className="border border-gray-200 font-bold text-gray-700 p-2">
                      Total
                    </TableCell>
                    <TableCell className="border border-gray-200 font-bold text-gray-700 w-14 text-center p-2">
                      {totalHours.toFixed(2)}
                    </TableCell>
                    <TableCell className="border border-gray-200 font-bold text-gray-700 w-14 text-center p-2">
                      {totalAbsences > 0 ? totalAbsences.toFixed(2) : ""}
                    </TableCell>
                    <TableCell className="border border-gray-200 font-bold text-gray-700 w-14 text-center p-2">
                      {totalOvertime > 0 ? totalOvertime.toFixed(2) : ""}
                    </TableCell>
                    <TableCell className="border border-gray-200"></TableCell>
                    <TableCell className="border border-gray-200 font-bold text-gray-700 w-16 text-center p-2">
                      {totalExpenses.toFixed(2)}
                    </TableCell>
                    <TableCell className="border border-gray-200"></TableCell>
                    <TableCell className="border border-gray-200"></TableCell>
                  </TableRow>

                  <TableRow className="bg-blue-50">
                    <TableCell colSpan={3} className="border border-gray-200"></TableCell>
                    <TableCell className="border border-gray-200 font-bold text-gray-700 p-2">
                      Total Sollstunden
                    </TableCell>
                    <TableCell className="border border-gray-200 font-bold text-gray-700 w-14 text-center p-2">
                      {totalRequiredHours.toFixed(2)}
                    </TableCell>
                    <TableCell colSpan={6} className="border border-gray-200"></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <Button 
              onClick={handleAddEntry} 
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1 transition-colors"
            >
              <FileText className="h-4 w-4 mr-1" />
              Eintrag hinzufügen
            </Button>
            <Button 
              onClick={exportToCSV} 
              variant="outline" 
              className="border-blue-600 text-blue-600 hover:bg-blue-50 flex items-center gap-1 transition-colors"
            >
              <Download className="h-4 w-4 mr-1" />
              Als CSV exportieren
            </Button>
            <Button 
              onClick={openEmailDialog} 
              variant="outline" 
              className="border-blue-600 text-blue-600 hover:bg-blue-50 flex items-center gap-1 transition-colors"
            >
              Per E-Mail senden
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* E-Mail-Dialog */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Bericht per E-Mail senden</DialogTitle>
            <DialogDescription>
              Wählen Sie einen gespeicherten Bericht aus, um ihn per E-Mail zu versenden.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="report-select" className="text-sm font-medium">
                Gespeicherter Bericht
              </Label>
              <select
                id="report-select"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={selectedReportId || ''}
                onChange={(e) => setSelectedReportId(e.target.value)}
                disabled={isLoadingReports}
              >
                <option value="">Bericht auswählen</option>
                {savedReports.map((report) => (
                  <option key={report.id} value={report.id}>
                    {report.name} - {report.period}
                  </option>
                ))}
              </select>
              {isLoadingReports && (
                <p className="text-sm text-gray-500">Lade Berichte...</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="export-format" className="text-sm font-medium">
                Exportformat
              </Label>
              <div className="flex space-x-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="export-format"
                    checked={exportFormat === 'csv'}
                    onChange={() => setExportFormat('csv')}
                    className="h-4 w-4"
                  />
                  <span>CSV</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="export-format"
                    checked={exportFormat === 'excel'}
                    onChange={() => setExportFormat('excel')}
                    className="h-4 w-4"
                  />
                  <span>Excel</span>
                </label>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email-input" className="text-sm font-medium">
                E-Mail-Adresse
              </Label>
              <Input
                id="email-input"
                type="email"
                placeholder="beispiel@domain.com"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                className="w-full"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEmailDialogOpen(false)}
              disabled={isLoading}
            >
              Abbrechen
            </Button>
            <Button
              type="submit"
              onClick={sendReportByEmail}
              disabled={!selectedReportId || !recipientEmail || isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isLoading ? "Wird gesendet..." : "Senden"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WorkReport;
