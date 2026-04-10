import { createClient } from '@supabase/supabase-js';

let supabaseClient = null;

export const initSupabase = (url, key) => {
  if (!url || !key) {
    supabaseClient = null;
    return null;
  }
  supabaseClient = createClient(url, key);
  return supabaseClient;
};

export const getSupabase = () => {
  if (!supabaseClient) {
    const url = localStorage.getItem('fraudtrace_supabase_url');
    const key = localStorage.getItem('fraudtrace_supabase_key');
    if (url && key) {
      return initSupabase(url, key);
    }
  }
  return supabaseClient;
};

export const supabase = new Proxy({}, {
  get(target, prop) {
    const client = getSupabase();
    if (!client) {
      console.warn('Supabase client not initialized');
      return null;
    }
    return client[prop];
  }
});

