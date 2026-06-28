"use client";

import { useState, useEffect, useCallback } from "react";
import { MATCHES } from "@/data/matches";
import {
  getCurrentUser,
  getUsers,
  deleteUser,
  loginUser,
  registerUser,
  logoutUser,
  getAllVotes,
  getUserVotes,
  setVote,
  removeVote,
  getResults,
  setResult,
  clearResult,
  getLeaderboard,
  scoreVote,
  clearAllData,
  restoreAllData,
  getCustomMatches,
  saveCustomMatches,
  clearCustomMatches,
  updateMatch,
  addMatch,
  deleteMatch,
  getCountries,
} from "@/lib/storage";
import { COUNTRIES } from "@/data/countries";
import { supabase } from "@/lib/supabase";

// ─── Helpers ───
const MX_TZ = "America/Mexico_City";

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("es-MX", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: MX_TZ,
  });
}

function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: MX_TZ,
  });
}

function matchStatus(iso) {
  const now = Date.now();
  const start = new Date(iso).getTime();
  const end = start + 120 * 60 * 1000;
  if (now < start) return "upcoming";
  if (now >= start && now <= end) return "live";
  return "finished";
}

function isLocked(iso) {
  return Date.now() >= new Date(iso).getTime();
}

// ─── Toast ───
function Toast({ msg }) {
  if (!msg) return null;
  return <div className={`toast show ${msg.type}`}>{msg.text}</div>;
}

