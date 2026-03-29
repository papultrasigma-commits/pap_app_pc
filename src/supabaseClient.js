import { createClient } from '@supabase/supabase-js';

// Vite: environment variables must start with VITE_
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL and/or VITE_SUPABASE_ANON_KEY. Add them to a .env file at the project root.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
