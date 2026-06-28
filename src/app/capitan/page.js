"use client";

import { useState, useEffect } from "react";
import { MATCHES } from "@/data/matches";
import {
  getCustomMatches,
  saveCustomMatches,
  clearCustomMatches,
} from "@/lib/storage";

export default function CapitanPage() {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [matchesCount, setMatchesCount] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const custom = getCustomMatches();
    setMatchesCount(custom && Array.isArray(custom) ? custom.length : MATCHES.length);
  }, []);

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
          throw new Error(`El partido en posición ${idx + 1} no tiene "date" (formato ISO, ej. "2026-06-28T19:00:00Z").`);
        }
        if (!m.venue) {
          throw new Error(`El partido en posición ${idx + 1} no tiene "venue".`);
        }
      });

      saveCustomMatches(parsed);
      setMatchesCount(parsed.length);
      setSuccess("¡Partidos cargados correctamente!");
    } catch (err) {
      setError(err.message);
    }
  };

  const handleReset = () => {
    if (confirm("¿Estás seguro de que quieres restablecer los partidos predeterminados?")) {
      clearCustomMatches();
      setMatchesCount(MATCHES.length);
      setError("");
      setSuccess("¡Partidos restablecidos a los predeterminados!");
    }
  };

  if (!mounted) return null;

  const sampleJson = `[
  {
    "id": 1,
    "teamA": { "name": "Sudáfrica", "flag": "🇿🇦", "code": "RSA" },
    "teamB": { "name": "Canadá", "flag": "🇨🇦", "code": "CAN" },
    "date": "2026-06-28T19:00:00Z",
    "venue": "Los Ángeles"
  }
]`;

  return (
    <div className="app-container" style={{ padding: "40px 16px" }}>
      <header className="app-header" style={{ marginBottom: "32px", borderBottom: "none" }}>
        <div className="app-logo" style={{ fontSize: "1.8rem" }}>
          <span>👨‍✈️</span> Portal Capitán
        </div>
        <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "4px" }}>
          Carga de partidos y horarios de la Quiniela Jiménez
        </p>
      </header>

      <div className="login-card" style={{ maxWidth: "100%", margin: "0 auto 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Partidos cargados actualmente:</span>
          <span style={{ fontSize: "1rem", fontWeight: "800", color: "var(--accent-cyan)" }}>{matchesCount}</span>
        </div>

        <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: 20, textAlign: "left", lineHeight: "1.4" }}>
          Selecciona un archivo JSON válido para actualizar los partidos y sus horarios de forma inmediata.
        </p>

        <div className="form-group">
          <label className="form-label" style={{ textAlign: "center", cursor: "pointer", display: "block", border: "2px dashed var(--border-glass)", padding: "32px 12px", borderRadius: "var(--radius-md)", transition: "var(--transition-fast)" }}>
            <span style={{ fontSize: "2rem", display: "block", marginBottom: 8 }}>📁</span>
            <span style={{ color: "var(--accent-cyan)", fontWeight: 600 }}>Seleccionar archivo JSON</span>
            <input
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              style={{ display: "none" }}
            />
          </label>
        </div>

        {error && <div className="form-error" style={{ marginBottom: 12, color: "var(--accent-red)" }}>❌ {error}</div>}
        {success && <div className="vote-saved-msg" style={{ marginBottom: 12, color: "var(--accent-green)" }}>✅ {success}</div>}

        <button className="btn-logout" onClick={handleReset} style={{ width: "100%", borderColor: "var(--accent-red)", color: "var(--accent-red)", padding: "10px", marginTop: 8 }}>
          Restablecer predeterminados
        </button>
      </div>

      <div className="login-card" style={{ maxWidth: "100%", margin: "0 auto", textAlign: "left" }}>
        <h4 style={{ marginBottom: 8, fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-secondary)" }}>Formato JSON requerido:</h4>
        <pre style={{
          background: "rgba(0,0,0,0.3)",
          padding: 12,
          borderRadius: "var(--radius-md)",
          fontSize: "0.75rem",
          overflowX: "auto",
          fontFamily: "monospace",
          border: "1px solid var(--border-glass)",
          color: "var(--text-secondary)",
          lineHeight: 1.4
        }}>
          {sampleJson}
        </pre>
      </div>

      <div style={{ textAlign: "center", marginTop: "24px" }}>
        <a href="/" className="btn-logout" style={{ display: "inline-block", textDecoration: "none", padding: "8px 24px" }}>
          Ir a la Quiniela
        </a>
      </div>
    </div>
  );
}
