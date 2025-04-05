import { supabase } from "@/lib/supabase";

/**
 * A proxy service to handle Supabase function calls without CORS issues
 */
class ProxyService {
  /**
   * Call a Supabase function through the Supabase client's RPC mechanism
   * which avoids CORS issues
   * 
   * @param functionName The name of the Supabase function to call
   * @param payload The payload to send to the function
   * @returns The response from the function
   */
  async callFunction<T>(functionName: string, payload: any): Promise<T> {
    try {
      console.log(`[${new Date().toISOString()}] Calling function ${functionName} via RPC proxy`);
      console.log(`[${new Date().toISOString()}] Payload:`, payload);
      
      // Use Supabase's RPC mechanism which handles CORS properly
      const { data, error } = await supabase
        .rpc(functionName, payload);
      
      if (error) {
        console.error(`[${new Date().toISOString()}] Error calling function ${functionName}:`, error);
        throw new Error(`Error calling function ${functionName}: ${error.message}`);
      }
      
      console.log(`[${new Date().toISOString()}] Function ${functionName} response:`, data);
      return data as T;
    } catch (err) {
      console.error(`[${new Date().toISOString()}] Error in proxy service:`, err);
      throw err;
    }
  }
}

export const proxyService = new ProxyService();
