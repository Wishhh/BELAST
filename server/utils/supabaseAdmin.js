import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''; // Needs Service Role Key to bypass RLS

// Use the Service Role Key on the server ONLY!
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
