// World Cup 2026 — Round of 32 match data
// All dates in UTC. Display in America/Mexico_City timezone.
// Sources: FIFA.com, NBC Sports, Al Jazeera — verified June 28, 2026
export const MATCHES = [
  {
    id: 1,
    teamA: { name: "Sudáfrica", flag: "🇿🇦", code: "RSA" },
    teamB: { name: "Canadá", flag: "🇨🇦", code: "CAN" },
    date: "2026-06-28T19:00:00Z", // 1:00 PM CDMX (12pm PT, 3pm ET)
    venue: "Los Ángeles",
    result: null,
  },
  {
    id: 2,
    teamA: { name: "Brasil", flag: "🇧🇷", code: "BRA" },
    teamB: { name: "Japón", flag: "🇯🇵", code: "JPN" },
    date: "2026-06-29T18:00:00Z", // 12:00 PM CDMX (1pm ET)
    venue: "Houston",
    result: null,
  },
  {
    id: 3,
    teamA: { name: "Alemania", flag: "🇩🇪", code: "GER" },
    teamB: { name: "Paraguay", flag: "🇵🇾", code: "PAR" },
    date: "2026-06-29T21:30:00Z", // 3:30 PM CDMX (4:30pm ET)
    venue: "Boston",
    result: null,
  },
  {
    id: 4,
    teamA: { name: "Países Bajos", flag: "🇳🇱", code: "NED" },
    teamB: { name: "Marruecos", flag: "🇲🇦", code: "MAR" },
    date: "2026-06-30T02:00:00Z", // 8:00 PM CDMX Jun 29 (9pm ET)
    venue: "Monterrey",
    result: null,
  },
  {
    id: 5,
    teamA: { name: "C. de Marfil", flag: "🇨🇮", code: "CIV" },
    teamB: { name: "Noruega", flag: "🇳🇴", code: "NOR" },
    date: "2026-06-30T18:00:00Z", // 12:00 PM CDMX (1pm ET)
    venue: "Dallas",
    result: null,
  },
  {
    id: 6,
    teamA: { name: "Francia", flag: "🇫🇷", code: "FRA" },
    teamB: { name: "Suecia", flag: "🇸🇪", code: "SWE" },
    date: "2026-06-30T22:00:00Z", // 4:00 PM CDMX (5pm ET)
    venue: "Nueva York",
    result: null,
  },
  {
    id: 7,
    teamA: { name: "México", flag: "🇲🇽", code: "MEX" },
    teamB: { name: "Ecuador", flag: "🇪🇨", code: "ECU" },
    date: "2026-07-01T02:00:00Z", // 8:00 PM CDMX Jun 30 (9pm ET)
    venue: "Guadalajara",
    result: null,
  },
  {
    id: 8,
    teamA: { name: "Inglaterra", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", code: "ENG" },
    teamB: { name: "RD Congo", flag: "🇨🇩", code: "COD" },
    date: "2026-07-01T17:00:00Z", // 11:00 AM CDMX (12pm ET)
    venue: "Filadelfia",
    result: null,
  },
  {
    id: 9,
    teamA: { name: "Bélgica", flag: "🇧🇪", code: "BEL" },
    teamB: { name: "Senegal", flag: "🇸🇳", code: "SEN" },
    date: "2026-07-01T21:00:00Z", // 3:00 PM CDMX (4pm ET)
    venue: "Houston",
    result: null,
  },
  {
    id: 10,
    teamA: { name: "Estados Unidos", flag: "🇺🇸", code: "USA" },
    teamB: { name: "Bosnia", flag: "🇧🇦", code: "BIH" },
    date: "2026-07-02T01:00:00Z", // 7:00 PM CDMX Jul 1 (8pm ET)
    venue: "Santa Clara",
    result: null,
  },
  {
    id: 11,
    teamA: { name: "España", flag: "🇪🇸", code: "ESP" },
    teamB: { name: "Austria", flag: "🇦🇹", code: "AUT" },
    date: "2026-07-02T20:00:00Z", // 2:00 PM CDMX (3pm ET)
    venue: "Miami",
    result: null,
  },
  {
    id: 12,
    teamA: { name: "Portugal", flag: "🇵🇹", code: "POR" },
    teamB: { name: "Croacia", flag: "🇭🇷", code: "CRO" },
    date: "2026-07-03T00:00:00Z", // 6:00 PM CDMX Jul 2 (7pm ET)
    venue: "Atlanta",
    result: null,
  },
  {
    id: 13,
    teamA: { name: "Suiza", flag: "🇨🇭", code: "SUI" },
    teamB: { name: "Argelia", flag: "🇩🇿", code: "ALG" },
    date: "2026-07-03T04:00:00Z", // 10:00 PM CDMX Jul 2 (11pm ET)
    venue: "Seattle",
    result: null,
  },
  {
    id: 14,
    teamA: { name: "Australia", flag: "🇦🇺", code: "AUS" },
    teamB: { name: "Egipto", flag: "🇪🇬", code: "EGY" },
    date: "2026-07-03T19:00:00Z", // 1:00 PM CDMX (2pm ET)
    venue: "Dallas",
    result: null,
  },
  {
    id: 15,
    teamA: { name: "Argentina", flag: "🇦🇷", code: "ARG" },
    teamB: { name: "Cabo Verde", flag: "🇨🇻", code: "CPV" },
    date: "2026-07-03T23:00:00Z", // 5:00 PM CDMX (6pm ET)
    venue: "Miami",
    result: null,
  },
  {
    id: 16,
    teamA: { name: "Colombia", flag: "🇨🇴", code: "COL" },
    teamB: { name: "Ghana", flag: "🇬🇭", code: "GHA" },
    date: "2026-07-04T01:30:00Z", // 7:30 PM CDMX Jul 3 (8:30pm ET)
    venue: "Kansas City",
    result: null,
  },
];
