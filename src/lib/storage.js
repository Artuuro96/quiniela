import { supabase } from './supabase';

const KEYS = {
  CURRENT_USER: "quiniela_current_user",
};

function checkSupabase() {
  if (!supabase) throw new Error("Supabase no está configurado. Por favor, añade tus credenciales a .env.local");
}

// --- Partidos (Matches) ---
export async function getCustomMatches() {
  if (!supabase) return null;
  const { data, error } = await supabase.from('quiniela_matches').select('*').order('id', { ascending: true });
  if (error) {
    console.error("Error getCustomMatches:", error);
    return null;
  }
  if (!data || data.length === 0) return null;
  
  return data.map(d => ({
    id: d.id,
    stage: d.stage,
    date: d.match_date,
    venue: d.venue,
    teamA: { name: d.team_a_name, flag: d.team_a_flag, code: d.team_a_code },
    teamB: { name: d.team_b_name, flag: d.team_b_flag, code: d.team_b_code }
  }));
}

export async function saveCustomMatches(matches) {
  checkSupabase();
  await supabase.from('quiniela_matches').delete().neq('id', -1);
  const payload = matches.map(m => ({
    id: m.id,
    stage: m.stage || '16avos',
    match_date: m.date,
    venue: m.venue,
    team_a_name: m.teamA.name,
    team_a_flag: m.teamA.flag,
    team_a_code: m.teamA.code,
    team_b_name: m.teamB.name,
    team_b_flag: m.teamB.flag,
    team_b_code: m.teamB.code,
  }));
  const { error } = await supabase.from('quiniela_matches').insert(payload);
  if (error) throw new Error(error.message);
}

export async function clearCustomMatches() {
  checkSupabase();
  await supabase.from('quiniela_matches').delete().neq('id', -1);
}

// --- Usuarios ---
export async function getUsers() {
  if (!supabase) return [];
  const { data, error } = await supabase.from('quiniela_users').select('username');
  if (error) return [];
  return data;
}

export async function registerUser(username) {
  checkSupabase();
  const { error } = await supabase.from('quiniela_users').insert([{ username: username.toLowerCase() }]);
  if (error) {
    return { ok: false, error: "Ese usuario ya existe o hubo un error al registrarlo." };
  }
  return { ok: true };
}

export async function loginUser(username) {
  checkSupabase();
  const { data, error } = await supabase.from('quiniela_users')
    .select('username')
    .eq('username', username.toLowerCase())
    .single();
    
  if (error || !data) {
    return { ok: false, error: "Usuario no encontrado. Si eres nuevo, regístrate aquí abajo." };
  }
  if (typeof window !== "undefined") {
    localStorage.setItem(KEYS.CURRENT_USER, data.username);
  }
  return { ok: true, username: data.username };
}

export async function deleteUser(username) {
  checkSupabase();
  await supabase.from('quiniela_users').delete().eq('username', username.toLowerCase());
}

export function getCurrentUser() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(KEYS.CURRENT_USER);
}

export function logoutUser() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(KEYS.CURRENT_USER);
  }
}

// --- Votos ---
export async function getAllVotes() {
  if (!supabase) return {};
  const { data, error } = await supabase.from('quiniela_votes').select('*');
  if (error) return {};
  
  const votesObj = {};
  data.forEach(v => {
    if (!votesObj[v.username]) votesObj[v.username] = {};
    votesObj[v.username][String(v.match_id)] = { goalsA: v.goals_a, goalsB: v.goals_b };
  });
  return votesObj;
}

export async function getUserVotes(username) {
  const all = await getAllVotes();
  return all[username.toLowerCase()] || {};
}

export async function setVote(username, matchId, goalsA, goalsB) {
  checkSupabase();
  const { error } = await supabase.from('quiniela_votes').upsert(
    { username: username.toLowerCase(), match_id: matchId, goals_a: goalsA, goals_b: goalsB },
    { onConflict: 'username, match_id' }
  );
  if (error) console.error("setVote error", error);
}

export async function removeVote(username, matchId) {
  checkSupabase();
  await supabase.from('quiniela_votes').delete().match({ username: username.toLowerCase(), match_id: matchId });
}

// --- Resultados ---
export async function getResults() {
  if (!supabase) return {};
  const { data, error } = await supabase.from('quiniela_results').select('*');
  if (error) return {};
  const res = {};
  data.forEach(r => {
    res[String(r.match_id)] = { goalsA: r.goals_a, goalsB: r.goals_b };
  });
  return res;
}

export async function setResult(matchId, goalsA, goalsB) {
  checkSupabase();
  await supabase.from('quiniela_results').upsert(
    { match_id: matchId, goals_a: goalsA, goals_b: goalsB },
    { onConflict: 'match_id' }
  );
}

export async function clearResult(matchId) {
  checkSupabase();
  await supabase.from('quiniela_results').delete().eq('match_id', matchId);
}

export async function clearAllData() {
  checkSupabase();
  await supabase.from('quiniela_votes').delete().neq('username', '');
  await supabase.from('quiniela_results').delete().neq('match_id', -1);
  await supabase.from('quiniela_users').delete().neq('username', '');
}

export async function restoreAllData(data) {
  checkSupabase();
  await clearAllData();
  
  if (data.users && data.users.length > 0) {
    const userPayload = data.users.map(u => ({ username: u.username.toLowerCase() }));
    await supabase.from('quiniela_users').insert(userPayload);
  }

  if (data.votes) {
    const votePayload = [];
    Object.keys(data.votes).forEach(user => {
      const uVotes = data.votes[user];
      Object.keys(uVotes).forEach(mid => {
        votePayload.push({
          username: user.toLowerCase(),
          match_id: parseInt(mid),
          goals_a: uVotes[mid].goalsA,
          goals_b: uVotes[mid].goalsB
        });
      });
    });
    if (votePayload.length > 0) {
      await supabase.from('quiniela_votes').insert(votePayload);
    }
  }

  if (data.results) {
    const resPayload = [];
    Object.keys(data.results).forEach(mid => {
      resPayload.push({
        match_id: parseInt(mid),
        goals_a: data.results[mid].goalsA,
        goals_b: data.results[mid].goalsB
      });
    });
    if (resPayload.length > 0) {
      await supabase.from('quiniela_results').insert(resPayload);
    }
  }
}

export function scoreVote(vote, realResult) {
  if (!vote || !realResult) return null;
  if (vote.goalsA === realResult.goalsA && vote.goalsB === realResult.goalsB) return 2;
  const voteDiff = vote.goalsA - vote.goalsB;
  const realDiff = realResult.goalsA - realResult.goalsB;
  if (
    (voteDiff > 0 && realDiff > 0) ||
    (voteDiff < 0 && realDiff < 0) ||
    (voteDiff === 0 && realDiff === 0)
  ) return 1;
  return 0;
}

export async function getLeaderboard() {
  const users = await getUsers();
  const votes = await getAllVotes();
  const results = await getResults();

  const board = users.map((u) => {
    let pts = 0;
    let exact = 0;
    let out = 0;
    const uVotes = votes[u.username] || {};

    Object.keys(results).forEach((matchId) => {
      const matchVote = uVotes[matchId];
      if (matchVote) {
        const s = scoreVote(matchVote, results[matchId]);
        if (s === 2) { pts += 2; exact++; }
        else if (s === 1) { pts += 1; out++; }
      }
    });

    return { username: u.username, points: pts, exact, outcomes: out };
  });

  return board.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.exact !== a.exact) return b.exact - a.exact;
    return b.outcomes - a.outcomes;
  });
}
