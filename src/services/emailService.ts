import { supabase } from '@/lib/supabase';

interface SMTPConfig {
  host: string;
  port: string;
  username: string;
  password: string;
  useTLS: boolean;
  fromEmail: string;
}

interface EmailAttachment {
  filename: string;
  content: Buffer;
  contentType?: string;
}

interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  attachment?: EmailAttachment;
}

class EmailService {
  private async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw new Error(`Fehler beim Abrufen des Benutzers: ${error.message}`);
    if (!user) throw new Error('Nicht eingeloggt');
    return user;
  }

  private async getFunctionUrl(functionName: string): Promise<string> {
    try {
      // Versuche zuerst, die URL über die get-function-url Edge-Funktion zu holen
      const { data, error } = await supabase.functions.invoke('get-function-url', {
        body: { functionName }
      });
      
      if (error) {
        console.error("Fehler beim Abrufen der Funktions-URL:", error);
        throw new Error(`Fehler beim Abrufen der Funktions-URL: ${error.message}`);
      }
      
      if (data && data.url) {
        return data.url;
      }
      
      // Fallback: Konstruiere die URL basierend auf der Supabase-URL
      const { data: { session } } = await supabase.auth.getSession();
      const projectRef = session?.access_token ? JSON.parse(atob(session.access_token.split('.')[1])).iss.split('/')[3] : null;
      
      if (!projectRef) {
        throw new Error("Projekt-Referenz konnte nicht ermittelt werden");
      }
      
      return `https://${projectRef}.supabase.co/functions/v1/${functionName}`;
    } catch (error) {
      console.error("Fehler beim Abrufen der Funktions-URL:", error);
      // Fallback: Verwende die Supabase-URL aus der Umgebungsvariable
      const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || '';
      const projectRef = supabaseUrl.match(/https:\/\/(.*?)\.supabase\.co/)?.[1];
      
      if (!projectRef) {
        throw new Error("Projekt-Referenz konnte nicht ermittelt werden");
      }
      
      return `https://${projectRef}.supabase.co/functions/v1/${functionName}`;
    }
  }

  async sendEmail(options: EmailOptions) {
    try {
      const user = await this.getCurrentUser();
      const functionUrl = await this.getFunctionUrl('send-email-with-attachment');

      // Erstelle FormData für die Anfrage
      const formData = new FormData();
      formData.append('to', options.to);
      formData.append('subject', options.subject);
      formData.append('text', options.text);
      formData.append('userId', user.id);

      if (options.attachment) {
        formData.append('file', new Blob([options.attachment.content]), options.attachment.filename);
      }

      // Sende die Anfrage
      const response = await fetch(functionUrl, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Fehler beim Senden der E-Mail');
      }

      return data;
    } catch (error) {
      console.error('Fehler beim Senden der E-Mail:', error);
      throw error;
    }
  }

  async sendReport(to: string, report: any, format: 'csv' | 'excel' = 'csv') {
    try {
      const subject = `Arbeitsrapport: ${report.name} - ${report.period}`;
      
      // Generiere den E-Mail-Text
      const text = `
        Arbeitsrapport: ${report.name}
        Zeitraum: ${report.period}
        
        Zusammenfassung:
        - Gesamtstunden: ${report.entries.reduce((sum: number, entry: any) => sum + entry.hours, 0)}
        - Gesamtabsenzen: ${report.entries.reduce((sum: number, entry: any) => sum + entry.absences, 0)}
        - Gesamtüberstunden: ${report.entries.reduce((sum: number, entry: any) => sum + entry.overtime, 0)}
        - Gesamtspesen: ${report.entries.reduce((sum: number, entry: any) => sum + entry.expenseAmount, 0)}
        
        Der detaillierte Bericht ist als ${format.toUpperCase()}-Datei angehängt.
      `;

      // Generiere den Anhang basierend auf dem Format
      let attachment: EmailAttachment | undefined;
      if (format === 'csv') {
        // CSV-Header
        let csvContent = "Datum,Auftrag Nr.,Objekt oder Strasse,Ort,Std.,Absenzen,Überstd.,Auslagen und Bemerkungen,Auslagen Fr.,Notizen\n";
        
        // CSV-Daten aus Einträgen
        report.entries.forEach((entry: any) => {
          const formattedDate = typeof entry.date === 'string' ? entry.date : new Date(entry.date).toLocaleDateString();
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

        attachment = {
          filename: `Arbeitsrapport_${report.name.replace(/\s+/g, '_')}_${report.period.replace(/\s+/g, '_')}.csv`,
          content: Buffer.from(csvContent),
          contentType: 'text/csv;charset=utf-8'
        };
      }

      return await this.sendEmail({
        to,
        subject,
        text,
        attachment
      });
    } catch (error) {
      console.error('Fehler beim Senden des Reports:', error);
      throw error;
    }
  }

  async sendReportWithAttachment(
    recipientEmail: string,
    report: any,
    attachment: Buffer,
    attachmentFilename: string
  ): Promise<void> {
    try {
      // Hole den aktuellen Benutzer
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Nicht eingeloggt');
      }

      // Erstelle den E-Mail-Text
      const emailText = `
        Arbeitsrapport: ${report.name}
        Zeitraum: ${report.period}
        
        Zusammenfassung:
        - Gesamtstunden: ${report.entries.reduce((sum: number, entry: any) => sum + entry.hours, 0)}
        - Gesamtabsenzen: ${report.entries.reduce((sum: number, entry: any) => sum + entry.absences, 0)}
        - Gesamtüberstunden: ${report.entries.reduce((sum: number, entry: any) => sum + entry.overtime, 0)}
        - Gesamtspesen: ${report.entries.reduce((sum: number, entry: any) => sum + entry.expenseAmount, 0)}
        
        Der detaillierte Bericht ist als XLSX-Datei angehängt.
      `;

      // Rufe die Edge Function auf
      const { error } = await supabase.functions.invoke('send-email', {
        body: {
          to: recipientEmail,
          subject: `Arbeitsrapport: ${report.name} - ${report.period}`,
          text: emailText,
          attachment: {
            filename: attachmentFilename,
            content: attachment.toString('base64')
          }
        }
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Fehler beim Senden der E-Mail:', error);
      throw error;
    }
  }
}

// Erstelle eine einzelne Instanz des E-Mail-Services
const emailService = new EmailService();

// Exportiere die Instanz
export { emailService }; 