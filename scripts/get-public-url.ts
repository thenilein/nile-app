import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://oahzxvhoxqkbsjcrnpqk.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_6_lSYfdrrzfqG7fkeyofLA_7N2X4RZY';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const { data } = supabase
    .storage
    .from('website')
    .getPublicUrl('production/index.html');

console.log('Public URL:', data.publicUrl);
