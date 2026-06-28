const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

function getEnv() {
  const envPath = path.join(__dirname, '../.env.local');
  if (!fs.existsSync(envPath)) {
    console.error("Error: .env.local no existe.");
    process.exit(1);
  }
  const content = fs.readFileSync(envPath, 'utf8');
  const env = {};
  content.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      env[parts[0].trim()] = parts.slice(1).join('=').trim();
    }
  });
  return env;
}

const env = getEnv();
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Error: Credenciales de Supabase no encontradas en .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const COUNTRIES = [
  { name: "Sudáfrica", flag: "🇿🇦", code: "RSA" },
  { name: "Canadá", flag: "🇨🇦", code: "CAN" },
  { name: "Brasil", flag: "🇧🇷", code: "BRA" },
  { name: "Japón", flag: "🇯🇵", code: "JPN" },
  { name: "Alemania", flag: "🇩🇪", code: "GER" },
  { name: "Paraguay", flag: "🇵🇾", code: "PAR" },
  { name: "Países Bajos", flag: "🇳🇱", code: "NED" },
  { name: "Marruecos", flag: "🇲🇦", code: "MAR" },
  { name: "C. de Marfil", flag: "🇨🇮", code: "CIV" },
  { name: "Noruega", flag: "🇳🇴", code: "NOR" },
  { name: "Francia", flag: "🇫🇷", code: "FRA" },
  { name: "Suecia", flag: "🇸🇪", code: "SWE" },
  { name: "Argentina", flag: "🇦🇷", code: "ARG" },
  { name: "Australia", flag: "🇦🇺", code: "AUS" },
  { name: "España", flag: "🇪🇸", code: "ESP" },
  { name: "Camerún", flag: "🇨🇲", code: "CMR" },
  { name: "Inglaterra", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", code: "ENG" },
  { name: "Ecuador", flag: "🇪🇨", code: "ECU" },
  { name: "Portugal", flag: "🇵🇹", code: "POR" },
  { name: "Corea del Sur", flag: "🇰🇷", code: "KOR" },
  { name: "Italia", flag: "🇮🇹", code: "ITA" },
  { name: "Egipto", flag: "🇪🇬", code: "EGY" },
  { name: "Bélgica", flag: "🇧🇪", code: "BEL" },
  { name: "Senegal", flag: "🇸🇳", code: "SEN" },
  { name: "Uruguay", flag: "🇺🇾", code: "URU" },
  { name: "Irán", flag: "🇮🇷", code: "IRN" },
  { name: "Croacia", flag: "🇭🇷", code: "CRO" },
  { name: "Argelia", flag: "🇩🇿", code: "ALG" },
  { name: "Colombia", flag: "🇨🇴", code: "COL" },
  { name: "Túnez", flag: "🇹🇳", code: "TUN" },
  { name: "México", flag: "🇲🇽", code: "MEX" },
  { name: "EE. UU.", flag: "🇺🇸", code: "USA" }
];

async function seed() {
  console.log(`📦 Sembrando ${COUNTRIES.length} países en 'quiniela_countries'...`);

  const { data, error } = await supabase.from('quiniela_countries').upsert(
    COUNTRIES,
    { onConflict: 'code' }
  );

  if (error) {
    console.error("❌ Error:", error.message);
    console.log("\n⚠️  La tabla 'quiniela_countries' no existe aún.");
    console.log("📋 Para crearla, ejecuta este SQL en el SQL Editor de Supabase:\n");
    console.log("CREATE TABLE IF NOT EXISTS public.quiniela_countries (");
    console.log("    code text PRIMARY KEY,");
    console.log("    name text NOT NULL,");
    console.log("    flag text NOT NULL");
    console.log(");");
    console.log("ALTER TABLE public.quiniela_countries ENABLE ROW LEVEL SECURITY;");
    console.log("CREATE POLICY \"Allow public read on countries\"");
    console.log("  ON public.quiniela_countries FOR SELECT USING (true);");
    console.log("CREATE POLICY \"Allow all on countries\"");
    console.log("  ON public.quiniela_countries FOR ALL USING (true) WITH CHECK (true);");
    console.log("\nDespués de crear la tabla, ejecuta este script de nuevo con: npm run seed");
  } else {
    console.log("✅ ¡Países sembrados exitosamente en la base de datos!");
  }
}

seed();
