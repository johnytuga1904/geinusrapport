import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BackToDashboardButton } from "@/components/BackToDashboardButton";
import { Charts } from "@/components/Charts";
import { databaseService } from "@/services/database";
import { parse, isWithinInterval, parseISO, format, isValid } from "date-fns";
import { de } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { commonObjects } from "@/data/locations";

export function DiagramsPage() {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [savedReports, setSavedReports] = useState<any[]>([]);

  useEffect(() => {
    const loadReports = async () => {
      setLoading(true);
      try {
        const reports = await databaseService.getReports();
        setSavedReports(reports);
      } catch (error) {
        console.error("Fehler beim Laden der Berichte:", error);
        setError("Fehler beim Laden der Berichte");
      } finally {
        setLoading(false);
      }
    };

    loadReports();
  }, []);

  return (
    <div className="container mx-auto p-4 space-y-4">
      <BackToDashboardButton />
      
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Diagramme</h1>
        <p className="text-muted-foreground">Visualisieren Sie Ihre Daten</p>

        {loading && (
          <div className="space-y-4">
            <Skeleton className="h-[400px] w-full" />
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!loading && !error && (
          <div className="space-y-8">
            <Charts savedReports={savedReports} />
          </div>
        )}
      </div>
    </div>
  );
}