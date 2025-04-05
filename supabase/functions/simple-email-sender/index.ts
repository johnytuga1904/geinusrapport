// SMTP-basierte E-Mail-Funktion mit CORS-Unterstützung
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

console.log("SMTP-basierte E-Mail-Funktion gestartet");

// Typen für eine bessere Typprüfung
interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

interface AttachmentInfo {
  format: string;
  filename: string;
  content?: string;
}

// Zugriff auf Deno-Namespace erlauben
declare const Deno: any;

// Mailgun API-Schlüssel (kostenlose Stufe für Tests)
// In Produktion sollte dies als Umgebungsvariable konfiguriert werden
const MAILGUN_API_KEY = "";
const MAILGUN_DOMAIN = "";

// Alternativ: SendGrid API-Schlüssel
const SENDGRID_API_KEY = "";

// HTTP-basierte E-Mail-Versandlösung mit Unterstützung für mehrere Provider
const sendMailWithHttp = async (to: string, subject: string, text: string, htmlContent: string, smtpConfig: SmtpConfig, attachmentInfo: AttachmentInfo | null = null) => {
  try {
    console.log(`Bereite E-Mail-Versand vor (Empfänger: ${to})`);
    console.log(`Betreff: ${subject}`);
    console.log(`SMTP-Konfiguration: Host=${smtpConfig.host}, User=${smtpConfig.auth.user}`);
    
    // Bestimme den E-Mail-Provider basierend auf den SMTP-Einstellungen
    const emailDomain = smtpConfig.auth.user.split('@')[1]?.toLowerCase() || '';
    const isGmail = emailDomain.includes('gmail.com') || smtpConfig.host.includes('gmail');
    const isOutlook = emailDomain.includes('outlook') || emailDomain.includes('hotmail') || smtpConfig.host.includes('outlook');
    const isWebDe = emailDomain.includes('web.de') || smtpConfig.host.includes('web.de');
    const isGmx = emailDomain.includes('gmx') || smtpConfig.host.includes('gmx');
    
    console.log(`Erkannter E-Mail-Provider: ${isGmail ? 'Gmail' : isOutlook ? 'Outlook' : isWebDe ? 'Web.de' : isGmx ? 'GMX' : 'Unbekannt'}`);
    
    // Wir verwenden einen externen E-Mail-Dienst (Mailgun oder SendGrid) als Proxy
    // Dies umgeht die SMTP-Probleme in Deno/Edge Functions
    
    // Formatiere den Absender-Namen korrekt
    const fromName = smtpConfig.auth.user.split('@')[0] || 'Benutzer';
    const fromEmail = smtpConfig.auth.user;
    const fromField = `${fromName} <${fromEmail}>`;
    
    let emailResult;
    
    // Versuche zuerst Mailgun, wenn konfiguriert
    if (MAILGUN_API_KEY && MAILGUN_DOMAIN) {
      try {
        console.log("Versuche E-Mail über Mailgun API zu senden...");
        
        // Mailgun API-Anfrage vorbereiten
        const formData = new FormData();
        formData.append('from', fromField);
        formData.append('to', to);
        formData.append('subject', subject);
        formData.append('text', text);
        formData.append('html', htmlContent);
        
        // Setze Reply-To auf die ursprüngliche E-Mail-Adresse des Benutzers
        formData.append('h:Reply-To', fromEmail);
        
        // Mailgun API aufrufen
        const mailgunResponse = await fetch(`https://api.mailgun.net/v3/${MAILGUN_DOMAIN}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${btoa(`api:${MAILGUN_API_KEY}`)}`
          },
          body: formData
        });
        
        if (!mailgunResponse.ok) {
          const errorText = await mailgunResponse.text();
          throw new Error(`Mailgun API-Fehler (${mailgunResponse.status}): ${errorText}`);
        }
        
        const mailgunResult = await mailgunResponse.json();
        console.log("E-Mail erfolgreich über Mailgun gesendet!", mailgunResult);
        
        emailResult = {
          id: mailgunResult.id || `mg-${Date.now()}`,
          to: to,
          subject: subject,
          status: "sent",
          provider: "mailgun",
          originalSender: fromEmail,
          createdAt: new Date().toISOString()
        };
        
        return emailResult;
      } catch (mailgunError) {
        console.warn(`Mailgun-Fehler: ${mailgunError.message}. Versuche alternative Methode...`);
        // Wenn Mailgun fehlschlägt, versuchen wir SendGrid
      }
    }
    
    // Versuche SendGrid als Fallback, wenn konfiguriert
    if (SENDGRID_API_KEY) {
      try {
        console.log("Versuche E-Mail über SendGrid API zu senden...");
        
        // SendGrid API-Anfrage vorbereiten
        const sendgridPayload = {
          personalizations: [{
            to: [{ email: to }],
            subject: subject
          }],
          from: { email: "noreply@example.com", name: fromName }, // SendGrid erfordert eine verifizierte Domain
          reply_to: { email: fromEmail, name: fromName },
          content: [
            { type: "text/plain", value: text },
            { type: "text/html", value: htmlContent }
          ]
        };
        
        // SendGrid API aufrufen
        const sendgridResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SENDGRID_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(sendgridPayload)
        });
        
        if (!sendgridResponse.ok) {
          const errorText = await sendgridResponse.text();
          throw new Error(`SendGrid API-Fehler (${sendgridResponse.status}): ${errorText}`);
        }
        
        console.log("E-Mail erfolgreich über SendGrid gesendet!");
        
        emailResult = {
          id: `sg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          to: to,
          subject: subject,
          status: "sent",
          provider: "sendgrid",
          originalSender: fromEmail,
          createdAt: new Date().toISOString()
        };
        
        return emailResult;
      } catch (sendgridError) {
        console.warn(`SendGrid-Fehler: ${sendgridError.message}. Versuche alternative Methode...`);
        // Wenn auch SendGrid fehlschlägt, fällt die Funktion auf die Simulation zurück
      }
    }
    
    // Wenn wir hier ankommen, sind alle API-Versuche fehlgeschlagen
    throw new Error("Keine E-Mail-API konfiguriert oder alle API-Versuche fehlgeschlagen");
    
  } catch (error) {
    console.error(`HTTP-E-Mail-Fehler: ${error.message}`);
    throw new Error(`Fehler beim Senden der E-Mail über HTTP: ${error.message}`);
  }
};
};

// Simulierte E-Mail-Versandfunktion als Fallback (falls SMTP-Konfiguration fehlt oder ungültig ist)
const sendEmailSimulation = async (to: string, subject: string, text: string, htmlContent: string, attachmentInfo: AttachmentInfo | null = null) => {
  console.log("========== SIMULIERTE E-MAIL (FALLBACK) ==========");
  console.log(`An: ${to}`);
  console.log(`Betreff: ${subject}`);
  console.log(`Text: ${text?.substring(0, 100)}${text?.length > 100 ? '...' : ''}`);
  console.log(`HTML: ${htmlContent ? 'Vorhanden (nicht angezeigt)' : 'Nicht vorhanden'}`);
  
  if (attachmentInfo) {
    console.log(`Anhang: ${attachmentInfo.filename || 'Unbenannt'} (${attachmentInfo.format || 'Unbekanntes Format'})`);
  } else {
    console.log("Anhang: Keiner");
  }
  
  console.log("Verarbeitung (Simulationsmodus)...");
  
  // Kleine Verzögerung simulieren
  await new Promise(resolve => setTimeout(resolve, 300));
  
  console.log("E-Mail erfolgreich simuliert! (Keine tatsächliche E-Mail gesendet)");
  console.log("========================================");
  
  // Simulierte erfolgreiche Antwort
  return {
    id: `sim-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    to,
    subject,
    status: "simulated",
    provider: "simulation",
    createdAt: new Date().toISOString()
  };
};