// ─── Login Screen ───
function LoginScreen({ onLogin }) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");

  const isAdminRoute = typeof window !== "undefined" && window.location.search.includes("admin");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const u = username.trim().toLowerCase();
    if (!u) { setError("Por favor introduce tu nombre"); return; }
    if (u.length < 3) { setError("El nombre debe tener al menos 3 letras"); return; }

    if (isRegister && !isAdminRoute) {
      const res = await registerUser(u);
      if (!res.ok) { setError(res.error); return; }
      const login = await loginUser(u);
      if (login.ok) onLogin(login.username);
    } else {
      const res = await loginUser(u);
      if (!res.ok) { setError(res.error); return; }
      onLogin(res.username);
    }
  };

  return (
    <div className="login-screen">
      <div className="login-trophy">🏆</div>
      <h1 className="login-title">Quiniela Jiménez</h1>
      <p className="login-subtitle">Familia Jiménez · Mundial 2026</p>
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Nombre</label>
          <input
            id="input-username"
            className="form-input"
            type="text"
            placeholder={isAdminRoute ? "Nombre del administrador (tortas)" : "Tu nombre completo o apodo"}
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase())}
            autoComplete="name"
          />
        </div>
        <div className="form-error">{error}</div>
        <button id="btn-login" className="btn-primary" type="submit" style={{ marginTop: "8px" }}>
          {isRegister && !isAdminRoute ? "Crear cuenta" : "Entrar a la Quiniela"}
        </button>
        {!isAdminRoute && (
          <div className="login-toggle" style={{ marginTop: "16px", textAlign: "center", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            {isRegister ? "¿Ya tienes cuenta? " : "¿Eres nuevo? "}
            <button type="button" onClick={() => { setIsRegister(!isRegister); setError(""); }} style={{ background: "none", border: "none", color: "var(--accent-cyan)", cursor: "pointer", fontWeight: 600, padding: 0 }}>
              {isRegister ? "Inicia sesión" : "Regístrate aquí"}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}

// ─── Score Input ───
function ScoreInput({ value, onChange, disabled, label }) {
  return (
    <div className="score-input-wrap">
      <button
        type="button"
        className="score-btn minus"
        disabled={disabled || value <= 0}
        onClick={() => onChange(Math.max(0, value - 1))}
        aria-label={`Decrementar goles ${label}`}
      >
        −
      </button>
      <span className="score-display">{value}</span>
      <button
        type="button"
        className="score-btn plus"
        disabled={disabled || value >= 15}
        onClick={() => onChange(Math.min(15, value + 1))}
        aria-label={`Incrementar goles ${label}`}
      >
        +
      </button>
    </div>
  );
}

// ─── Match Card ───
function MatchCard({ match, vote, result, onVote, locked }) {
  const goalsA = vote ? vote.goalsA : 0;
  const goalsB = vote ? vote.goalsB : 0;
  const status = matchStatus(match.date);
  const hasResult = result != null;
  const pts = scoreVote(vote, result);

  const handleGoalsA = (v) => {
    onVote(match.id, v, goalsB);
  };
  const handleGoalsB = (v) => {
    onVote(match.id, goalsA, v);
  };

  const statusLabel = {
    upcoming: "Próximo",
    live: "🔴 EN VIVO",
    finished: "Finalizado",
  };

  const pointsBadge = pts !== null && (
    <span className={`points-badge pts-${pts}`}>
      {pts === 2 ? "🎯 +2 puntos" : pts === 1 ? "✓ +1 punto" : "+0 puntos"}
    </span>
  );

  let resultClass = "";
  if (hasResult) {
    if (pts === 2) resultClass = " card-exact-win";
    else if (pts === 1) resultClass = " card-outcome-win";
    else resultClass = " card-wrong-win";
  }

  return (
    <div className={`match-card${vote ? " has-vote" : ""}${locked ? " locked" : ""}${resultClass}`}>
      <div className="match-header">
        <span className="match-round" style={{ textTransform: "capitalize" }}>{match.stage || "16avos"}</span>
        <span className={`match-status ${status}`}>{statusLabel[status]}</span>
      </div>

      {/* Teams + Score */}
      <div className="match-teams-score">
        <div className="match-team">
          <span className="team-flag">{match.teamA.flag}</span>
          <span className="team-name">{match.teamA.name}</span>
        </div>

        {hasResult ? (
          <div className="result-display">
            <span className="result-score">{result.goalsA} - {result.goalsB}</span>
            <span className="result-label">Final</span>
          </div>
        ) : (
          <span className="match-vs">VS</span>
        )}

        <div className="match-team">
          <span className="team-flag">{match.teamB.flag}</span>
          <span className="team-name">{match.teamB.name}</span>
        </div>
      </div>

      {/* Vote area */}
      <div className="vote-area">
        <div className="vote-label">Tu pronóstico:</div>
        <div className="score-row">
          <span className="score-team-code">{match.teamA.code}</span>
          <ScoreInput
            value={goalsA}
            onChange={handleGoalsA}
            disabled={locked}
            label={match.teamA.name}
          />
          <span className="score-separator">—</span>
          <ScoreInput
            value={goalsB}
            onChange={handleGoalsB}
            disabled={locked}
            label={match.teamB.name}
          />
          <span className="score-team-code">{match.teamB.code}</span>
        </div>

        {vote && !locked && (
          <div className="vote-saved-msg">✅ Pronóstico autoguardado: {vote.goalsA} - {vote.goalsB}</div>
        )}

        {vote && locked && (
          <div className="vote-saved-msg locked-msg">
            🔒 Tu pronóstico: {vote.goalsA} - {vote.goalsB}
          </div>
        )}

        {pointsBadge}
      </div>

      <div className="match-meta">
        <span className="match-date">📅 {formatDate(match.date)} · {formatTime(match.date)} (MX)</span>
        <span className="match-location">📍 {match.venue}</span>
      </div>
    </div>
  );
}

// ─── Users View ───
function UsersView({ currentUser, matches, results }) {
  const [board, setBoard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedUserVotes, setSelectedUserVotes] = useState(null);
  const [loadingVotes, setLoadingVotes] = useState(false);

  useEffect(() => {
    async function load() {
      const b = await getLeaderboard();
      setBoard(b || []);
      setLoading(false);
    }
    load();

    if (!supabase) return;
    const channel = supabase
      .channel('realtime-users')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quiniela_results' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quiniela_votes' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quiniela_users' }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentUser]);

  const handleSelectUser = async (username) => {
    setSelectedUser(username);
    setLoadingVotes(true);
    const votes = await getUserVotes(username);
    setSelectedUserVotes(votes || {});
    setLoadingVotes(false);
  };

  const handleCloseModal = () => {
    setSelectedUser(null);
    setSelectedUserVotes(null);
  };

  const isAdmin = currentUser && currentUser.toLowerCase() === "tortas";

  const userPredictions = [];
  if (selectedUser && selectedUserVotes && matches && results) {
    matches.forEach((m) => {
      const vote = selectedUserVotes[String(m.id)] || null;
      const result = results[String(m.id)] || null;
      const pts = vote && result ? scoreVote(vote, result) : null;
      userPredictions.push({ match: m, vote, result, points: pts });
    });
  }

  if (loading) return <div style={{textAlign: "center", padding: "40px", color: "var(--accent-cyan)"}}>Cargando usuarios...</div>;

  return (
    <div className="leaderboard">
      <div className="leaderboard-header">
        <h2>👥 Todos los Usuarios</h2>
        <p>{board.length} participante{board.length !== 1 ? "s" : ""}{isAdmin ? " · Toca a un usuario para ver sus pronósticos" : ""}</p>
      </div>

      <div className="leaderboard-list">
        {board.map((entry, i) => (
          <div
            key={entry.username}
            className={`leaderboard-row${entry.username === currentUser ? " is-me" : ""}`}
            style={{ cursor: isAdmin ? "pointer" : "default" }}
            onClick={isAdmin ? () => handleSelectUser(entry.username) : undefined}
          >
            <span className="leaderboard-rank">{i + 1}</span>
            <span className="leaderboard-name">
              {entry.username}
              {entry.username === currentUser ? " (tú)" : ""}
            </span>
            <span className="leaderboard-stats">
              <span className="stat-exact" title="Exactos">🎯{entry.exact}</span>
              <span className="stat-outcomes" title="Resultados">✓{entry.outcomes}</span>
            </span>
            <span className="leaderboard-score">
              {entry.points} <span>pts</span>
            </span>
          </div>
        ))}
        {board.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">👥</div>
            <p>Aún no hay participantes registrados</p>
          </div>
        )}
      </div>

      {/* Modal for displaying all predictions of selected user */}
      {selectedUser && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">⚽ Pronósticos de {selectedUser}</div>
              <button className="modal-close-btn" onClick={handleCloseModal}>&times;</button>
            </div>
            <div className="modal-body">
              {loadingVotes ? (
                <div style={{ textAlign: "center", padding: "40px", color: "var(--accent-cyan)" }}>
                  Cargando pronósticos...
                </div>
              ) : (
                <>
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "8px 12px",
                    background: "rgba(255,255,255,0.03)",
                    borderRadius: "var(--radius-sm)",
                    marginBottom: "16px",
                    fontSize: "0.85rem",
                    color: "var(--text-secondary)"
                  }}>
                    <span>Pronosticados: <strong>{userPredictions.filter(p => p.vote).length}/{matches.length}</strong></span>
                    <span>Puntos: <strong>{board.find(b => b.username === selectedUser)?.points || 0} pts</strong></span>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {userPredictions.map(({ match, vote, result, points }) => (
                      <div key={match.id} className={`prediction-item ${points !== null ? `pts-${points}` : ""}`}>
                        <div className="prediction-match-info">
                          <span style={{ textTransform: "capitalize", fontWeight: 600 }}>{match.stage || "16avos"}</span>
                          {points !== null && points > 0 && (
                            <span className={`points-badge pts-${points}`} style={{ margin: 0, padding: "2px 8px" }}>
                              {points === 2 ? "🎯 +2 puntos" : "✓ +1 punto"}
                            </span>
                          )}
                          {points === 0 && (
                            <span className="points-badge pts-0" style={{ margin: 0, padding: "2px 8px" }}>
                              ❌ +0 puntos
                            </span>
                          )}
                        </div>
                        <div className="prediction-teams">
                          <span>{match.teamA.flag} {match.teamA.name}</span>
                          <span style={{ color: "var(--text-muted)", margin: "0 8px" }}>vs</span>
                          <span>{match.teamB.name} {match.teamB.flag}</span>
                        </div>
                        <div style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          fontSize: "0.8rem",
                          borderTop: "1px solid rgba(255,255,255,0.05)",
                          paddingTop: "6px",
                          marginTop: "2px",
                          color: "var(--text-secondary)"
                        }}>
                          <span>Resultado real: <strong>{result ? `${result.goalsA} - ${result.goalsB}` : "—"}</strong></span>
                          <span>Su pronóstico: <strong>{vote ? `${vote.goalsA} - ${vote.goalsB}` : "Sin pronóstico"}</strong></span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Leaderboard ───
// ─── Leaderboard ───
function LeaderboardView({ currentUser, matches, results }) {
  const [board, setBoard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedUserVotes, setSelectedUserVotes] = useState(null);
  const [loadingVotes, setLoadingVotes] = useState(false);

  useEffect(() => {
    async function load() {
      const b = await getLeaderboard();
      setBoard(b || []);
      setLoading(false);
    }
    load();

    if (!supabase) return;
    const channel = supabase
      .channel('realtime-leaderboard')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'quiniela_results' },
        load
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'quiniela_votes' },
        load
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser]);

  const handleSelectUser = async (username) => {
    setSelectedUser(username);
    setLoadingVotes(true);
    const votes = await getUserVotes(username);
    setSelectedUserVotes(votes || {});
    setLoadingVotes(false);
  };

  const handleCloseModal = () => {
    setSelectedUser(null);
    setSelectedUserVotes(null);
  };

  if (loading) return <div style={{textAlign: "center", padding: "40px", color: "var(--accent-cyan)"}}>Cargando posiciones...</div>;
  const medals = ["🥇", "🥈", "🥉"];
  const podiumCls = ["first", "second", "third"];
  const top3 = board.slice(0, 3);

  const podiumOrder =
    top3.length >= 3
      ? [top3[1], top3[0], top3[2]]
      : top3.length === 2
      ? [top3[1], top3[0]]
      : top3;

  const myRank = board.findIndex((b) => b.username === currentUser) + 1;
  const myData = board.find((b) => b.username === currentUser);
  const isAdmin = currentUser && currentUser.toLowerCase() === "tortas";

  // Calculate predictions for selected user
  const userPredictions = [];
  if (selectedUser && selectedUserVotes && matches && results) {
    matches.forEach((m) => {
      const vote = selectedUserVotes[String(m.id)] || null;
      const result = results[String(m.id)] || null;
      const pts = vote && result ? scoreVote(vote, result) : null;
      userPredictions.push({ match: m, vote, result, points: pts });
    });
  }

  return (
    <div className="leaderboard">
      <div className="leaderboard-header">
        <h2>🏅 Tabla de Posiciones</h2>
        <p>Ranking general{isAdmin ? " · Toca a un participante para ver sus aciertos" : ""}</p>
      </div>

      {/* Scoring rules */}
      <div className="scoring-rules">
        <div className="rule"><span className="rule-pts exact">+2</span> Marcador exacto</div>
        <div className="rule"><span className="rule-pts outcome">+1</span> Resultado correcto</div>
        <div className="rule"><span className="rule-pts wrong">0</span> Resultado incorrecto</div>
      </div>

      {myData && (
        <div className="my-score-badge">
          <div className="score-item">
            <div className="score-value">{myRank}°</div>
            <div className="score-label">Tu lugar</div>
          </div>
          <div className="score-divider" />
          <div className="score-item">
            <div className="score-value">{myData.points}</div>
            <div className="score-label">Puntos</div>
          </div>
          <div className="score-divider" />
          <div className="score-item">
            <div className="score-value">{myData.exact}</div>
            <div className="score-label">Exactos</div>
          </div>
          <div className="score-divider" />
          <div className="score-item">
            <div className="score-value">{myData.voted}</div>
            <div className="score-label">Votos</div>
          </div>
        </div>
      )}

      {top3.length > 0 && (
        <div className="podium">
          {podiumOrder.map((p) => {
            const realIdx = top3.indexOf(p);
            return (
              <div
                key={p.username}
                className={`podium-item ${podiumCls[realIdx] || ""}`}
                style={isAdmin ? { cursor: "pointer" } : {}}
                onClick={isAdmin ? () => handleSelectUser(p.username) : undefined}
              >
                <span className="podium-medal">{medals[realIdx] || ""}</span>
                <span className="podium-name">{p.username}</span>
                <span className="podium-points">{p.points} pts</span>
                {p.exact > 0 && (
                  <span className="podium-exact">🎯 {p.exact}</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="leaderboard-list">
        {board.map((entry, i) => (
          <div
            key={entry.username}
            className={`leaderboard-row${entry.username === currentUser ? " is-me" : ""}`}
            style={{ animationDelay: `${i * 0.04}s`, cursor: isAdmin ? "pointer" : "default" }}
            onClick={isAdmin ? () => handleSelectUser(entry.username) : undefined}
          >
            <span className="leaderboard-rank">{i + 1}</span>
            <span className="leaderboard-name">
              {entry.username}
              {entry.username === currentUser ? " (tú)" : ""}
            </span>
            <span className="leaderboard-stats">
              <span className="stat-exact" title="Exactos">🎯{entry.exact}</span>
              <span className="stat-outcomes" title="Resultados">✓{entry.outcomes}</span>
            </span>
            <span className="leaderboard-score">
              {entry.points} <span>pts</span>
            </span>
          </div>
        ))}
        {board.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">📊</div>
            <p>Aún no hay participantes</p>
          </div>
        )}
      </div>

      {/* Modal for displaying all predictions of selected user */}
      {selectedUser && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">⚽ Pronósticos de {selectedUser}</div>
              <button className="modal-close-btn" onClick={handleCloseModal}>&times;</button>
            </div>
            <div className="modal-body">
              {loadingVotes ? (
                <div style={{ textAlign: "center", padding: "40px", color: "var(--accent-cyan)" }}>
                  Cargando pronósticos...
                </div>
              ) : (
                <>
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "8px 12px",
                    background: "rgba(255,255,255,0.03)",
                    borderRadius: "var(--radius-sm)",
                    marginBottom: "16px",
                    fontSize: "0.85rem",
                    color: "var(--text-secondary)"
                  }}>
                    <span>Pronosticados: <strong>{userPredictions.filter(p => p.vote).length}/{matches.length}</strong></span>
                    <span>Puntos: <strong>{board.find(b => b.username === selectedUser)?.points || 0} pts</strong></span>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {userPredictions.map(({ match, vote, result, points }) => (
                      <div key={match.id} className={`prediction-item ${points !== null ? `pts-${points}` : ""}`}>
                        <div className="prediction-match-info">
                          <span style={{ textTransform: "capitalize", fontWeight: 600 }}>{match.stage || "16avos"}</span>
                          {points !== null && points > 0 && (
                            <span className={`points-badge pts-${points}`} style={{ margin: 0, padding: "2px 8px" }}>
                              {points === 2 ? "🎯 +2 puntos" : "✓ +1 punto"}
                            </span>
                          )}
                          {points === 0 && (
                            <span className="points-badge pts-0" style={{ margin: 0, padding: "2px 8px" }}>
                              ❌ +0 puntos
                            </span>
                          )}
                        </div>
                        <div className="prediction-teams">
                          <span>{match.teamA.flag} {match.teamA.name}</span>
                          <span style={{ color: "var(--text-muted)", margin: "0 8px" }}>vs</span>
                          <span>{match.teamB.name} {match.teamB.flag}</span>
                        </div>
                        <div style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          fontSize: "0.8rem",
                          borderTop: "1px solid rgba(255,255,255,0.05)",
                          paddingTop: "6px",
                          marginTop: "2px",
                          color: "var(--text-secondary)"
                        }}>
                          <span>Resultado real: <strong>{result ? `${result.goalsA} - ${result.goalsB}` : "—"}</strong></span>
                          <span>Su pronóstico: <strong>{vote ? `${vote.goalsA} - ${vote.goalsB}` : "Sin pronóstico"}</strong></span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminPanel({ matches, onClose, onMatchesUpdated }) {
  const [results, setLocalResults] = useState({});
  const [usersList, setUsersList] = useState([]);
  const [inputs, setInputs] = useState({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [edits, setEdits] = useState({});

  // Add Match Form State
  const [newStage, setNewStage] = useState("8avos");
  const [newTeamAName, setNewTeamAName] = useState("");
  const [newTeamAFlag, setNewTeamAFlag] = useState("🏳️");
  const [newTeamACode, setNewTeamACode] = useState("");
  const [newTeamBName, setNewTeamBName] = useState("");
  const [newTeamBFlag, setNewTeamBFlag] = useState("🏳️");
  const [newTeamBCode, setNewTeamBCode] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newVenue, setNewVenue] = useState("");

  const handleCreateMatch = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!newTeamAName || !newTeamACode || !newTeamBName || !newTeamBCode) {
      setError("Por favor completa los nombres y códigos de ambos equipos.");
      return;
    }

    try {
      const nextId = matches.length > 0 ? Math.max(...matches.map((m) => m.id)) + 1 : 1;
      const matchObj = {
        id: nextId,
        stage: newStage,
        date: newDate || new Date().toISOString(),
        venue: newVenue || "Estadio por definir",
        teamA: {
          name: newTeamAName,
          flag: newTeamAFlag || "🏳️",
          code: newTeamACode.toUpperCase(),
        },
        teamB: {
          name: newTeamBName,
          flag: newTeamBFlag || "🏳️",
          code: newTeamBCode.toUpperCase(),
        }
      };

      await addMatch(matchObj);

      const newList = [...matches, matchObj];
      onMatchesUpdated(newList);
      setSuccess("¡Partido añadido exitosamente!");

      // Reset form
      setNewTeamAName("");
      setNewTeamACode("");
      setNewTeamAFlag("🏳️");
      setNewTeamBName("");
      setNewTeamBCode("");
      setNewTeamBFlag("🏳️");
      setNewDate("");
      setNewVenue("");

      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError("Error al añadir partido: " + err.message);
    }
  };

  const getEditValue = (matchId, field, fallback) => {
    if (edits[matchId] && edits[matchId][field] !== undefined) {
      return edits[matchId][field];
    }
    return fallback;
  };

  const setEditValue = (matchId, field, value) => {
    setEdits((prev) => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        [field]: value,
      },
    }));
  };

  const handleUpdateMatch = async (matchId, m) => {
    try {
      const updated = {
        stage: m.stage || "16avos",
        date: getEditValue(matchId, "date", m.date),
        venue: getEditValue(matchId, "venue", m.venue),
        teamA: {
          name: getEditValue(matchId, "teamA_name", m.teamA.name),
          flag: getEditValue(matchId, "teamA_flag", m.teamA.flag),
          code: getEditValue(matchId, "teamA_code", m.teamA.code),
        },
        teamB: {
          name: getEditValue(matchId, "teamB_name", m.teamB.name),
          flag: getEditValue(matchId, "teamB_flag", m.teamB.flag),
          code: getEditValue(matchId, "teamB_code", m.teamB.code),
        }
      };

      await updateMatch(matchId, updated);

      const newList = matches.map((item) => (item.id === matchId ? { ...item, ...updated } : item));
      onMatchesUpdated(newList);
      setSuccess("¡Datos del partido actualizados!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError("Error al actualizar partido: " + err.message);
    }
  };

  useEffect(() => {
    async function loadData() {
      const res = await getResults();
      if (res) setLocalResults(res);
      const usrs = await getUsers();
      if (usrs) setUsersList(usrs);
    }
    loadData();
  }, []);

  const handleDeleteUser = async (username) => {
    if (window.confirm(`¿Estás seguro de que deseas eliminar al usuario "${username}"? Esto borrará sus pronósticos también.`)) {
      await deleteUser(username);
      const usrs = await getUsers();
      setUsersList(usrs || []);
      setSuccess(`Usuario ${username} eliminado.`);
    }
  };

  const handleReset = async () => {
    if (window.confirm("¿Estás seguro de que quieres restablecer los partidos predeterminados?")) {
      await saveCustomMatches(MATCHES);
      onMatchesUpdated(MATCHES);
      setError("");
      setSuccess("¡Partidos restablecidos a los predeterminados!");
    }
  };

  const handleDeleteMatch = async (matchId) => {
    if (window.confirm("¿Estás seguro de que deseas eliminar este partido? Esta acción no se puede deshacer.")) {
      try {
        await deleteMatch(matchId);
        const newList = matches.filter(m => m.id !== matchId);
        onMatchesUpdated(newList);
        setSuccess("¡Partido eliminado!");
        setTimeout(() => setSuccess(""), 3000);
      } catch (err) {
        setError("Error al eliminar partido: " + err.message);
      }
    }
  };

  const getInput = (matchId, team) => {
    const key = `${matchId}_${team}`;
    if (inputs[key] !== undefined) return inputs[key];
    if (results[matchId]) return results[matchId][team === "A" ? "goalsA" : "goalsB"];
    return 0;
  };

  const setInput = (matchId, team, value) => {
    const v = Math.max(0, Math.min(15, parseInt(value) || 0));
    setInputs((prev) => ({ ...prev, [`${matchId}_${team}`]: v }));
  };

  const handleSave = async (matchId) => {
    const gA = getInput(matchId, "A");
    const gB = getInput(matchId, "B");
    await setResult(matchId, gA, gB);
    const res = await getResults();
    setLocalResults(res || {});
  };

  const handleClear = async (matchId) => {
    await clearResult(matchId);
    const res = await getResults();
    setLocalResults(res || {});
  };

  return (
    <div style={{ padding: "16px 0 100px" }}>
      <div className="leaderboard-header">
        <h2>⚙️ Panel Admin</h2>
        <p>Captura los marcadores reales</p>
        <div style={{ display: "flex", gap: "8px", justifyContent: "center", marginTop: "8px", flexWrap: "wrap" }}>
          <button className="btn-logout" onClick={async () => {
            if (window.confirm("⚠️ ¿PELIGRO: Estás seguro de borrar a todos los usuarios, pronósticos y resultados?")) {
              await clearAllData();
              window.location.reload();
            }
          }} style={{ padding: "8px 16px", borderColor: "var(--accent-red)", color: "var(--accent-red)", flex: 1, minWidth: "140px" }}>
            🧨 Limpiar TODO
          </button>
          <button className="btn-logout" onClick={onClose} style={{ padding: "8px 16px", flex: 1, minWidth: "140px" }}>
            Cerrar Admin
          </button>
        </div>
      </div>

      <div className="login-card" style={{ maxWidth: "100%", margin: "0 auto 24px", padding: "16px" }}>
        <h3 style={{ fontSize: "1rem", marginBottom: "12px", textAlign: "left", color: "var(--accent-cyan)" }}>➕ Añadir Partido de Siguiente Fase</h3>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: 16, textAlign: "left", lineHeight: "1.4" }}>
          Configura y añade un partido para las fases eliminatorias seleccionando países de la lista.
        </p>

        {error && <div className="form-error" style={{ marginBottom: 12, color: "var(--accent-red)" }}>❌ {error}</div>}
        {success && <div className="vote-saved-msg" style={{ marginBottom: 12, color: "var(--accent-green)" }}>✅ {success}</div>}

        <form onSubmit={handleCreateMatch} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div className="form-group">
            <label className="form-label" style={{ textAlign: "left" }}>Fase / Ronda</label>
            <select
              value={newStage}
              onChange={(e) => setNewStage(e.target.value)}
              style={{
                width: "100%",
                padding: "10px",
                background: "var(--bg-glass)",
                border: "1px solid var(--border-glass)",
                borderRadius: "var(--radius-md)",
                color: "var(--text-primary)",
                outline: "none"
              }}
            >
              <option value="16avos">16avos</option>
              <option value="8avos">8avos (Octavos)</option>
              <option value="4tos">4tos (Cuartos)</option>
              <option value="semis">Semis (Semifinal)</option>
              <option value="final">Final</option>
            </select>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div style={{ border: "1px solid rgba(255,255,255,0.05)", padding: "8px", borderRadius: "var(--radius-sm)" }}>
              <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--accent-cyan)", display: "block", marginBottom: "6px" }}>Equipo A</span>
              <select
                value={newTeamACode}
                onChange={(e) => {
                  const code = e.target.value;
                  setNewTeamACode(code);
                  const country = COUNTRIES.find(c => c.code === code);
                  if (country) {
                    setNewTeamAName(country.name);
                    setNewTeamAFlag(country.flag);
                  } else {
                    setNewTeamAName("");
                    setNewTeamAFlag("🏳️");
                  }
                }}
                style={{ width: "100%", padding: "8px", background: "rgba(0,0,0,0.2)", border: "1px solid var(--border-glass)", color: "var(--text-primary)", borderRadius: "4px", fontSize: "0.85rem" }}
              >
                <option value="">-- Seleccionar país --</option>
                {COUNTRIES.map(c => (
                  <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
                ))}
              </select>
            </div>
            <div style={{ border: "1px solid rgba(255,255,255,0.05)", padding: "8px", borderRadius: "var(--radius-sm)" }}>
              <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--accent-cyan)", display: "block", marginBottom: "6px" }}>Equipo B</span>
              <select
                value={newTeamBCode}
                onChange={(e) => {
                  const code = e.target.value;
                  setNewTeamBCode(code);
                  const country = COUNTRIES.find(c => c.code === code);
                  if (country) {
                    setNewTeamBName(country.name);
                    setNewTeamBFlag(country.flag);
                  } else {
                    setNewTeamBName("");
                    setNewTeamBFlag("🏳️");
                  }
                }}
                style={{ width: "100%", padding: "8px", background: "rgba(0,0,0,0.2)", border: "1px solid var(--border-glass)", color: "var(--text-primary)", borderRadius: "4px", fontSize: "0.85rem" }}
              >
                <option value="">-- Seleccionar país --</option>
                {COUNTRIES.map(c => (
                  <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group" style={{ marginTop: "6px" }}>
            <label className="form-label" style={{ textAlign: "left" }}>Fecha y Hora</label>
            <input
              type="datetime-local"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              style={{
                width: "100%",
                padding: "10px",
                background: "var(--bg-glass)",
                border: "1px solid var(--border-glass)",
                borderRadius: "var(--radius-md)",
                color: "var(--text-primary)",
                outline: "none"
              }}
            />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ textAlign: "left" }}>Estadio / Sede</label>
            <input
              type="text"
              placeholder="Estadio por definir"
              value={newVenue}
              onChange={(e) => setNewVenue(e.target.value)}
              style={{
                width: "100%",
                padding: "10px",
                background: "var(--bg-glass)",
                border: "1px solid var(--border-glass)",
                borderRadius: "var(--radius-md)",
                color: "var(--text-primary)",
                outline: "none"
              }}
            />
          </div>

          <button type="submit" className="btn-primary" style={{ marginTop: "8px", padding: "12px", border: "none", borderRadius: "var(--radius-md)", fontWeight: 700, cursor: "pointer" }}>
            ➕ Añadir Partido a la Base de Datos
          </button>

          <button type="button" className="btn-logout" onClick={handleReset} style={{ width: "100%", borderColor: "var(--accent-red)", color: "var(--accent-red)", padding: "10px" }}>
            Restablecer partidos predeterminados
          </button>
        </form>
      </div>

      <div className="login-card" style={{ maxWidth: "100%", margin: "0 auto 24px", padding: "16px" }}>
        <h3 style={{ fontSize: "1rem", marginBottom: "8px", textAlign: "left" }}>Gestión de Usuarios</h3>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: 16, textAlign: "left", lineHeight: "1.4" }}>
          Elimina usuarios que hayan sido creados por error. Esto borrará también todos sus pronósticos.
        </p>
        <div style={{ maxHeight: "250px", overflowY: "auto", border: "1px solid var(--border-glass)", borderRadius: "var(--radius-md)", background: "var(--bg-glass)" }}>
          {usersList.length === 0 ? (
            <div style={{ padding: "16px", textAlign: "center", color: "var(--text-secondary)", fontSize: "0.85rem" }}>No hay usuarios registrados.</div>
          ) : (
            usersList.map((u) => (
              <div key={u.username} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid var(--border-glass)" }}>
                <span style={{ fontWeight: 500, color: "var(--text-primary)" }}>👤 {u.username}</span>
                <button
                  onClick={() => handleDeleteUser(u.username)}
                  style={{ background: "transparent", border: "1px solid var(--accent-red)", color: "var(--accent-red)", padding: "4px 8px", borderRadius: "var(--radius-sm)", fontSize: "0.75rem", cursor: "pointer", transition: "var(--transition-fast)" }}
                >
                  🗑️ Eliminar
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="matches-list">
        {matches.map((m) => (
          <div key={m.id} className="match-card" style={{ opacity: 1, animation: "none" }}>
            <div className="match-teams-score" style={{ marginBottom: 12 }}>
              <div className="match-team">
                <span className="team-flag">{m.teamA.flag}</span>
                <span className="team-name">{m.teamA.name}</span>
              </div>
              <span className="match-vs">VS</span>
              <div className="match-team">
                <span className="team-flag">{m.teamB.flag}</span>
                <span className="team-name">{m.teamB.name}</span>
              </div>
            </div>
            <div className="score-row" style={{ justifyContent: "center", marginBottom: 8 }}>
              <span className="score-team-code">{m.teamA.code}</span>
              <ScoreInput
                value={getInput(m.id, "A")}
                onChange={(v) => setInput(m.id, "A", v)}
                disabled={false}
                label={m.teamA.name}
              />
              <span className="score-separator">—</span>
              <ScoreInput
                value={getInput(m.id, "B")}
                onChange={(v) => setInput(m.id, "B", v)}
                disabled={false}
                label={m.teamB.name}
              />
              <span className="score-team-code">{m.teamB.code}</span>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              <button className="btn-save-vote" onClick={() => handleSave(m.id)}>
                Guardar resultado
              </button>
              {results[m.id] && (
                <button className="btn-logout" onClick={() => handleClear(m.id)}>
                  Borrar
                </button>
              )}
            </div>
            {results[m.id] && (
              <div className="vote-saved-msg" style={{ marginTop: 8 }}>
                ✅ Resultado: {results[m.id].goalsA} - {results[m.id].goalsB}
              </div>
            )}

            {/* Form to edit match details */}
            <div style={{ borderTop: "1px dashed var(--border-glass)", paddingTop: 12, marginTop: 12 }}>
              <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--accent-cyan)", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>✏️ Editar Info Partido ({m.stage || "16avos"})</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "70px 1fr 60px", gap: 8, marginBottom: 8 }}>
                <div>
                  <label className="form-label" style={{ fontSize: "0.65rem", marginBottom: 2 }}>Flag A</label>
                  <input
                    className="form-input"
                    style={{ padding: "6px 8px", fontSize: "0.8rem" }}
                    value={getEditValue(m.id, "teamA_flag", m.teamA.flag)}
                    onChange={(e) => setEditValue(m.id, "teamA_flag", e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: "0.65rem", marginBottom: 2 }}>Equipo A</label>
                  <input
                    className="form-input"
                    style={{ padding: "6px 8px", fontSize: "0.8rem" }}
                    value={getEditValue(m.id, "teamA_name", m.teamA.name)}
                    onChange={(e) => setEditValue(m.id, "teamA_name", e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: "0.65rem", marginBottom: 2 }}>Cód A</label>
                  <input
                    className="form-input"
                    style={{ padding: "6px 8px", fontSize: "0.8rem" }}
                    value={getEditValue(m.id, "teamA_code", m.teamA.code)}
                    onChange={(e) => setEditValue(m.id, "teamA_code", e.target.value.toUpperCase())}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "70px 1fr 60px", gap: 8, marginBottom: 8 }}>
                <div>
                  <label className="form-label" style={{ fontSize: "0.65rem", marginBottom: 2 }}>Flag B</label>
                  <input
                    className="form-input"
                    style={{ padding: "6px 8px", fontSize: "0.8rem" }}
                    value={getEditValue(m.id, "teamB_flag", m.teamB.flag)}
                    onChange={(e) => setEditValue(m.id, "teamB_flag", e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: "0.65rem", marginBottom: 2 }}>Equipo B</label>
                  <input
                    className="form-input"
                    style={{ padding: "6px 8px", fontSize: "0.8rem" }}
                    value={getEditValue(m.id, "teamB_name", m.teamB.name)}
                    onChange={(e) => setEditValue(m.id, "teamB_name", e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: "0.65rem", marginBottom: 2 }}>Cód B</label>
                  <input
                    className="form-input"
                    style={{ padding: "6px 8px", fontSize: "0.8rem" }}
                    value={getEditValue(m.id, "teamB_code", m.teamB.code)}
                    onChange={(e) => setEditValue(m.id, "teamB_code", e.target.value.toUpperCase())}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                <div>
                  <label className="form-label" style={{ fontSize: "0.65rem", marginBottom: 2 }}>Fecha/Hora (UTC)</label>
                  <input
                    className="form-input"
                    style={{ padding: "6px 8px", fontSize: "0.8rem" }}
                    placeholder="YYYY-MM-DDTHH:MM:SSZ"
                    value={getEditValue(m.id, "date", m.date)}
                    onChange={(e) => setEditValue(m.id, "date", e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: "0.65rem", marginBottom: 2 }}>Estadio</label>
                  <input
                    className="form-input"
                    style={{ padding: "6px 8px", fontSize: "0.8rem" }}
                    value={getEditValue(m.id, "venue", m.venue)}
                    onChange={(e) => setEditValue(m.id, "venue", e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                <button
                  className="btn-save-vote"
                  style={{ background: "var(--accent-violet)", width: "100%", maxWidth: "none", margin: 0, flex: 1 }}
                  onClick={() => handleUpdateMatch(m.id, m)}
                >
                  💾 Guardar Datos del Partido
                </button>
                <button
                  className="btn-logout"
                  onClick={() => handleDeleteMatch(m.id)}
                  style={{ borderColor: "var(--accent-red)", color: "var(--accent-red)", flex: 1 }}
                >
                  🗑️ Eliminar Partido
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}




// ─── Main App ───
export default function Home() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("matches");
  const [votes, setVotes] = useState({});
  const [results, setResults] = useState({});
  const [toast, setToast] = useState(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [matchesList, setMatchesList] = useState(MATCHES);
  const [filterStage, setFilterStage] = useState("all");

  useEffect(() => {
    setMounted(true);
    
    async function loadInitialData() {
      const saved = getCurrentUser();
      if (saved) {
        setUser(saved);
        const uVotes = await getUserVotes(saved);
        setVotes(uVotes);
      }
      const custom = await getCustomMatches();
      if (custom && Array.isArray(custom)) {
        setMatchesList(custom);
      }
      const res = await getResults();
      if (res) setResults(res);
    }
    
    loadInitialData();

    if (typeof window !== "undefined" && window.location.search.includes("admin")) {
      setShowAdmin(true);
    }
  }, []);

  useEffect(() => {
    if (!supabase) return;

    const channel = supabase
      .channel('realtime-global')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'quiniela_results' },
        async () => {
          const res = await getResults();
          if (res) setResults(res);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'quiniela_matches' },
        async () => {
          const custom = await getCustomMatches();
          if (custom && Array.isArray(custom)) {
            setMatchesList(custom);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'quiniela_votes' },
        async () => {
          if (user) {
            const uVotes = await getUserVotes(user);
            setVotes(uVotes);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const showToast = useCallback((text, type = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 2500);
  }, []);

  const handleLogin = async (username) => {
    setUser(username);
    const uVotes = await getUserVotes(username);
    setVotes(uVotes);
    const res = await getResults();
    if (res) setResults(res);
    showToast(`¡Bienvenido, ${username}! ⚽`);
  };

  const handleLogout = () => {
    logoutUser();
    setUser(null);
    setVotes({});
    setTab("matches");
  };

  const handleVote = async (matchId, goalsA, goalsB) => {
    const match = matchesList.find((m) => m.id === matchId);
    if (!match || isLocked(match.date)) {
      showToast("⏰ El partido ya comenzó, no puedes votar", "error");
      return;
    }
    await setVote(user, matchId, goalsA, goalsB);
    const uVotes = await getUserVotes(user);
    setVotes(uVotes);
    showToast("✅ Pronóstico guardado");
  };

  if (!mounted) return null;
  if (!user) return <LoginScreen onLogin={handleLogin} />;

  // Calculate current user stats
  let totalPoints = 0;
  let totalExact = 0;
  let totalOutcomes = 0;
  Object.keys(votes).forEach((mid) => {
    const s = scoreVote(votes[mid], results[mid]);
    if (s === 2) { totalPoints += 2; totalExact++; }
    else if (s === 1) { totalPoints += 1; totalOutcomes++; }
  });

  const isTortas = user && user.toLowerCase() === "tortas";
  const canShowAdmin = showAdmin && isTortas;

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="app-logo">
          <span>🏆</span> Quiniela Jiménez 2026
        </div>
        <div className="user-bar">
          <span>👤 <span className="username">{user}</span></span>
          <button className="btn-logout" onClick={handleLogout}>Salir</button>
        </div>
      </header>

      {canShowAdmin ? (
        <AdminPanel
          matches={matchesList}
          onClose={async () => {
            const res = await getResults();
            if (res) setResults(res);
            setShowAdmin(false);
          }}
          onMatchesUpdated={setMatchesList}
        />
      ) : (
        <>
          <nav className="tabs">
            <button
              id="tab-matches"
              className={`tab-btn${tab === "matches" ? " active" : ""}`}
              onClick={() => setTab("matches")}
            >
              ⚽ Partidos
            </button>
            <button
              id="tab-leaderboard"
              className={`tab-btn${tab === "leaderboard" ? " active" : ""}`}
              onClick={() => setTab("leaderboard")}
            >
              🏅 Posiciones
            </button>
            {isTortas && (
              <button
                id="tab-users"
                className={`tab-btn${tab === "users" ? " active" : ""}`}
                onClick={() => setTab("users")}
              >
                👥 Usuarios
              </button>
            )}
          </nav>

          {tab === "matches" && (
            <>
              <div className="filter-stages" style={{ display: "flex", overflowX: "auto", gap: 8, padding: "8px 0", marginBottom: 16 }}>
                {["all", "16avos", "8avos", "4tos", "semis", "final"].map(s => (
                  <button 
                    key={s}
                    onClick={() => setFilterStage(s)}
                    style={{ 
                      padding: "6px 16px", 
                      fontSize: "0.85rem", 
                      fontWeight: 600,
                      borderRadius: "20px", 
                      whiteSpace: "nowrap", 
                      cursor: "pointer",
                      transition: "var(--transition-fast)",
                      background: filterStage === s ? "var(--accent-cyan)" : "var(--bg-glass)", 
                      color: filterStage === s ? "#000" : "var(--accent-cyan)", 
                      border: `1px solid ${filterStage === s ? "transparent" : "var(--border-glass)"}`
                    }}
                  >
                    {s === "all" ? "Todos" : s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>

              <div className="my-score-badge">
                <div className="score-item">
                  <div className="score-value">{Object.keys(votes).length}</div>
                  <div className="score-label">Votos</div>
                </div>
                <div className="score-divider" />
                <div className="score-item">
                  <div className="score-value">{totalPoints}</div>
                  <div className="score-label">Puntos</div>
                </div>
                <div className="score-divider" />
                <div className="score-item">
                  <div className="score-value">{totalExact}</div>
                  <div className="score-label">Exactos 🎯</div>
                </div>
                <div className="score-divider" />
                <div className="score-item">
                  <div className="score-value">{matchesList.length}</div>
                  <div className="score-label">Partidos</div>
                </div>
              </div>

              <div className="matches-list">
                {matchesList.filter(m => filterStage === "all" || (m.stage || "16avos") === filterStage).map((match) => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    vote={votes[String(match.id)]}
                    result={results[String(match.id)]}
                    locked={isLocked(match.date)}
                    onVote={handleVote}
                  />
                ))}
                {matchesList.filter(m => filterStage === "all" || (m.stage || "16avos") === filterStage).length === 0 && (
                  <div className="empty-state">
                    <div className="empty-icon">⚽</div>
                    <p>No hay partidos cargados para esta fase todavía.</p>
                  </div>
                )}
              </div>
            </>
          )}

          {tab === "leaderboard" && <LeaderboardView currentUser={user} matches={matchesList} results={results} />}
          {tab === "users" && <UsersView currentUser={user} matches={matchesList} results={results} />}
        </>
      )}

      <Toast msg={toast} />
    </div>
  );
}
