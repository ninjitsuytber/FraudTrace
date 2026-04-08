import { createClient } from '@supabase/supabase-js';

// Replace these with your actual Supabase project credentials.
// These should ideally be moved to an .env file for security in a real production environment.
const supabaseUrl = 'https://your-project-id.supabase.co';
const supabaseAnonKey = 'your-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
