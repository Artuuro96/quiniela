// localStorage helpers for the Quiniela app
const KEYS = {
  USERS: "quiniela_users",
  CURRENT_USER: "quiniela_current_user",
  VOTES: "quiniela_votes",
  RESULTS: "quiniela_results",
  CUSTOM_MATCHES: "quiniela_custom_matches",
};

export function getCustomMatches() {
  return get(KEYS.CUSTOM_MATCHES);
}

export function saveCustomMatches(matches) {
  set(KEYS.CUSTOM_MATCHES, matches);
}

export function clearCustomMatches() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(KEYS.CUSTOM_MATCHES);
  }
}


function get(key) {
  if (typeof window === "undefined") return null;
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

function set(key, value) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

// ---- Users ----

export function getUsers() {
  return get(KEYS.USERS) || [];
}

export function registerUser(username, password) {
  const users = getUsers();
  if (users.find((u) => u.username.toLowerCase() === username.toLowerCase())) {
    return { ok: false, error: "Ese usuario ya existe" };
  }
  users.push({ username, password });
  set(KEYS.USERS, users);
  return { ok: true };
}

export function loginUser(username, password) {
  const users = getUsers();
  const user = users.find(
    (u) => u.username.toLowerCase() === username.toLowerCase()
  );
  if (!user) return { ok: false, error: "Usuario no encontrado" };
  if (user.password !== password)
    return { ok: false, error: "Contraseña incorrecta" };
  set(KEYS.CURRENT_USER, user.username);
  return { ok: true, username: user.username };
}

export function getCurrentUser() {
  return get(KEYS.CURRENT_USER);
}

export function logoutUser() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEYS.CURRENT_USER);
}

// ---- Votes ----
// Vote structure: { goalsA: number, goalsB: number }

export function getAllVotes() {
  return get(KEYS.VOTES) || {};
}

export function getUserVotes(username) {
  const all = getAllVotes();
  return all[username] || {};
}

export function setVote(username, matchId, goalsA, goalsB) {
  const all = getAllVotes();
  if (!all[username]) all[username] = {};
  all[username][String(matchId)] = { goalsA, goalsB };
  set(KEYS.VOTES, all);
}

export function removeVote(username, matchId) {
  const all = getAllVotes();
  if (all[username]) {
    delete all[username][String(matchId)];
    set(KEYS.VOTES, all);
  }
}

// ---- Results (admin sets these) ----
// Result structure: { goalsA: number, goalsB: number }

export function getResults() {
  return get(KEYS.RESULTS) || {};
}

export function setResult(matchId, goalsA, goalsB) {
  const results = getResults();
  results[String(matchId)] = { goalsA, goalsB };
  set(KEYS.RESULTS, results);
}

export function clearResult(matchId) {
  const results = getResults();
  delete results[String(matchId)];
  set(KEYS.RESULTS, results);
}

// ---- Scoring ----
// 2 pts = exact score, 1 pt = correct outcome (win/draw/loss), 0 = wrong

function getOutcome(goalsA, goalsB) {
  if (goalsA > goalsB) return "A";
  if (goalsA < goalsB) return "B";
  return "draw";
}

export function scoreVote(vote, result) {
  if (!vote || !result) return null; // no result yet
  const voteOutcome = getOutcome(vote.goalsA, vote.goalsB);
  const resultOutcome = getOutcome(result.goalsA, result.goalsB);

  if (vote.goalsA === result.goalsA && vote.goalsB === result.goalsB) {
    return 2; // exact score
  }
  if (voteOutcome === resultOutcome) {
    return 1; // correct outcome
  }
  return 0; // wrong
}

export function calculateScores() {
  const results = getResults();
  const allVotes = getAllVotes();
  const scores = {};

  for (const username of Object.keys(allVotes)) {
    let points = 0;
    let exact = 0;
    let outcomes = 0;
    let wrong = 0;
    let totalJudged = 0;
    const userVotes = allVotes[username];

    for (const matchId of Object.keys(userVotes)) {
      if (results[matchId]) {
        totalJudged++;
        const s = scoreVote(userVotes[matchId], results[matchId]);
        if (s === 2) { points += 2; exact++; }
        else if (s === 1) { points += 1; outcomes++; }
        else { wrong++; }
      }
    }

    scores[username] = {
      points,
      exact,
      outcomes,
      wrong,
      totalJudged,
      voted: Object.keys(userVotes).length,
    };
  }

  return scores;
}

export function getLeaderboard() {
  const scores = calculateScores();
  const users = getUsers();

  const board = users.map((u) => ({
    username: u.username,
    points: scores[u.username]?.points || 0,
    exact: scores[u.username]?.exact || 0,
    outcomes: scores[u.username]?.outcomes || 0,
    wrong: scores[u.username]?.wrong || 0,
    voted: scores[u.username]?.voted || 0,
  }));

  // Sort by points desc, then by exact scores desc
  board.sort((a, b) => b.points - a.points || b.exact - a.exact);

  return board;
}
