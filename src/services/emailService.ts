import { supabase } from "@/lib/supabase";
import { WorkReportData } from "@/types/reports";
import { proxyService } from "./proxyService";

/**
 * Interface für SMTP-Konfiguration (aus DB)
 */
interface SmtpConfigFromDb {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
}

/**
 * Interface für SMTP-Konfiguration Payload (für Funktion)
 */
interface SmtpConfigPayload {
  host: string;
  port: number;
  secure?: boolean; // Wird von Funktion gehandhabt, aber wir übergeben den DB-Wert
  auth: {
    user: string;
    pass: string;
  };
}

/**
 * Interface für den Payload der Supabase-Funktion
 */
interface FunctionPayload {
  to: string;
  subject: string;
  text: string;
  smtpConfig: SmtpConfigPayload;
  reportData: WorkReportData; // Die Funktion erwartet die vollen Reportdaten
  format: 'excel' | 'pdf' | 'csv';
}

/**
 * Interface für die Antwort der Supabase-Funktion
 */
interface FunctionResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  details?: any;
}

/**
 * E-Mail-Service für das Senden von E-Mails über die Supabase-Funktion
 */
export class EmailService {
  /**
   * Sendet einen Arbeitsrapport per E-Mail mit Anhang über die Supabase-Funktion
   * @param to E-Mail-Adresse des Empfängers
   * @param report Arbeitsrapport-Daten mit optionalen E-Mail-Eigenschaften
   * @param format Format des Anhangs ('excel', 'pdf' oder 'csv')
   * @returns Ergebnis des Funktionsaufrufs
   */
  async sendReport(
    to: string,
    report: WorkReportData & {
      emailSubject?: string;
      emailMessage?: string;
    },
    format: 'excel' | 'pdf' | 'csv' = 'excel'
  ): Promise<FunctionResponse> {
    try {
      // 1. Hole den aktuellen Benutzer
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('Fehler beim Abrufen des Benutzers:', userError);
        throw new Error(userError?.message || 'Nicht eingeloggt');
      }
      console.log(`[${new Date().toISOString()}] User ${user.id} retrieved.`);

      // 2. SMTP-Konfiguration des Benutzers abrufen
      console.log(`[${new Date().toISOString()}] Fetching SMTP config for user ${user.id}...`);
      const { data: smtpData, error: smtpError } = await supabase
        .from('smtp_config')
        .select('host, port, secure, user, pass')
        .eq('user_id', user.id)
        .single<SmtpConfigFromDb>();

      if (smtpError) {
        // Handle specific errors like 'PGRST116' (No rows found)
        if (smtpError.code === 'PGRST116') {
          console.error(`[${new Date().toISOString()}] No SMTP configuration found for user ${user.id}.`);
          throw new Error('Keine SMTP-Konfiguration gefunden. Bitte richten Sie Ihre E-Mail-Einstellungen ein.');
        } else {
          console.error(`[${new Date().toISOString()}] Fehler beim Abrufen der SMTP-Konfiguration for user ${user.id}:`, smtpError);
          throw new Error(`Fehler beim Abrufen der SMTP-Konfiguration: ${smtpError.message}`);
        }
      }

      if (!smtpData || !smtpData.host || !smtpData.port || !smtpData.user || !smtpData.pass) {
        console.error(`[${new Date().toISOString()}] Unvollständige SMTP-Konfiguration für Benutzer ${user.id}:`, smtpData);
        throw new Error('Ihre SMTP-Einstellungen sind unvollständig. Bitte überprüfen Sie Ihr Profil.');
      }
      console.log(`[${new Date().toISOString()}] SMTP config fetched successfully for user ${user.id}.`);

      // 3. SMTP-Konfigurations-Payload für die Funktion erstellen
      const smtpConfigPayload: SmtpConfigPayload = {
        host: smtpData.host,
        port: smtpData.port,
        secure: smtpData.secure,
        auth: {
          user: smtpData.user,
          pass: smtpData.pass,
        },
      };

      // 4. Generiere Betreff und Text (oder verwende die übergebenen)
      const subject = report.emailSubject || `Arbeitsrapport: ${report.employeeName || 'Mitarbeiter'} - ${report.month || 'Monat'}/${report.year || 'Jahr'}`;

      let text: string;
      if (report.emailMessage) {
        text = report.emailMessage;
      } else {
        // Generiere Standard-E-Mail-Text
        const calculatedTotalHours = report.totalHours ?? report.entries.reduce((sum, entry) => sum + (entry.hours || 0), 0);
        text = `Sehr geehrte Damen und Herren,\n\nanbei erhalten Sie den Arbeitsrapport für ${report.month || 'Monat'}/${report.year || 'Jahr'}.\n\nZusammenfassung:\n- Gesamtstunden: ${calculatedTotalHours.toFixed(2)}\n\nMit freundlichen Grüßen,\n${report.employeeName || 'Mitarbeiter'}`;
      }

      // 5. Korrekten Payload für die Supabase-Funktion erstellen
      const functionPayload: FunctionPayload = {
        to: to,
        subject: subject,
        text: text,
        smtpConfig: smtpConfigPayload,
        reportData: {
          client: report.client || 'Kunde',
          month: report.month || 'Monat',
          year: report.year || 'Jahr',
          totalHours: report.totalHours || 0,
          employeeName: report.employeeName || 'Mitarbeiter',
          entries: report.entries || []
        },
        format: format
      };

      console.log(`[${new Date().toISOString()}] Preparing to invoke email function with format: ${format}`);
      const payloadSize = JSON.stringify(functionPayload).length;
      console.log(`[${new Date().toISOString()}] Function Payload Size: ${payloadSize} Bytes`);
      
      if (payloadSize > 4.5 * 1024 * 1024) {
        console.warn(`[${new Date().toISOString()}] Payload size (${payloadSize} Bytes) is large and may exceed Supabase limits.`);
      }

      // Verwende die neue Resend-basierte Funktion für bessere CORS-Kompatibilität
      console.log(`[${new Date().toISOString()}] Invoking Supabase function with payload:`, functionPayload);
      
      // Direkter Fetch-Ansatz mit Timeout und besserer Fehlerbehandlung
      console.log(`[${new Date().toISOString()}] Using direct fetch to call email function`);
      
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://zgwlrnfpyhhjjzdhrmhh.supabase.co';
      const { data: { session } } = await supabase.auth.getSession();
      const supabaseKey = session?.access_token || '';
      
      try {
        // Timeout für die Fetch-Anfrage einrichten
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 Sekunden Timeout
        
        console.log(`[${new Date().toISOString()}] Sending request to ${supabaseUrl}/functions/v1/simple-email-sender`);
        
        const response = await fetch(`${supabaseUrl}/functions/v1/simple-email-sender`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`,
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            to: functionPayload.to,
            subject: functionPayload.subject,
            text: functionPayload.text,
            reportData: functionPayload.reportData,
            format: functionPayload.format,
            smtpConfig: smtpConfigPayload  // SMTP-Konfiguration hinzugefügt
          }),
          signal: controller.signal,
          mode: 'cors'
        });
        
        clearTimeout(timeoutId); // Timeout aufheben, wenn die Anfrage erfolgreich war
        
        console.log(`[${new Date().toISOString()}] Response status:`, response.status, response.statusText);
        
        if (!response.ok) {
          throw new Error(`Function returned status ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log(`[${new Date().toISOString()}] Response data:`, data);
        
        return {
          success: data.success === true,
          messageId: data.messageId || data.id || 'unknown',
          details: data
        };
      } catch (error) {
        if (error.name === 'AbortError') {
          console.error(`[${new Date().toISOString()}] Request timed out after 30 seconds`);
          throw new Error('Die Anfrage hat zu lange gedauert. Bitte versuchen Sie es später erneut.');
        } else if (error.name === 'TypeError' && error.message.includes('NetworkError')) {
          console.error(`[${new Date().toISOString()}] Network error:`, error);
          throw new Error('Netzwerkfehler beim Senden der E-Mail. Bitte überprüfen Sie Ihre Internetverbindung.');
        } else {
          console.error(`[${new Date().toISOString()}] Error sending email:`, error);
          throw new Error(`Fehler beim Senden der E-Mail: ${error.message}`);
        }
      }
      
      // Dieser Code wird nicht mehr benötigt, da wir die Antwort direkt zurückgeben
    } catch (err) {
      console.error(`[${new Date().toISOString()}] Detaillierter Fehler im sendReport Service:`, JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
      const errorMessage = err instanceof Error ? err.message : String(err);
      throw new Error(`Fehler beim Senden der E-Mail: ${errorMessage}`);
    }
  }
}

// Erstelle eine einzelne Instanz des E-Mail-Services und exportiere sie
export const emailService = new EmailService();
