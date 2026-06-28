const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables manually
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
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim();
      env[key] = val;
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

// List of matches from MATCHES
const MATCHES = [
  { teamA: { name: "Sudáfrica", flag: "🇿🇦", code: "RSA" }, teamB: { name: "Canadá", flag: "🇨🇦", code: "CAN" } },
  { teamA: { name: "Brasil", flag: "🇧🇷", code: "BRA" }, teamB: { name: "Japón", flag: "🇯🇵", code: "JPN" } },
  { teamA: { name: "Alemania", flag: "🇩🇪", code: "GER" }, teamB: { name: "Paraguay", flag: "🇵🇾", code: "PAR" } },
  { teamA: { name: "Países Bajos", flag: "🇳🇱", code: "NED" }, teamB: { name: "Marruecos", flag: "🇲🇦", code: "MAR" } },
  { teamA: { name: "C. de Marfil", flag: "🇨🇮", code: "CIV" }, teamB: { name: "Noruega", flag: "🇳🇴", code: "NOR" } },
  { teamA: { name: "Francia", flag: "🇫🇷", code: "FRA" }, teamB: { name: "Suecia", flag: "🇸🇪", code: "SWE" } },
  { teamA: { name: "Argentina", flag: "🇦🇷", code: "ARG" }, teamB: { name: "Australia", flag: "🇦🇺", code: "AUS" } },
  { teamA: { name: "España", flag: "🇪🇸", code: "ESP" }, teamB: { name: "Camerún", flag: "🇨🇲", code: "CMR" } },
  { teamA: { name: "Inglaterra", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", code: "ENG" }, teamB: { name: "Ecuador", flag: "🇪🇨", code: "ECU" } },
  { teamA: { name: "Portugal", flag: "🇵🇹", code: "POR" }, teamB: { name: "Corea del Sur", flag: "🇰🇷", code: "KOR" } },
  { teamA: { name: "Italia", flag: "🇮🇹", code: "ITA" }, teamB: { name: "Egipto", flag: "🇪🇬", code: "EGY" } },
  { teamA: { name: "Bélgica", flag: "🇧🇪", code: "BEL" }, teamB: { name: "Senegal", flag: "🇸🇳", code: "SEN" } },
  { teamA: { name: "Uruguay", flag: "🇺🇾", code: "URU" }, teamB: { name: "Irán", flag: "🇮🇷", code: "IRN" } },
  { teamA: { name: "Croacia", flag: "🇭🇷", code: "CRO" }, teamB: { name: "Argelia", flag: "🇩🇿", code: "ALG" } },
  { teamA: { name: "Colombia", flag: "🇨🇴", code: "COL" }, teamB: { name: "Túnez", flag: "🇹🇳", code: "TUN" } },
  { teamA: { name: "México", flag: "🇲🇽", code: "MEX" }, teamB: { name: "EE. UU.", flag: "🇺🇸", code: "USA" } }
];

async function seed() {
  const countriesMap = {};
  MATCHES.forEach(m => {
    if (m.teamA && m.teamA.code) {
      countriesMap[m.teamA.code] = { code: m.teamA.code, name: m.teamA.name, flag: m.teamA.flag };
    }
    if (m.teamB && m.teamB.code) {
      countriesMap[m.teamB.code] = { code: m.teamB.code, name: m.teamB.name, flag: m.teamB.flag };
    }
  });

  const countries = Object.values(countriesMap);
  console.log(`Encontrados ${countries.length} países únicos en los partidos de 16avos.`);

  console.log("Insertando/Actualizando países en 'quiniela_countries'...");
  const { data, error } = await supabase.from('quiniela_countries').upsert(countries);
  
  if (error) {
    console.error("Error al insertar en Supabase:", error.message);
    console.log("\n⚠️ Si la tabla no existe, ejecuta esta consulta SQL en el panel de Supabase:");
    console.log(`
CREATE TABLE IF NOT EXISTS public.quiniela_countries (
    code text PRIMARY KEY,
    name text NOT NULL,
    flag text NOT NULL
);
ALTER TABLE public.quiniela_countries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read on countries" ON public.quiniela_countries FOR SELECT USING (true);
CREATE POLICY "Allow all on countries" ON public.quiniela_countries FOR ALL USING (true) WITH CHECK (true);
    `);
  } else {
    console.log("¡Países sembrados exitosamente en la base de datos!");
  }
}

seed();
