/* Configuración de PacketPath.
   supabaseKey es la llave pública (publishable / anon). Es seguro que esté aquí:
   la base de datos se protege con las reglas (RLS) de supabase/schema.sql.
   NUNCA pongas aquí la llave secreta (service_role / secret). */
window.LABRED_CONFIG = {
  supabaseUrl: 'https://xjqusoxqtwawvzuzndho.supabase.co',
  supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhqcXVzb3hxdHdhd3Z6dXpuZGhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5NjExNDMsImV4cCI6MjA3ODUzNzE0M30.yzuLjQLqU4oZwEHjT9F5DxRqJkE_VeDj8h7CtR_RhNk',
  // Correos con acceso al Modo creador (desbloquear módulos para probarlos).
  admins: ['noonaameed@gmail.com']
};
