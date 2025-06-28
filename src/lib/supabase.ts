import { createClient } from "@supabase/supabase-js";
import { Database } from "./database.types";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://teamhqfwvdmexreparjt.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlYW1ocWZ3dmRtZXhyZXBhcmp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwNTYwOTQsImV4cCI6MjA2NjYzMjA5NH0.Jexrv7ZDCPHh73lKkObo2yuWwVzml-YFK8I_ZlmO3V4";

// Enhanced validation
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Environment variables:", {
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY ? "Present" : "Missing",
  });
  throw new Error(
    `Missing Supabase environment variables. URL: ${
      supabaseUrl ? "Present" : "Missing"
    }, Key: ${supabaseAnonKey ? "Present" : "Missing"}`
  );
}

// Validate URL format
try {
  new URL(supabaseUrl);
} catch (error) {
  console.error("Invalid Supabase URL:", supabaseUrl);
  throw new Error(
    `Invalid Supabase URL format: ${supabaseUrl}. Please check your VITE_SUPABASE_URL in .env file.`
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// Add a test function to verify connection
export const testSupabaseConnection = async () => {
  try {
    const { data, error } = await supabase.from('user_profiles').select('count').limit(1);
    if (error) {
      console.error('Supabase connection test failed:', error);
      return false;
    }
    console.log('Supabase connection test successful');
    return true;
  } catch (err) {
    console.error('Supabase connection test error:', err);
    return false;
  }
};
