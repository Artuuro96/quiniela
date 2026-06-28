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
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    const u = username.trim();
    if (!u) { setError("Por favor introduce tu nombre"); return; }
    if (u.length < 3) { setError("El nombre debe tener al menos 3 letras"); return; }

    if (isRegister) {
      const res = registerUser(u);
      if (!res.ok) { setError(res.error); return; }
      const login = loginUser(u);
      if (login.ok) onLogin(login.username);
    } else {
      const res = loginUser(u);
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
            placeholder="Tu nombre completo o apodo"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="name"
          />
        </div>
        <div className="form-error">{error}</div>
        <button id="btn-login" className="btn-primary" type="submit" style={{ marginTop: "8px" }}>
          {isRegister ? "Crear cuenta" : "Entrar a la Quiniela"}
        </button>
        <div className="login-toggle" style={{ marginTop: "16px", textAlign: "center", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
          {isRegister ? "¿Ya tienes cuenta? " : "¿Eres nuevo? "}
          <button type="button" onClick={() => { setIsRegister(!isRegister); setError(""); }} style={{ background: "none", border: "none", color: "var(--accent-cyan)", cursor: "pointer", fontWeight: 600, padding: 0 }}>
            {isRegister ? "Inicia sesión" : "Regístrate aquí"}
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
function AdminPanel({ matches, onClose, onMatchesUpdated }) {
  const [results, setLocalResults] = useState(getResults());
  const [usersList, setUsersList] = useState(getUsers());
  const [inputs, setInputs] = useState({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleDeleteUser = (username) => {
    if (window.confirm(`¿Estás seguro de que deseas eliminar al usuario "${username}"? Esto borrará sus pronósticos también.`)) {
      deleteUser(username);
      setUsersList(getUsers());
      setSuccess(`Usuario ${username} eliminado.`);
    }
  };

  const handleFileUpload = (e) => {
    setError("");
    setSuccess("");
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        validateAndSave(text);
      } catch (err) {
        setError("Error al leer el archivo: " + err.message);
      }
    };
    reader.readAsText(file);
  };

  const validateAndSave = (text) => {
    try {
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) {
        throw new Error("El JSON debe ser un arreglo de partidos.");
      }

      parsed.forEach((m, idx) => {
        if (!m.id) throw new Error(`El partido en posición ${idx + 1} no tiene "id".`);
        if (!m.teamA || !m.teamA.name || !m.teamA.flag || !m.teamA.code) {
          throw new Error(`El partido en posición ${idx + 1} no tiene "teamA" con name, flag y code.`);
        }
        if (!m.teamB || !m.teamB.name || !m.teamB.flag || !m.teamB.code) {
          throw new Error(`El partido en posición ${idx + 1} no tiene "teamB" con name, flag y code.`);
        }
        if (!m.date) {
          throw new Error(`El partido en posición ${idx + 1} no tiene "date".`);
        }
        if (!m.venue) {
          throw new Error(`El partido en posición ${idx + 1} no tiene "venue".`);
        }
      });

      saveCustomMatches(parsed);
      onMatchesUpdated(parsed);
      setSuccess("¡Partidos cargados correctamente!");
    } catch (err) {
      setError(err.message);
    }
  };

  const handleReset = () => {
    if (window.confirm("¿Estás seguro de que quieres restablecer los partidos predeterminados?")) {
      clearCustomMatches();
      onMatchesUpdated(MATCHES);
      setError("");
      setSuccess("¡Partidos restablecidos a los predeterminados!");
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

  const handleExport = () => {
    const data = {
      users: getUsers(),
      votes: getAllVotes(),
      results: getResults(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "quiniela_data.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  const handleBackupUpload = (e) => {
    setError("");
    setSuccess("");
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const data = JSON.parse(text);
        if (!data.users || !data.votes || !data.results) {
          throw new Error("El archivo no tiene el formato de backup válido (faltan users, votes o results).");
        }
        restoreAllData(data);
        setSuccess("Backup restaurado correctamente. Recargando...");
        setTimeout(() => window.location.reload(), 1500);
      } catch (err) {
        setError("Error al restaurar backup: " + err.message);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div style={{ padding: "16px 0 100px" }}>
      <div className="leaderboard-header">
        <h2>⚙️ Panel Admin</h2>
        <p>Captura los marcadores reales y exporta datos</p>
        <div style={{ display: "flex", gap: "8px", justifyContent: "center", marginTop: "8px", flexWrap: "wrap" }}>
          <button className="btn-primary" onClick={handleExport} style={{ padding: "8px 16px", fontSize: "0.85rem", flex: 1, minWidth: "140px" }}>
            📥 Exportar Backup (Recovery)
          </button>
          <button className="btn-logout" onClick={() => {
            if (window.confirm("⚠️ ¿PELIGRO: Estás seguro de borrar a todos los usuarios, pronósticos y resultados?")) {
              clearAllData();
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
        <h3 style={{ fontSize: "1rem", marginBottom: "8px", textAlign: "left" }}>Cargar Partidos (JSON)</h3>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: 16, textAlign: "left", lineHeight: "1.4" }}>
          Sube un archivo JSON con los partidos. Opcionalmente usa el campo <code>"stage"</code> para la fase ("16avos", "8avos", "4tos", "semis", "final").
        </p>

        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
          <div className="form-group" style={{ flex: 1, minWidth: "200px" }}>
            <label className="form-label" style={{ textAlign: "center", cursor: "pointer", display: "block", border: "2px dashed var(--border-glass)", padding: "16px", borderRadius: "var(--radius-md)", transition: "var(--transition-fast)" }}>
              <span style={{ fontSize: "1.5rem", display: "block", marginBottom: 4 }}>📁</span>
              <span style={{ color: "var(--accent-cyan)", fontWeight: 600 }}>JSON Partidos</span>
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                style={{ display: "none" }}
              />
            </label>
          </div>
          <div className="form-group" style={{ flex: 1, minWidth: "200px" }}>
            <label className="form-label" style={{ textAlign: "center", cursor: "pointer", display: "block", border: "2px dashed var(--border-glass)", padding: "16px", borderRadius: "var(--radius-md)", transition: "var(--transition-fast)" }}>
              <span style={{ fontSize: "1.5rem", display: "block", marginBottom: 4 }}>📦</span>
              <span style={{ color: "var(--accent-cyan)", fontWeight: 600 }}>Restaurar Backup</span>
              <input
                type="file"
                accept=".json"
                onChange={handleBackupUpload}
                style={{ display: "none" }}
              />
            </label>
          </div>
        </div>

        {error && <div className="form-error" style={{ marginBottom: 12, color: "var(--accent-red)" }}>❌ {error}</div>}
        {success && <div className="vote-saved-msg" style={{ marginBottom: 12, color: "var(--accent-green)" }}>✅ {success}</div>}

        <button className="btn-logout" onClick={handleReset} style={{ width: "100%", borderColor: "var(--accent-red)", color: "var(--accent-red)", padding: "10px", marginTop: 8 }}>
          Restablecer partidos predeterminados
        </button>
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
  const [filterStage, setFilterStage] = useState("all");

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
        <AdminPanel matches={matchesList} onClose={() => setShowAdmin(false)} onMatchesUpdated={setMatchesList} />
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

          {tab === "leaderboard" && <LeaderboardView currentUser={user} />}
        </>
      )}

      <Toast msg={toast} />
    </div>
  );
}
