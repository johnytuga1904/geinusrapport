import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { History, Edit, Trash2, AlertCircle, Loader2, RefreshCw } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { SavedReport, DatabaseSavedReport, isDatabaseReport } from "@/types/reports";

interface ReportHistoryProps {
  onLoadReport: (report: SavedReport) => void;
  iconOnly?: boolean;
}

export default function ReportHistory({ onLoadReport, iconOnly = false }: ReportHistoryProps) {
  const [open, setOpen] = useState(false);
  const [savedReports, setSavedReports] = useState<DatabaseSavedReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reportToDelete, setReportToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Nicht eingeloggt');

      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setSavedReports(data || []);
      if (data && data.length === 0) {
        setError('Keine gespeicherten Berichte gefunden');
      }
    } catch (error: any) {
      console.error('Error fetching reports:', error);
      setError(error.message || 'Fehler beim Laden der Berichte');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchReports();
    }
  }, [open]);

  const handleLoadReport = (report: SavedReport) => {
    try {
      if (!isDatabaseReport(report)) {
        throw new Error('Ungültiges Berichtsformat');
      }
      const reportData = JSON.parse(report.content);
      onLoadReport(reportData);
      setOpen(false);
      toast.success(`Bericht "${report.name}" erfolgreich geladen`);
    } catch (error) {
      console.error('Fehler beim Laden des Berichts:', error);
      setError('Fehler beim Laden des Berichts');
      toast.error('Fehler beim Laden des Berichts');
    }
  };

  const openDeleteDialog = (id: string) => {
    setReportToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteReport = async () => {
    if (!reportToDelete) return;
    
    try {
      setIsDeleting(true);
      const { error } = await supabase
        .from('reports')
        .delete()
        .eq('id', reportToDelete);

      if (error) throw error;

      setSavedReports(savedReports.filter(report => report.id !== reportToDelete));
      toast.success('Bericht erfolgreich gelöscht!');
      setDeleteDialogOpen(false);
      setReportToDelete(null);
    } catch (error) {
      console.error('Fehler beim Löschen des Berichts:', error);
      toast.error('Fehler beim Löschen: ' + (error instanceof Error ? error.message : 'Unbekannter Fehler'));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size={iconOnly ? "icon" : "default"}>
            <History className="h-4 w-4" />
            {!iconOnly && <span className="ml-2">Berichte</span>}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <History className="h-5 w-5" />
              Gespeicherte Berichte
            </DialogTitle>
            <DialogDescription>
              Hier finden Sie alle Ihre gespeicherten Arbeitsrapporte
            </DialogDescription>
          </DialogHeader>
          
          {loading ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-2" />
              <p className="text-gray-500">Lade Berichte...</p>
            </div>
          ) : error ? (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Fehler</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
              {error === 'Keine gespeicherten Berichte gefunden' && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2" 
                  onClick={() => setOpen(false)}
                >
                  Schließen
                </Button>
              )}
            </Alert>
          ) : (
            <>
              <div className="flex justify-end mb-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={fetchReports} 
                  className="flex items-center gap-1"
                  disabled={loading}
                >
                  <RefreshCw className="h-3 w-3" />
                  Aktualisieren
                </Button>
              </div>
              
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-bold">Name</TableHead>
                      <TableHead className="font-bold">Zeitraum</TableHead>
                      <TableHead className="font-bold">Datum</TableHead>
                      <TableHead className="font-bold text-right">Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {savedReports.map((report) => (
                      <TableRow key={report.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium">{report.name}</TableCell>
                        <TableCell>{report.period}</TableCell>
                        <TableCell>{new Date(report.created_at).toLocaleDateString('de-DE')}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleLoadReport(report)}
                            title="Bericht laden"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openDeleteDialog(report.id)}
                            title="Bericht löschen"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Lösch-Bestätigungsdialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Bericht löschen</DialogTitle>
            <DialogDescription>
              Sind Sie sicher, dass Sie diesen Bericht löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-end gap-2 mt-4">
            <Button 
              variant="outline" 
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Abbrechen
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteReport}
              disabled={isDeleting}
              className="bg-red-500 hover:bg-red-600"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Löschen...
                </>
              ) : (
                <>Löschen</>  
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
