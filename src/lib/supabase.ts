import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://efjindkxttzporvouaaf.supabase.co';
/** Публичный publishable-ключ — предназначен для браузера */
const SUPABASE_KEY = 'sb_publishable_fpXPmThNPg8yVbMTf5LbPA_2Xp71h_2';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);