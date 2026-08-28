// ============================================================
// COMMUNITY HOSPITAL AFARI
// SUPABASE CONNECTION
// ============================================================

const SUPABASE_URL =
    "https://voctsimbywlvmwhovjxa.supabase.co";

const SUPABASE_ANON_KEY =
    "sb_publishable_tbh6Mktihaq5-_pZmlS0uw_wj4m_pUL";

const chaSupabase = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);

window.CHA_SUPABASE = chaSupabase;
