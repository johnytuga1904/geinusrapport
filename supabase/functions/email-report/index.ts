/// <reference lib="deno.ns" />
/// <reference lib="deno.unstable" />
/// <reference types="@supabase/supabase-js" />

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
// @ts-nocheck
// deno-lint-ignore-file
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6.9.12";

// CORS Headers für Cross-Origin Anfragen
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

// Interface für die JSON-Anfrage
interface EmailRequest {
  to: string;
  subject: string;
  text: string;
  userId: string;
  filename: string;
  fileContent: string; // Base64-codierter Dateiinhalt
  contentType: string;
}

serve(async (req: Request) => {
  console.log("Email-Report Funktion aufgerufen");
  console.log("Request URL:", req.url);
  console.log("Request Method:", req.method);
  
  // CORS preflight requests
  if (req.method === "OPTIONS") {
    console.log("CORS Preflight-Anfrage bearbeitet");
    return new Response("ok", { 
      headers: corsHeaders,
      status: 200
    });
  }

  try {
    // Überprüfe den Content-Type Header
    const contentType = req.headers.get('Content-Type');
    console.log("Content-Type:", contentType);
    
    if (contentType !== 'application/json') {
      console.error("Ungültiger Content-Type:", contentType);
      return new Response(
        JSON.stringify({ error: "Content-Type muss 'application/json' sein" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Überprüfe den Authorization-Header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error("Fehlender Authorization-Header");
      return new Response(
        JSON.stringify({ error: "Fehlender Authorization-Header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Extrahiere den Bearer Token
    const token = authHeader.replace('Bearer ', '');
    if (!token) {
      console.error("Ungültiger Authorization-Header");
      return new Response(
        JSON.stringify({ error: "Ungültiger Authorization-Header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Parse JSON-Anfrage
    let requestData: EmailRequest;
    try {
      requestData = await req.json();
      console.log("JSON-Daten erfolgreich geparst");
    } catch (parseError) {
      console.error("JSON-Parse-Fehler:", parseError);
      return new Response(
        JSON.stringify({ error: "Fehler beim Parsen der JSON-Daten: " + (parseError as Error).message }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }
    
    console.log("Empfangene JSON-Daten:", {
      to: requestData.to,
      subject: requestData.subject,
      userId: requestData.userId,
      filename: requestData.filename,
      contentType: requestData.contentType,
      fileContentLength: requestData.fileContent ? requestData.fileContent.length : 0
    });

    // Überprüfe ob alle benötigten Felder vorhanden sind
    if (!requestData.userId) {
      console.error("Fehlende Benutzer-ID");
      return new Response(
        JSON.stringify({ error: "Benutzer-ID ist erforderlich" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    if (!requestData.fileContent) {
      console.error("Keine Datei gefunden");
      return new Response(
        JSON.stringify({ error: "Keine Datei gefunden" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Decodiere Base64-Dateiinhalt
    let fileContent: Uint8Array;
    try {
      console.log("Decodiere Base64-Dateiinhalt...");
      const base64Data = requestData.fileContent.replace(/^data:.*;base64,/, '');
      fileContent = new Uint8Array(Array.from(atob(base64Data), c => c.charCodeAt(0)));
      
      console.log("Dateiinhalt erfolgreich verarbeitet:", {
        size: fileContent.length,
        firstBytes: fileContent.length > 0 ? 
          Array.from(fileContent.slice(0, 10)).map(b => b.toString(16).padStart(2, '0')).join(' ') :
          'leer'
      });
    } catch (error) {
      console.error("Fehler beim Decodieren des Dateiinhalts:", error);
      return new Response(
        JSON.stringify({ error: `Fehler beim Decodieren des Dateiinhalts: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}` }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Supabase Client für SMTP-Config
    console.log("Erstelle Supabase Client für SMTP-Config...");
    // @ts-ignore - Deno.env ist in der Supabase-Edge-Umgebung verfügbar
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // SMTP-Einstellungen abrufen
    console.log("Rufe SMTP-Konfiguration ab für Benutzer-ID:", requestData.userId);
    const { data: smtpConfig, error: smtpError } = await supabaseClient
      .from("smtp_config")
      .select("*")
      .eq("user_id", requestData.userId)
      .single();

    if (smtpError || !smtpConfig) {
      console.error("SMTP-Konfiguration nicht gefunden:", smtpError);
      return new Response(
        JSON.stringify({ 
          error: "SMTP-Konfiguration nicht gefunden.",
          details: smtpError?.message 
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    console.log("SMTP-Konfiguration geladen:", { 
      host: smtpConfig.host, 
      port: smtpConfig.port,
      user: smtpConfig.username ? '***' : undefined, 
      fromEmail: smtpConfig.from_email
    });

    // E-Mail-Transporter erstellen
    console.log("Erstelle E-Mail-Transporter...");
    const transporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure,
      auth: {
        user: smtpConfig.username,
        pass: smtpConfig.password,
      },
    });

    // E-Mail mit Anhang senden
    const mailOptions = {
      from: smtpConfig.from_email,
      to: requestData.to,
      subject: requestData.subject,
      text: requestData.text,
      attachments: [
        {
          filename: requestData.filename,
          content: fileContent,
          contentType: requestData.contentType || 'text/csv;charset=utf-8'
        }
      ],
    };

    console.log("Sende E-Mail mit Anhang:", {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject,
      attachmentName: mailOptions.attachments[0].filename,
      attachmentType: mailOptions.attachments[0].contentType,
      attachmentSize: fileContent.length
    });

    try {
      console.log("Rufe sendMail auf...");
      const info = await transporter.sendMail(mailOptions);
      console.log("E-Mail erfolgreich gesendet:", info.messageId);

      return new Response(
        JSON.stringify({ 
          success: true, 
          messageId: info.messageId,
          message: "E-Mail erfolgreich gesendet"
        }),
        { 
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/json" 
          } 
        }
      );
    } catch (sendError: any) {
      console.error("Fehler beim Senden der E-Mail:", sendError);
      return new Response(
        JSON.stringify({ 
          error: `Fehler beim Senden der E-Mail: ${sendError.message}`,
          details: sendError.stack
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Allgemeiner Fehler beim Senden der E-Mail:", err);
    return new Response(
      JSON.stringify({ 
        error: err.message,
        details: err.stack
      }),
      {
        status: 500,
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json" 
        },
      }
    );
  }
}); 