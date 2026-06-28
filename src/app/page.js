"use client";

import { useState, useEffect, useCallback } from "react";
import { MATCHES } from "@/data/matches";
import {
  getCurrentUser,
  loginUser,
  registerUser,
  logoutUser,
  getUserVotes,
  setVote,
  removeVote,
  getResults,
  setResult,
  clearResult,
  getLeaderboard,
  scoreVote,
  getCustomMatches,
  saveCustomMatches,
  clearCustomMatches,
} from "@/lib/storage";

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
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    const u = username.trim();
    const p = password.trim();
    if (!u || !p) { setError("Llena todos los campos"); return; }
    if (u.length < 3) { setError("Mínimo 3 caracteres en usuario"); return; }

    if (isRegister) {
      const res = registerUser(u, p);
      if (!res.ok) { setError(res.error); return; }
      const login = loginUser(u, p);
      if (login.ok) onLogin(login.username);
    } else {
      const res = loginUser(u, p);
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
          <label className="form-label">Usuario</label>
          <input
            id="input-username"
            className="form-input"
            type="text"
            placeholder="Tu nombre de usuario"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
          />
        </div>
        <div className="form-group">
          <label className="form-label">Contraseña</label>
          <input
            id="input-password"
            className="form-input"
            type="password"
            placeholder="••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={isRegister ? "new-password" : "current-password"}
          />
        </div>
        <div className="form-error">{error}</div>
        <button id="btn-login" className="btn-primary" type="submit">
          {isRegister ? "Crear cuenta" : "Entrar"}
        </button>
        <div className="login-toggle">
          {isRegister ? "¿Ya tienes cuenta? " : "¿No tienes cuenta? "}
          <button type="button" onClick={() => { setIsRegister(!isRegister); setError(""); }}>
            {isRegister ? "Inicia sesión" : "Regístrate"}
          </button>
        </div>
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
      {pts === 2 ? "🎯 +2 Exacto" : pts === 1 ? "✓ +1 Resultado" : "✗ 0 pts"}
    </span>
  );

  return (
    <div className={`match-card${vote ? " has-vote" : ""}${locked ? " locked" : ""}`}>
      <div className="match-header">
        <span className="match-round">Dieciseisavos</span>
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

// ─── Leaderboard ───
function LeaderboardView({ currentUser }) {
  const board = getLeaderboard();
  const medals = ["🥇", "🥈", "🥉"];
  const podiumCls = ["first", "second", "third"];
  const top3 = board.slice(0, 3);
  const rest = board.slice(3);

  const podiumOrder =
    top3.length >= 3
      ? [top3[1], top3[0], top3[2]]
      : top3.length === 2
      ? [top3[1], top3[0]]
      : top3;

  const myRank = board.findIndex((b) => b.username === currentUser) + 1;
  const myData = board.find((b) => b.username === currentUser);

  return (
    <div className="leaderboard">
      <div className="leaderboard-header">
        <h2>🏅 Tabla de Posiciones</h2>
        <p>Ranking general de la quiniela</p>
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
              <div key={p.username} className={`podium-item ${podiumCls[realIdx] || ""}`}>
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
            style={{ animationDelay: `${i * 0.04}s` }}
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
    </div>
  );
}

// ─── Admin Panel (activate with ?admin in URL) ───
function AdminPanel({ matches, onClose }) {
  const [results, setLocalResults] = useState(getResults());
  const [inputs, setInputs] = useState({});

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

  const handleSave = (matchId) => {
    const gA = getInput(matchId, "A");
    const gB = getInput(matchId, "B");
    setResult(matchId, gA, gB);
    setLocalResults({ ...getResults() });
  };

  const handleClear = (matchId) => {
    clearResult(matchId);
    setLocalResults({ ...getResults() });
  };

  return (
    <div style={{ padding: "16px 0 100px" }}>
      <div className="leaderboard-header">
        <h2>⚙️ Panel Admin</h2>
        <p>Captura los marcadores reales</p>
        <button className="btn-logout" onClick={onClose} style={{ marginTop: 8 }}>
          Cerrar Admin
        </button>
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
  const [toast, setToast] = useState(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [matchesList, setMatchesList] = useState(MATCHES);

  useEffect(() => {
    setMounted(true);
    const saved = getCurrentUser();
    if (saved) {
      setUser(saved);
      setVotes(getUserVotes(saved));
    }
    const custom = getCustomMatches();
    if (custom && Array.isArray(custom)) {
      setMatchesList(custom);
    }
    if (typeof window !== "undefined" && window.location.search.includes("admin")) {
      setShowAdmin(true);
    }
  }, []);

  const showToast = useCallback((text, type = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 2500);
  }, []);

  const handleLogin = (username) => {
    setUser(username);
    setVotes(getUserVotes(username));
    showToast(`¡Bienvenido, ${username}! ⚽`);
  };

  const handleLogout = () => {
    logoutUser();
    setUser(null);
    setVotes({});
    setTab("matches");
  };

  const handleVote = (matchId, goalsA, goalsB) => {
    const match = matchesList.find((m) => m.id === matchId);
    if (!match || isLocked(match.date)) {
      showToast("⏰ El partido ya comenzó, no puedes votar", "error");
      return;
    }
    setVote(user, matchId, goalsA, goalsB);
    setVotes({ ...getUserVotes(user) });
    showToast("✅ Pronóstico guardado");
  };

  if (!mounted) return null;
  if (!user) return <LoginScreen onLogin={handleLogin} />;

  const results = getResults();

  // Calculate current user stats
  let totalPoints = 0;
  let totalExact = 0;
  let totalOutcomes = 0;
  Object.keys(votes).forEach((mid) => {
    const s = scoreVote(votes[mid], results[mid]);
    if (s === 2) { totalPoints += 2; totalExact++; }
    else if (s === 1) { totalPoints += 1; totalOutcomes++; }
  });

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

      {showAdmin ? (
        <AdminPanel matches={matchesList} onClose={() => setShowAdmin(false)} />
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
          </nav>

          {tab === "matches" && (
            <>
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
                {matchesList.map((match) => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    vote={votes[String(match.id)]}
                    result={results[String(match.id)]}
                    locked={isLocked(match.date)}
                    onVote={handleVote}
                  />
                ))}
                {matchesList.length === 0 && (
                  <div className="empty-state">
                    <div className="empty-icon">⚽</div>
                    <p>No hay partidos cargados todavía.</p>
                  </div>
                )}
              </div>
            </>
          )}

          {tab === "leaderboard" && <LeaderboardView currentUser={user} />}
        </>
      )}

      <Toast msg={toast} />
    </div>
  );
}
