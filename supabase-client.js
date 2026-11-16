import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_CONFIGURED } from './supabase-config.js';

let clientPromise;
export async function getSupabaseClient(){
  if(!SUPABASE_CONFIGURED) throw new Error('Falta configurar el URL y la clave publishable de Supabase.');
  if(!clientPromise){
    clientPromise=import('https://esm.sh/@supabase/supabase-js@2').then(({createClient})=>createClient(
      SUPABASE_URL,
      SUPABASE_PUBLISHABLE_KEY,
      {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}
    ));
  }
  return clientPromise;
}

export async function checkSupabaseConnection(){
  try{
    const supabase=await getSupabaseClient();
    const {error}=await supabase.from('hotels').select('id').limit(1);
    if(!error) return {status:'connected',label:'Supabase conectado',detail:'El proyecto responde y la tabla hotels está disponible.'};
    if(error.code==='42P01' || error.code==='PGRST205' || /relation .* does not exist|could not find the table/i.test(error.message||''))
      return {status:'schema',label:'Falta ejecutar la migración SQL',detail:'El proyecto responde, pero todavía no encuentra la tabla hotels.'};
    if(error.code==='42501' || error.code==='PGRST301')
      return {status:'policy',label:'Revisar permisos RLS',detail:error.message};
    return {status:'error',label:'Supabase respondió con un error',detail:error.message||'No se pudo consultar la tabla hotels.'};
  }catch(error){
    return {status:'offline',label:'No se pudo conectar',detail:error?.message||'Revisa tu conexión a internet y la configuración.'};
  }
}

export function paintSupabaseStatus(result){
  const node=document.getElementById('supabase-status');
  if(!node)return;
  node.dataset.status=result.status;
  node.innerHTML=`<span class="supabase-status-dot"></span><span><strong>${escapeHtml(result.label)}</strong><small>${escapeHtml(result.detail)}</small></span><button type="button" data-action="supabase-check" aria-label="Volver a comprobar">↻</button>`;
  node.title=result.detail;
}
function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
