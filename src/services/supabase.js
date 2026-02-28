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
