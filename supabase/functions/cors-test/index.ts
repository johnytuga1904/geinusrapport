// Simple CORS test function
console.log("CORS Test Function v1.0");

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

serve(async (req) => {
  // Get the origin from the request
  const origin = req.headers.get('origin') || '*';
  console.log(`Request origin: ${origin}`);
  console.log(`Request headers: ${JSON.stringify(Object.fromEntries(req.headers.entries()))}`);
  
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, origin, accept',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json'
  };
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    console.log("Handling OPTIONS request");
    return new Response('ok', { headers: corsHeaders });
  }
  
  try {
    console.log(`Request method: ${req.method}`);
    console.log(`Request URL: ${req.url}`);
    
    // Simple success response
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "CORS test successful",
        receivedHeaders: Object.fromEntries(req.headers.entries())
      }),
      { 
        status: 200,
        headers: corsHeaders
      }
    );
  } catch (error) {
    console.error("Error in CORS test function:", error);
    
    // Error response with CORS headers
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { 
        status: 500,
        headers: corsHeaders
      }
    );
  }
});
