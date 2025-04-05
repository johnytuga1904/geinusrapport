console.log("---> RUNNING NEW send-email-with-attachment code - v1.3 <---");

import { serve } from "https://deno.land/std@0.224.0/http/server.ts"; // Use standard URL import
import { SmtpClient } from "jsr:@denodrivers/smtp";
import * as xlsx from "jsr:@libs/xlsx";
import * as csv from "jsr:@std/csv";
import { encodeBase64 } from "jsr:@std/encoding/base64";
import { WorkReportData } from "@/types/reports"; // Adjust path if needed

// Define expected payload structure (matches client-side)
interface SmtpConfigPayload {
  host: string;
  port: number;
  secure?: boolean; // Handled by SmtpClient based on port typically
  auth: {
    user: string;
    pass: string;
  };
}

interface FunctionPayload {
  to: string;
  subject: string;
  text: string;
  smtpConfig: SmtpConfigPayload;
  reportData: WorkReportData;
  format: 'excel' | 'pdf' | 'csv';
}

console.log("Send Email with Attachment Function Initializing...");

serve(async (req: Request) => {
  // --- CORS Headers (for all responses) ---
  // Use wildcard for origin to allow requests from any domain
  console.log(`Request received with headers: ${JSON.stringify(Object.fromEntries(req.headers.entries()))}`);
  
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Content-Type': 'application/json'
  };

  // --- CORS Preflight Handling ---
  if (req.method === 'OPTIONS') {
    console.log("Handling OPTIONS request");
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log(`Request headers: ${JSON.stringify(Object.fromEntries(req.headers.entries()))}`);
    
    // Log request details for debugging
    console.log(`Request URL: ${req.url}`);
    console.log(`Request method: ${req.method}`);
    console.log(`Request mode: ${req.mode}`);
    console.log(`Request credentials: ${req.credentials}`);
    
    console.log(`[${new Date().toISOString()}] Received ${req.method} request`);

    if (req.method !== 'POST') {
      throw new Error("Method not allowed. Only POST is accepted.");
    }

    if (!req.body) {
      throw new Error("Request body is missing.");
    }

    // --- Parse Payload ---
    const payload: FunctionPayload = await req.json();
    console.log(`[${new Date().toISOString()}] Payload parsed successfully. Format: ${payload.format}`);

    const { to, subject, text, smtpConfig, reportData, format } = payload;

    // --- Input Validation (Basic) ---
    if (!to || !smtpConfig || !reportData || !format) {
      throw new Error("Missing required fields in payload.");
    }
    if (!smtpConfig.host || !smtpConfig.port || !smtpConfig.auth?.user || !smtpConfig.auth?.pass) {
      throw new Error("Incomplete SMTP configuration.");
    }
    
    // Ensure we have valid values for subject and text
    const safeSubject = subject || `Arbeitsrapport ${reportData.employeeName || 'Mitarbeiter'} - ${reportData.month || 'Monat'}/${reportData.year || 'Jahr'}`;
    const safeText = text || `Arbeitsrapport für ${reportData.month || 'Monat'}/${reportData.year || 'Jahr'}`;
    
    // Ensure reportData has valid values
    reportData.employeeName = reportData.employeeName || 'Mitarbeiter';
    reportData.month = reportData.month || 'Monat';
    reportData.year = reportData.year || 'Jahr';
    reportData.client = reportData.client || 'Kunde';
    reportData.totalHours = reportData.totalHours || reportData.entries.reduce((sum, entry) => sum + (entry.hours || 0), 0);

    // --- Generate Attachment ---
    let attachmentContent: string; // Base64 encoded content
    let attachmentFilename: string;
    let contentType: string;

    const filenameBase = `Arbeitsrapport_${reportData.employeeName}_${reportData.month}-${reportData.year}`.replace(/\s+/g, '_');

    if (format === 'excel') {
      console.log(`[${new Date().toISOString()}] Generating Excel report...`);
      const wb = xlsx.utils.book_new();
      const wsData = [
        ["Client:", reportData.client],
        ["Mitarbeiter:", reportData.employeeName],
        ["Monat/Jahr:", `${reportData.month}/${reportData.year}`],
        [], // Empty row
        ["Datum", "Projekt", "Tätigkeit", "Stunden"]
      ];
      reportData.entries.forEach(entry => {
        wsData.push([
          entry.date,
          entry.project || 'N/A',
          entry.description,
          entry.hours?.toString() ?? '0'
        ]);
      });
      wsData.push([]); // Empty row
      wsData.push(["Gesamtstunden:", reportData.totalHours?.toFixed(2) ?? '0.00']);

      const ws = xlsx.utils.aoa_to_sheet(wsData);
      xlsx.utils.book_append_sheet(wb, ws, "Arbeitsrapport");

      // Write to buffer (Uint8Array) and encode
      const excelBuffer = xlsx.write(wb, { bookType: 'xlsx', type: 'buffer' }) as Uint8Array;
      attachmentContent = encodeBase64(excelBuffer);
      attachmentFilename = `${filenameBase}.xlsx`;
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      console.log(`[${new Date().toISOString()}] Excel report generated and encoded.`);

    } else if (format === 'csv') {
      console.log(`[${new Date().toISOString()}] Generating CSV report...`);
      const csvHeader = ["Datum", "Projekt", "Tätigkeit", "Stunden"];
      const csvRows = reportData.entries.map(entry => ({
        Datum: entry.date,
        Projekt: entry.project || 'N/A',
        Tätigkeit: entry.description,
        Stunden: entry.hours?.toString() ?? '0'
      }));

      const csvString = await csv.stringify(csvRows, { headers: true, columns: csvHeader });
      // Encode CSV string to Base64
      attachmentContent = encodeBase64(new TextEncoder().encode(csvString));
      attachmentFilename = `${filenameBase}.csv`;
      contentType = 'text/csv';
      console.log(`[${new Date().toISOString()}] CSV report generated and encoded.`);

    } else if (format === 'pdf') {
      console.error("PDF generation is not supported in this function version.");
      throw new Error("PDF format is currently not supported.");
    } else {
      throw new Error(`Unsupported format: ${format}`);
    }

    // --- Configure SMTP Client ---
    const client = new SmtpClient();
    console.log(`[${new Date().toISOString()}] Connecting to SMTP: ${smtpConfig.host}:${smtpConfig.port}`);

    const connectConfig = {
      hostname: smtpConfig.host,
      port: smtpConfig.port,
      username: smtpConfig.auth.user,
      password: smtpConfig.auth.pass,
      // secure/tls might need adjustment based on server requirements
      // By default, uses STARTTLS on port 587, TLS on 465
    };

    await client.connect(connectConfig);
    console.log(`[${new Date().toISOString()}] SMTP connection successful.`);

    // --- Send Email ---
    console.log(`[${new Date().toISOString()}] Sending email to ${to}...`);
    const messageId = await client.send({
      from: smtpConfig.auth.user, // Sender is usually the authenticated user
      to: to,
      subject: safeSubject,
      content: safeText, // Plain text body
      // HTML content can be added with `html: "\u003cp\u003eHello world\u003c/p\u003e"`
      attachments: [{
        filename: attachmentFilename,
        content: attachmentContent,
        encoding: 'base64',
        contentType: contentType,
      }],
    });

    await client.close();
    console.log(`[${new Date().toISOString()}] Email sent successfully. Message ID: ${messageId}`);

    // --- Return Success Response ---
    const responseBody = JSON.stringify({ success: true, messageId: messageId });
    return new Response(responseBody, {
      status: 200,
      headers: corsHeaders
    });

  } catch (error) {
    // --- Error Handling ---
    console.error(`[${new Date().toISOString()}] Error in send-email function:`, error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const responseBody = JSON.stringify({
      success: false,
      error: errorMessage,
      details: error instanceof Error ? error.stack : null, // Include stack trace for debugging
    });

    return new Response(responseBody, {
      status: 500, // Or 400 for client errors like bad payload
      headers: corsHeaders
    });
  }
});

/* 
Example FunctionPayload structure expected by this function:
{
  "to": "recipient@example.com",
  "subject": "Work Report - John Doe - 04/2025",
  "text": "Please find attached the work report.\n\nRegards,\nJohn Doe",
  "smtpConfig": {
    "host": "smtp.example.com",
    "port": 587,
    "secure": false, // Or true if needed
    "auth": {
      "user": "your_email@example.com",
      "pass": "your_password"
    }
  },
  "reportData": {
    "client": "Example Corp",
    "month": 4,
    "year": 2025,
    "totalHours": 160.5,
    "employeeName": "John Doe",
    "entries": [
      { "date": "2025-04-01", "project": "Project A", "description": "Development work", "hours": 8 },
      { "date": "2025-04-02", "project": "Project B", "description": "Meeting", "hours": 1.5 },
      // ... more entries
    ]
  },
  "format": "excel" // or "csv"
}
*/
