// Vereinfachte E-Mail-Sendefunktion mit Resend API und CORS-Headern
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Define CORS headers that will work with any origin
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Define expected payload structure
interface EmailPayload {
  to: string;
  subject: string;
  text: string;
  reportData: WorkReportData;
  format: 'excel' | 'pdf' | 'csv';
}

// Get Resend API key from environment variables
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

const handler = async (request: Request): Promise<Response> => {
  console.log("---> RUNNING simplified send-email-with-resend function <---");

  // Handle preflight request
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Parse the request body
    const payload = await request.json();
    console.log(`Received email request for: ${payload.to}`);
    
    // Sofort eine Erfolgsantwort zurückgeben, ohne tatsächlich eine E-Mail zu senden
    // Dies ist nur für Testzwecke, um zu prüfen, ob die Funktion überhaupt antwortet
    return new Response(JSON.stringify({
      success: true,
      messageId: 'test-' + Date.now(),
      details: {
        message: 'Dies ist eine Test-Antwort ohne tatsächlichen E-Mail-Versand',
        receivedPayload: {
          to: payload.to,
          subject: payload.subject
        }
      }
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  } catch (error) {
    console.error('Error sending email:', error);
    
    // Return error response with CORS headers
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.stack : null
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  }
};

// Start the server
serve(handler);
