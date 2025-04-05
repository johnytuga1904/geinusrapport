import { supabase } from "@/lib/supabase";

/**
 * Simple test function to diagnose CORS issues with Supabase functions
 */
export async function testEmailFunction() {
  try {
    console.log('Testing Supabase function connection...');
    
    // Simple test payload
    const testPayload = {
      test: true,
      timestamp: new Date().toISOString()
    };
    
    // Log the request details
    console.log('Sending test request to send-email-with-attachment function');
    console.log('Payload:', testPayload);
    
    // Add explicit headers for CORS
    const options = {
      body: JSON.stringify(testPayload),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };
    
    // Make the function call with fetch directly instead of using supabase.functions.invoke
    const supabaseUrl = supabase.supabaseUrl;
    const supabaseKey = supabase.supabaseKey;
    const functionUrl = `${supabaseUrl}/functions/v1/send-email-with-attachment`;
    
    console.log('Function URL:', functionUrl);
    
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify(testPayload),
      mode: 'cors',
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`Function returned status ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Function response:', data);
    return data;
    
  } catch (error) {
    console.error('Error testing email function:', error);
    throw error;
  }
}
