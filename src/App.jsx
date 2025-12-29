import { Routes, Route, Link, useNavigate, useParams } from 'react-router-dom';
import segments from './data/segments';
import {
  buildApproach,
  costEstimates,
  costScore,
  feasibilityColors,
  mapScoreToLabel,
  materialQuantities,
  politicalScore,
  scheduleScore,
  scoreToPercentage,
  structuralFeasibility,
  structuralSystem,
  urbanBenefit,
  weightedOverall,
} from './utils';

const defaultConfig = {
  slab_thickness_ft: 2.5,
  girder_spacing_ft: 10,
  deck_thickness_ft: 0.75,
  assumed_span_ft: 80,
  ton_per_girder_ft: 0.1,
  rebar_factor: 120,
  allowances: {
    utilities_pct: 0.1,
    traffic_staging_pct: 0.12,
    tunnel_systems_pct: 0.35,
  },
  unit_costs: {
    concrete: 650,
    rebar: 1.2,
    waterproofing: 12,
    girder_steel: 5200,
    foundation_bent: 450000,
  },
};

const Layout = ({ children }) => (
  <div className="app-shell">
    <nav>
      <div>
        <Link to="/" style={{ fontWeight: 800, fontSize: 18 }}>
          Urban Freeway Cap Feasibility
        </Link>
      </div>
      <div className="nav-links">
        <Link className="button secondary" to="/segments">
          Segment Library
        </Link>
      </div>
    </nav>
    {children}
    <div className="disclaimer">
      Comparative feasibility only. Not engineering design, cost estimating, or schedule prediction.
    </div>
  </div>
);

const Home = () => (
  <Layout>
    <div className="hero card">
      <div>
        <div className="tag">Conceptual Engineering Screener</div>
        <h1>Can we cap this below-grade freeway?</h1>
        <p>
          A transparent, assumption-driven explorer that screens structural, cost, schedule, urban, and process
          feasibility for U.S. freeway cap concepts.
        </p>
        <div style={{ display: 'flex', gap: 12 }}>
          <Link className="button" to="/segments">
            Browse segments
          </Link>
          <a className="button secondary" href="#principles">
            Methodology
          </a>
        </div>
        <div id="principles" className="callouts">
          <div className="callout">Structural realism without detailed calcs</div>
          <div className="callout">Relative feasibility, not bid pricing</div>
          <div className="callout">Built on explainable rules and allowances</div>
        </div>
      </div>
      <div className="card" style={{ border: '1px dashed #cbd5e1', background: '#f8fafc' }}>
        <h3 style={{ marginTop: 0 }}>What you get</h3>
        <ul>
          <li>Overall feasibility color band with narrative</li>
          <li>Structural system choice and build sequence</li>
          <li>Order-of-magnitude quantities and cost range</li>
          <li>Urban, political, and schedule drivers</li>
        </ul>
      </div>
    </div>
  </Layout>
);

const SegmentLibrary = () => (
  <Layout>
    <h2>Segment Library</h2>
    <p>Pre-curated below-grade freeway segments across U.S. cities.</p>
    <div className="grid">
      {segments.map((segment) => (
        <div key={segment.id} className="card">
          <div className="score-row">
            <div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>
                {segment.city}, {segment.state}
              </div>
              <div style={{ color: '#334155', fontWeight: 600 }}>{segment.segment_name}</div>
            </div>
            <Link className="button" to={`/segments/${segment.id}`}>
              View
            </Link>
          </div>
          <div className="badge" style={{ marginTop: 8 }}>
            Width {segment.width_ft} ft · Length {segment.length_ft} ft · {segment.condition.replace('_', ' ')}
          </div>
          <p style={{ marginBottom: 0 }}>{segment.notes}</p>
        </div>
      ))}
    </div>
  </Layout>
);

const SegmentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const segment = segments.find((s) => s.id === id);

  if (!segment) {
    return (
      <Layout>
        <p>Segment not found.</p>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="score-row">
        <div>
          <div className="badge">{segment.highway}</div>
          <h2 style={{ margin: '6px 0 4px' }}>{segment.segment_name}</h2>
          <p style={{ margin: 0, color: '#334155' }}>
            {segment.city}, {segment.state} · {segment.width_ft} ft wide · {segment.length_ft} ft long ·{' '}
            {segment.condition.replace('_', ' ')}
          </p>
        </div>
        <button className="button" onClick={() => navigate(`/segments/${segment.id}/results`)}>
          Run Feasibility
        </button>
      </div>
      <div className="grid">
        <div className="card">
          <div className="section-title">Context</div>
          <ul>
            <li>Ramps present: {segment.ramps_present ? 'Yes' : 'No'}</li>
            <li>Interchange within segment: {segment.interchange_within_segment ? 'Yes' : 'No'}</li>
            <li>Adjacent density: {segment.adjacent_density}</li>
            <li>Grid reconnection value: {segment.grid_reconnection_value}</li>
            <li>Ownership: {segment.ownership}</li>
            <li>Prior studies: {segment.prior_studies ? 'Yes' : 'No'}</li>
            <li>Funding alignment: {segment.funding_alignment}</li>
          </ul>
        </div>
        <div className="card">
          <div className="section-title">Notes</div>
          <p>{segment.notes}</p>
          <div className="disclaimer" style={{ marginTop: 8 }}>
            This is an early-stage conceptual view. Select "Run Feasibility" to generate a structured memo.
          </div>
        </div>
      </div>
    </Layout>
  );
};

const ScoreBar = ({ label, score, description }) => (
  <div className="score-row">
    <div style={{ width: 180 }}>
      <div style={{ fontWeight: 700 }}>{label}</div>
      <div style={{ color: '#334155', fontSize: 13 }}>{description}</div>
    </div>
    <div className="score-bar">
      <div className="score-indicator" style={{ left: `${scoreToPercentage(score)}%` }} />
    </div>
    <div style={{ fontWeight: 700, minWidth: 90, textAlign: 'right' }}>{mapScoreToLabel(score)}</div>
  </div>
);

const MaterialsTable = ({ quantities }) => (
  <table className="table">
    <thead>
      <tr>
        <th>Item</th>
        <th>Approximate quantity</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Cap area</td>
        <td>{quantities.area.toLocaleString()} sq ft</td>
      </tr>
      <tr>
        <td>Concrete volume (slab/deck)</td>
        <td>{quantities.slabConcreteVolume.toLocaleString()} cubic ft</td>
      </tr>
      <tr>
        <td>Rebar weight (allowance)</td>
        <td>{quantities.rebarWeight.toLocaleString()} lb</td>
      </tr>
      <tr>
        <td>Waterproofing area</td>
        <td>{quantities.waterproofingArea.toLocaleString()} sq ft</td>
      </tr>
      <tr>
        <td>Girders</td>
        <td>
          ~{quantities.numGirders} lines @ ~{quantities.girderTonnage.toLocaleString()} ton allowance
        </td>
      </tr>
      <tr>
        <td>Foundations</td>
        <td>{quantities.numBents} bents (~{quantities.supports} supports)</td>
      </tr>
    </tbody>
  </table>
);

const CostCard = ({ cost }) => (
  <div className="card">
    <div className="section-title">Cost Estimate (conceptual)</div>
    <p>
      Derived from order-of-magnitude quantities × unit costs with allowances for utilities, traffic staging, and
      tunnel systems where applicable.
    </p>
    <div className="score-row">
      <div style={{ fontWeight: 800, fontSize: 22 }}>
        ${Math.round(cost.low / 1_000_000).toLocaleString()}M – ${Math.round(cost.high / 1_000_000).toLocaleString()}M
      </div>
      <div className="badge">Not a bid price</div>
    </div>
    <div className="section-title">Top cost drivers</div>
    <ul>
      {cost.drivers.map((d) => (
        <li key={d}>{d}</li>
      ))}
    </ul>
  </div>
);

const StructuralMemo = ({ segment, approach }) => (
  <div className="card">
    <div className="section-title">Structural engineering concept</div>
    <p>
      Selected system: <span className="highlight">{approach.system}</span> for a {segment.width_ft} ft clear width and
      {segment.length_ft} ft length.
    </p>
    <ol>
      {approach.steps.map((step, idx) => (
        <li key={idx}>{step}</li>
      ))}
    </ol>
    <p>
      Load path logic is simplified: deck or girders carry traffic and cover loads to transverse supports at assumed
      span spacing, then down to foundations adjacent to the trench. Waterproofing and drainage are included to protect
      the corridor below.
    </p>
  </div>
);