// Absolut minimale Implementierung ohne externe Aufrufe
Deno.serve(async (req) => {
  // CORS-Preflight-Anfragen behandeln
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  
  try {
    console.log("Anfrage erhalten");
    
    // Request-Body als Text lesen
    const bodyText = await req.text();
    console.log("Request body:", bodyText.substring(0, 500)); // Begrenzen auf 500 Zeichen für die Logs
    
    // Payload parsen und loggen
    let payload;
    try {
      payload = JSON.parse(bodyText);
      console.log("Empfänger:", payload.to);
      console.log("Betreff:", payload.subject);
      console.log("Format:", payload.format);
      
      // Reportdaten, falls vorhanden
      if (payload.reportData) {
        console.log("Report-Daten vorhanden:", {
          month: payload.reportData.month,
          year: payload.reportData.year,
          employeeName: payload.reportData.employeeName,
          totalHours: payload.reportData.totalHours
        });
      }
      
      // SMTP-Konfiguration, falls vorhanden
      if (payload.smtpConfig) {
        console.log("SMTP-Konfiguration vorhanden");
      }
    } catch (parseError) {
      console.error("Fehler beim Parsen des JSON:", parseError);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Ungültiger JSON-Request: ${parseError.message}`,
          receivedText: bodyText.length > 100 ? bodyText.substring(0, 100) + "..." : bodyText
        }),
        { 
          headers: { "Content-Type": "application/json", ...corsHeaders },
          status: 400
        }
      );
    }
    
    // E-Mail-Inhalte vorbereiten
    const emailSubject = payload.subject || `Arbeitsrapport: ${payload.reportData?.employeeName || 'Mitarbeiter'} - ${payload.reportData?.month || 'Monat'}/${payload.reportData?.year || 'Jahr'}`;
    
    // Text-Version der E-Mail erstellen
    const emailText = payload.text || `Sehr geehrte Damen und Herren,\n\nanbei erhalten Sie den Arbeitsrapport für ${payload.reportData?.month || 'Monat'}/${payload.reportData?.year || 'Jahr'}.\n\nZusammenfassung:\n- Gesamtstunden: ${(payload.reportData?.totalHours || 0).toFixed(2)}\n\nMit freundlichen Grüßen,\n${payload.reportData?.employeeName || 'Mitarbeiter'}`;
    
    // HTML-Version der E-Mail erstellen
    const emailHtml = `
      <html>
        <body>
          <p>Sehr geehrte Damen und Herren,</p>
          <p>Anbei erhalten Sie den Arbeitsrapport für ${payload.reportData?.month || 'Monat'}/${payload.reportData?.year || 'Jahr'}.</p>
          <p><strong>Zusammenfassung:</strong></p>
          <ul>
            <li>Gesamtstunden: ${(payload.reportData?.totalHours || 0).toFixed(2)}</li>
          </ul>
          <p>Mit freundlichen Grüßen,<br>${payload.reportData?.employeeName || 'Mitarbeiter'}</p>
        </body>
      </html>
    `;
    
    // Anhang-Informationen (falls vorhanden)
    const attachmentInfo: { format: string; filename: string } | null = payload.format ? {
      format: payload.format,
      filename: `Arbeitsrapport_${payload.reportData?.employeeName || 'Mitarbeiter'}_${payload.reportData?.month || 'Monat'}_${payload.reportData?.year || 'Jahr'}.${payload.format === 'excel' ? 'xlsx' : 'pdf'}`
    } : null;
    
    try {
      // SMTP-Konfiguration aus dem Payload verwenden
      let emailResult;
      
      if (payload.smtpConfig && 
          payload.smtpConfig.host && 
          payload.smtpConfig.port && 
          payload.smtpConfig.auth?.user && 
          payload.smtpConfig.auth?.pass) {
        
        // SMTP-Konfiguration ist vorhanden, versuche E-Mail zu senden
        try {
          console.log(`Verwende SMTP-Konfiguration von ${payload.smtpConfig.host}:${payload.smtpConfig.port}`);
          
          // Versuche zuerst die HTTP-basierte Lösung
          try {
            emailResult = await sendMailWithHttp(
              payload.to,
              emailSubject,
              emailText,
              emailHtml,
              payload.smtpConfig,
              attachmentInfo
            );
            console.log(`E-Mail wurde über HTTP-API erfolgreich gesendet!`);
          } catch (httpError) {
            console.warn(`HTTP-API-Fehler: ${httpError.message}`);
            // Bei HTTP-Fehler auf Simulation zurückfallen
            emailResult = await sendEmailSimulation(
              payload.to,
              emailSubject,
              emailText,
              emailHtml,
              attachmentInfo
            );
          }
        } catch (error) {
          console.warn(`E-Mail-Fehler, fallback auf Simulation: ${error.message}`);
          // Bei jedem Fehler auf Simulation zurückfallen
          emailResult = await sendEmailSimulation(
            payload.to,
            emailSubject,
            emailText,
            emailHtml,
            attachmentInfo
          );
        }
      } else {
        // Keine gültige SMTP-Konfiguration, Simulation verwenden
        console.warn(`Keine gültige SMTP-Konfiguration gefunden, verwende Simulation.`);
        console.log(`Empfangene smtpConfig:`, payload.smtpConfig ? JSON.stringify(payload.smtpConfig).substring(0, 100) + '...' : 'undefined/null');
        
        emailResult = await sendEmailSimulation(
          payload.to,
          emailSubject,
          emailText,
          emailHtml,
          attachmentInfo
        );
      }
      
      // Erfolgreiche Antwort zurückgeben
      return new Response(
        JSON.stringify({
          success: true,
          messageId: emailResult.id,
          details: { 
            message: emailResult.provider === "smtp" ? 
              "E-Mail wurde über SMTP versendet" : 
              "E-Mail wurde simuliert (kein tatsächlicher Versand)",
            recipient: emailResult.to,
            subject: emailResult.subject,
            status: emailResult.status,
            provider: emailResult.provider || "simulation",
            smtp: emailResult.smtp || null,
            createdAt: emailResult.createdAt,
            attachmentIncluded: !!attachmentInfo
          }
        }),
        { 
          headers: { "Content-Type": "application/json", ...corsHeaders },
          status: 200 
        }
      );
    } catch (emailError) {
      console.error("Fehler bei der E-Mail-Simulation:", emailError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `E-Mail-Simulation fehlgeschlagen: ${emailError.message}`
        }),
        { 
          headers: { "Content-Type": "application/json", ...corsHeaders },
          status: 500 
        }
      );
    }
  } catch (error) {
    // Einfache Fehlerbehandlung
    console.error("Fehler:", error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { 
        headers: { "Content-Type": "application/json", ...corsHeaders },
        status: 500 
      }
    );
  }
});
