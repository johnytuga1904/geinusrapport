import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, CheckCircle, AlertCircle } from 'lucide-react';
import { WorkReportData } from '@/types/reports';
import { createExcelReport } from '@/utils/excelExport';
import { createPDFReport } from '@/utils/pdfExport';
import { createCSVReport } from '@/utils/csvExport';
import { emailService } from '@/services/emailService';

interface EmailReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportData: WorkReportData;
}

export function EmailReportDialog({
  open,
  onOpenChange,
  reportData,
}: EmailReportDialogProps) {
  const [recipient, setRecipient] = useState('');
  const [subject, setSubject] = useState(`Arbeitsrapport: ${reportData.name} - ${reportData.period}`);
  const [message, setMessage] = useState(
    `Sehr geehrte Damen und Herren,\n\nanbei erhalten Sie meinen Arbeitsrapport für den Zeitraum ${reportData.period}.\n\nMit freundlichen Grüssen,\n${reportData.name}`
  );
  const [format, setFormat] = useState<'excel' | 'pdf' | 'csv'>('excel');
  const [includeCompanyInfo, setIncludeCompanyInfo] = useState(true);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSendEmail = async () => {
    if (!recipient) {
      setError('Bitte geben Sie eine E-Mail-Adresse ein');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Aktualisiere die reportData mit dem Nachrichtentext und Betreff
      const reportDataWithMessage = {
        ...reportData,
        emailSubject: subject,
        emailMessage: message,
        includeCompanyInfo
      };

      // Sende den Report direkt mit der neuen sendReport-Methode
      // Diese Methode kümmert sich um die Erstellung des Anhangs im gewählten Format
      await emailService.sendReport(recipient, reportDataWithMessage, format);

      setSuccess(true);

      // Dialog nach kurzer Verzögerung schließen
      setTimeout(() => {
        onOpenChange(false);
        setSuccess(false);
      }, 2000);
    } catch (err) {
      console.error('Fehler beim Senden der E-Mail:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unbekannter Fehler';
      setError(`Fehler beim Senden der E-Mail: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Arbeitsrapport per E-Mail senden</DialogTitle>
          <DialogDescription>
            Füllen Sie die Felder aus, um den Arbeitsrapport per E-Mail zu versenden.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="recipient" className="text-right">
              Empfänger*
            </Label>
            <Input
              id="recipient"
              type="email"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="empfaenger@example.com"
              className="col-span-3"
              required
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="subject" className="text-right">
              Betreff
            </Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="message" className="text-right">
              Nachricht
            </Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="col-span-3"
              rows={5}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Format</Label>
            <div className="col-span-3">
              <RadioGroup value={format} onValueChange={(value) => setFormat(value as 'excel' | 'pdf' | 'csv')}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="excel" id="excel" />
                  <Label htmlFor="excel">Excel (.xlsx)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="pdf" id="pdf" />
                  <Label htmlFor="pdf">PDF (.pdf)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="csv" id="csv" />
                  <Label htmlFor="csv">CSV (.csv)</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Optionen</Label>
            <div className="col-span-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeCompanyInfo"
                  checked={includeCompanyInfo}
                  onCheckedChange={(checked) => setIncludeCompanyInfo(checked as boolean)}
                />
                <Label htmlFor="includeCompanyInfo">Firmeninformationen einschließen</Label>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-4 bg-green-50 text-green-800 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription>E-Mail wurde erfolgreich gesendet!</AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button
            onClick={handleSendEmail}
            disabled={loading || success}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Senden...
              </>
            ) : success ? (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Gesendet!
              </>
            ) : (
              'Senden'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
