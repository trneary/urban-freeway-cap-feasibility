import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

const PageShell = ({ children }) => (
  <div className="app-shell">
    <nav>
      <div>
        <Link to="/" style={{ fontWeight: 800, fontSize: 18 }}>
          Urban Freeway Cap Feasibility
        </Link>
      </div>
      <div className="nav-links">
        <Link className="button secondary" to="/segments">Browse</Link>
        <Link className="button secondary" to="/methodology">Methodology</Link>
      </div>
    </nav>
    {children}
  </div>
);

const SUGGESTED_QUERIES = ["Boston", "Atlanta", "Denver", "Seattle"];

export default function SearchSegments() {
  const API_BASE = (import.meta?.env?.VITE_API_BASE_URL || "").replace(/\/$/, "");

  const [cityQuery, setCityQuery] = useState("");
  const [cityResults, setCityResults] = useState([]);
  const [cityLoading, setCityLoading] = useState(false);
  const [cityError, setCityError] = useState("");

  const requestIdRef = useRef(0);
  const debounceRef = useRef(null);

  const trimmedQuery = cityQuery.trim();
  const shouldShowDropdown = trimmedQuery.length >= 2;

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (trimmedQuery.length < 2) {
      setCityResults([]);
      setCityLoading(false);
      setCityError("");
      return;
    }

    debounceRef.current = setTimeout(() => {
      const requestId = ++requestIdRef.current;
      setCityLoading(true);
      setCityError("");

      const url = `${API_BASE}/api/cities?query=${encodeURIComponent(trimmedQuery)}`;
      fetch(url)
        .then((res) => {
          if (!res.ok) throw new Error(`Cities API error: ${res.status}`);
          return res.json();
        })
        .then((data) => {
          if (requestId !== requestIdRef.current) return;
          const list = Array.isArray(data) ? data : [];
          setCityResults(list);
        })
        .catch((err) => {
          if (requestId !== requestIdRef.current) return;
          console.error("[cities] error:", err);
          setCityResults([]);
          setCityError("We couldn't load city matches right now.");
        })
        .finally(() => {
          if (requestId !== requestIdRef.current) return;
          setCityLoading(false);
        });
    }, 250);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [trimmedQuery, API_BASE]);

  const cityLabel = (c) => {
    if (!c) return "";
    if (typeof c === "string") return c;
    if (c.display_name) return c.display_name;
    if (c.label) return c.label;
    if (c.name) return c.name;
    if (c.city_name && c.state_abbr) return `${c.city_name}, ${c.state_abbr}`;
    if (c.city && c.state) return `${c.city}, ${c.state}`;
    return "";
  };

  const handlePickCity = (city) => {
    const label = cityLabel(city);
    if (!label) return;
    setCityQuery(label);
    setCityResults([]);
  };

  const renderResults = () => {
    if (!shouldShowDropdown) return null;
    if (cityLoading) {
      return <div className="card" style={{ marginTop: 12 }}>Loading matches…</div>;
    }
    if (cityError) {
      return (
        <div className="card" style={{ marginTop: 12, color: '#b91c1c' }}>
          {cityError}
        </div>
      );
    }
    if (cityResults.length === 0) {
      return <div className="card" style={{ marginTop: 12 }}>No matching cities found.</div>;
    }

    return (
      <div className="card" style={{ marginTop: 12, padding: 0 }}>
        {cityResults.map((c, idx) => {
          const label = cityLabel(c);
          if (!label) return null;
          return (
            <button
              key={c.city_id ?? label ?? idx}
              onClick={() => handlePickCity(c)}
              className="button secondary"
              style={{
                width: '100%',
                justifyContent: 'space-between',
                border: 'none',
                borderBottom: idx === cityResults.length - 1 ? 'none' : '1px solid #e2e8f0',
                borderRadius: 0,
                padding: '12px 16px',
                background: '#fff',
                color: '#0f172a',
                textAlign: 'left',
              }}
            >
              <span style={{ fontWeight: 700 }}>{label}</span>
              <span style={{ color: '#64748b', fontSize: 12 }}>Tap to use</span>
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <PageShell>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="tag">Segment finder</div>
        <h1 style={{ margin: '8px 0 4px' }}>Search national segment pool</h1>
        <p style={{ color: '#334155', margin: 0 }}>
          Type at least two letters to find cities in the seeded database. Choose a city to reuse across
          feasibility scenarios.
        </p>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <label style={{ display: 'block', fontWeight: 700, marginBottom: 8 }}>City name</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            value={cityQuery}
            placeholder="Start typing (e.g., Boston, Denver, Atlanta)"
            onChange={(e) => setCityQuery(e.target.value)}
            style={{
              flex: 1,
              padding: '12px 14px',
              borderRadius: 10,
              border: '1px solid #cbd5e1',
              fontSize: 16,
              outline: 'none',
            }}
          />
          <div className="badge" style={{ alignSelf: 'center' }}>
            {cityLoading ? 'Searching…' : shouldShowDropdown ? 'Type to refine' : 'Start typing'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          {SUGGESTED_QUERIES.map((q) => (
            <button
              key={q}
              className="button secondary"
              style={{ padding: '8px 12px' }}
              onClick={() => setCityQuery(q)}
              type="button"
            >
              {q}
            </button>
          ))}
        </div>

        {renderResults()}
      </div>

      <div className="card" style={{ background: '#f8fafc', borderStyle: 'dashed' }}>
        <h3 style={{ marginTop: 0 }}>What happens after you pick a city?</h3>
        <ul style={{ marginBottom: 0 }}>
          <li>We keep the city text so you can paste it into segment inputs.</li>
          <li>The API pulls from the Top 100 seed list stored in Postgres (column: display_name).</li>
          <li>If nothing appears, confirm the backend at /api/cities is reachable from this origin.</li>
        </ul>
      </div>
    </PageShell>
  );
}