const PillarCard = ({ title, score, explanation }) => (
  <div className="card" style={{ borderTop: `6px solid ${feasibilityColors[score - 1]}` }}>
    <div className="score-row">
      <div>
        <div style={{ fontWeight: 800 }}>{title}</div>
        <div style={{ color: '#334155' }}>{explanation}</div>
      </div>
      <div className="badge" style={{ background: feasibilityColors[score - 1], color: '#0f172a' }}>
        {mapScoreToLabel(score)}
      </div>
    </div>
  </div>
);

const Results = () => {
  const { id } = useParams();
  const segment = segments.find((s) => s.id === id);

  if (!segment) {
    return (
      <Layout>
        <p>Segment not found.</p>
      </Layout>
    );
  }

  const scores = {
    structural: structuralFeasibility(segment),
    cost: costScore(segment),
    schedule: scheduleScore(segment),
    urban: urbanBenefit(segment),
    political: politicalScore(segment),
  };
  const overall = weightedOverall(scores);
  const approach = buildApproach(segment);
  const quantities = materialQuantities(segment, defaultConfig);
  const cost = costEstimates(segment, quantities, defaultConfig);

  const explanations = {
    structural:
      segment.condition === 'partial_tunnel'
        ? 'Width and tunnel-like conditions push ventilation, fire-life safety, and span complexity.'
        : 'Trench condition supports deck installation with constructible spans and staged foundations.',
    cost: 'Relative cost reflects width, ramps/interchanges, and tunnel allowances where present.',
    schedule: 'Schedule risks come from ownership mix, studies readiness, and interchange interfaces.',
    urban: 'Urban benefit is tied to adjacency density and how much grid reconnection the cap restores.',
    political: 'Process readiness considers ownership, prior studies, and funding alignment.',
  };

  return (
    <Layout>
      <div className="card" style={{ borderTop: `8px solid ${feasibilityColors[overall - 1]}` }}>
        <div className="score-row">
          <div>
            <div className="badge">Overall feasibility</div>
            <h2 style={{ margin: '6px 0 4px' }}>{mapScoreToLabel(overall)}</h2>
            <p style={{ margin: 0, color: '#334155' }}>
              Weighted view across structural (25%), cost (25%), schedule (20%), urban (20%), and political (10%).
            </p>
          </div>
          <div className="score-bar" style={{ width: 260 }}>
            <div className="score-indicator" style={{ left: `${scoreToPercentage(overall)}%` }} />
          </div>
        </div>
      </div>

      <div className="grid" style={{ marginTop: 14 }}>
        <PillarCard title="Structural & Civil" score={scores.structural} explanation={explanations.structural} />
        <PillarCard title="Cost feasibility" score={scores.cost} explanation={explanations.cost} />
        <PillarCard title="Schedule" score={scores.schedule} explanation={explanations.schedule} />
        <PillarCard title="Urban benefit" score={scores.urban} explanation={explanations.urban} />
        <PillarCard title="Political / process" score={scores.political} explanation={explanations.political} />
      </div>

      <StructuralMemo segment={segment} approach={approach} />

      <div className="card">
        <div className="section-title">Materials & quantities (order-of-magnitude)</div>
        <MaterialsTable quantities={quantities} />
      </div>

      <CostCard cost={cost} />

      <div className="card">
        <div className="section-title">Conceptual build approach</div>
        <ol>
          <li>Maintain traffic operations while constructing support bents or walls from the outside in.</li>
          <li>Set primary spanning system ({approach.system.toLowerCase()}) and place deck or slab.</li>
          <li>Install waterproofing, drainage, ventilation (if tunnel), and life-safety systems.</li>
          <li>Backfill, compact, and construct the surface program (parks, streets, civic space).</li>
        </ol>
        <p style={{ marginBottom: 0 }}>
          Ramps and interchanges introduce staging complexity and night/weekend work allowances. Lengths beyond 1,500 ft
          push schedule and ventilation needs.
        </p>
      </div>
    </Layout>
  );
};

const App = () => (
  <Routes>
    <Route path="/" element={<Home />} />
    <Route path="/segments" element={<SegmentLibrary />} />
    <Route path="/segments/:id" element={<SegmentDetail />} />
    <Route path="/segments/:id/results" element={<Results />} />
  </Routes>
);

export default App;
