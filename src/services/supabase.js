// Supabase Client — Cloud Backend (Optional)
// When VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are not set,
// supabaseClient is null and the app operates in fully offline/local mode.

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseClient = (supabaseUrl && supabaseKey)
  ? createClient(supabaseUrl, supabaseKey)
  : null;

export const isSupabaseEnabled = () => supabaseClient !== null;

// Ping the Supabase auth health endpoint before any operation that would
// redirect the browser (OAuth) or make a network request. Returns false if
// the project is paused, deleted, or the device is offline.
export const checkSupabaseReachable = async () => {
  if (!supabaseUrl) return false;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(`${supabaseUrl}/auth/v1/health`, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timer);
    return res.status < 500;
  } catch {
    return false;
  }
};
