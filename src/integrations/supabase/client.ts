// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://xbvjposgjusjngetlpfa.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhidmpwb3NnanVzam5nZXRscGZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU4NDIxNTQsImV4cCI6MjA1MTQxODE1NH0.1Mtoh0rSzZNfxosnIqRI1_OilSCG8V9kwK2faeTGaOQ";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);