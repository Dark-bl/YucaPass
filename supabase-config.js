// Claves publicas del cliente. La publishable key puede estar en el frontend
// siempre que las tablas tengan RLS habilitado. Nunca colocar aqui una secret key.
export const SUPABASE_URL = "https://razuzgaulxkknnwqadau.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_saVabBvE3oBNmnhSq4U3Iw_zcVDYf3l";
export const SUPABASE_CONFIGURED = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);
