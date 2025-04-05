import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6.9.12";
import ExcelJS from "npm:exceljs";
import jsPDF from "npm:jspdf@2.5.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { to, subject, userId, reportData, format } = await req.json();

    if (!userId || !reportData) {
      throw new Error("Benutzer-ID und Daten sind erforderlich");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: smtpConfig } = await supabase
      .from("smtp_config")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (!smtpConfig) throw new Error("SMTP Config nicht gefunden!");

    let buffer;
    let filename;
    let contentType;

    if (format === "xlsx") {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Wochenrapport");

      // Titel
      worksheet.mergeCells('A1:E1');
      const titleCell = worksheet.getCell('A1');
      titleCell.value = 'Wochenrapport';
      titleCell.font = { size: 16, bold: true };
      titleCell.alignment = { horizontal: 'center' };

      // Datum
      worksheet.mergeCells('A2:E2');
      const dateCell = worksheet.getCell('A2');
      dateCell.value = `Erstellt am: ${new Date().toLocaleDateString()}`;
      dateCell.font = { size: 12, italic: true };
      dateCell.alignment = { horizontal: 'center' };

      // Spalten definieren
      worksheet.columns = [
        { header: "Datum", key: "date", width: 15 },
        { header: "Projekt", key: "project", width: 30 },
        { header: "Beschreibung", key: "description", width: 50 },
        { header: "Stunden", key: "hours", width: 12 },
        { header: "Bemerkung", key: "note", width: 25 },
      ];

      // Überschriften formatieren
      const headerRow = worksheet.getRow(4);
      headerRow.font = { bold: true, size: 12 };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '4285F4' }
      };
      headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };

      // Daten einfügen
      reportData.forEach((entry, index) => {
        const row = worksheet.addRow(entry);
        
        // Alternierende Zeilenfarben
        if (index % 2 === 0) {
          row.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'F5F5F5' }
          };
        }
        
        // Zellenformatierung
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
          cell.alignment = { vertical: 'middle', wrapText: true };
        });
      });

      // Summenzeile
      const totalRow = worksheet.addRow({
        date: 'Gesamt',
        hours: reportData.reduce((sum, entry) => sum + entry.hours, 0)
      });
      totalRow.font = { bold: true };
      totalRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'E3F2FD' }
      };

      buffer = await workbook.xlsx.writeBuffer();
      filename = "wochenrapport.xlsx";
      contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    } else if (format === "pdf") {
      const doc = new jsPDF();
      
      // Titel
      doc.setFontSize(16);
      doc.text('Wochenrapport', 14, 20);
      
      // Untertitel
      doc.setFontSize(12);
      doc.text(`Erstellt am: ${new Date().toLocaleDateString()}`, 14, 30);
      
      // Tabelle
      doc.autoTable({
        startY: 40,
        head: [['Datum', 'Projekt', 'Beschreibung', 'Stunden', 'Bemerkung']],
        body: reportData.map(entry => [
          entry.date,
          entry.project,
          entry.description,
          entry.hours.toString(),
          entry.note || ''
        ]),
        styles: {
          fontSize: 10,
          cellPadding: 3,
        },
        headStyles: {
          fillColor: [66, 139, 202],
          textColor: 255,
          fontStyle: 'bold'
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245]
        }
      });

      buffer = doc.output('arraybuffer');
      filename = "wochenrapport.pdf";
      contentType = "application/pdf";
    } else {
      throw new Error("Unbekanntes Format");
    }

    const base64File = btoa(String.fromCharCode(...new Uint8Array(buffer)));

    const transporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure,
      auth: { user: smtpConfig.username, pass: smtpConfig.password },
    });

    const info = await transporter.sendMail({
      from: smtpConfig.from_email,
      to,
      subject,
      text: "Anbei Ihr Wochenrapport.",
      attachments: [{
        filename,
        content: base64File,
        encoding: "base64",
        contentType
      }]
    });

    return new Response(JSON.stringify({ success: true, messageId: info.messageId }), { headers: corsHeaders });

  } catch (error) {
    console.error("Fehler beim Senden:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
}); 