import { Routes, Route, Link, useNavigate, useParams } from 'react-router-dom';
import { Component, useState } from 'react';
import segments from './data/segments';
import {
  costEstimates,
  mapPointsToBadgeLabel,
  mapPointsToColor,
  mapCostPointsToLabel,
  mapCostPointsToColor,
  mapTotalPointsToPresentationLabel,
  mapTotalPointsToColor,
  materialQuantities,
  calculateFeasibilityScores,
  buildScoringInputs,
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

const scoringMethodology = [
  {
    key: 'structural',
    title: 'Structural & Civil · 25 pts',
    summary: 'Starts at 25 points; deductions reflect trench geometry, subsurface certainty, and interfaces.',
    rules: [
      'Vertical profile suitability: 0 to -10 pts (below-grade trench vs. at-grade/elevated geometry).',
      'Trench / retaining compatibility: 0 to -7 pts based on retrofit needs.',
      'Geotechnical & groundwater risk: 0 to -5 pts for moderate to high uncertainty.',
      'Structural interfaces (ramps/bridges): 0 to -3 pts when additional span transitions are required.',
    ],
  },
  {
    key: 'cost',
    title: 'Cost feasibility · 25 pts',
    summary: 'Purely geometric/staging deductions tied to quantities and allowances.',
    rules: [
      'Clear width: 0 to -6 pts once widths exceed 200/240/300 ft thresholds.',
      'Deck length: 0 to -6 pts beyond 2k/3k/4k ft corridors.',
      'Ramps inside the segment: -2 pts each, capped at -8 pts.',
      'Major interchange inside footprint: flat -8 pts.',
    ],
  },
  {
    key: 'schedule',
    title: 'Schedule · 20 pts',
    summary: 'Assesses constraints on construction flow and work windows.',
    rules: [
      'Traffic operations constraints: 0 to -8 pts depending on detour flexibility.',
      'Construction staging flexibility: 0 to -6 pts (linear vs. multi-phase vs. brittle).',
      'Work window restrictions: 0 to -4 pts for seasonal/night-only limits.',
      'Subsurface/utility uncertainty: 0 to -2 pts where as-builts are missing.',
    ],
  },
  {
    key: 'urban',
    title: 'Urban benefit · 20 pts',
    summary: 'Captures how much urban value the cap can return.',
    rules: [
      'Urban context intensity: 0 to -8 pts (dense vs. low-intensity edges).',
      'Connectivity restoration: 0 to -6 pts for partial/minimal reconnections.',
      'Public realm opportunity: 0 to -4 pts when surface program is limited.',
      'Destination adjacency: 0 to -2 pts if few anchors benefit.',
    ],
  },
  {
    key: 'political',
    title: 'Political / Process · 10 pts',
    summary: 'Coordination risk tied to ownership, studies, and jurisdictions.',
    rules: [
      'Ownership / control: City (0), State (-2), Mixed (-4).',
      'Prior studies or planning work: -3 pts if absent.',
      'Jurisdiction count: 1 (0), 2 (-2), 3+ (-3).',
    ],
  },
];

const formatNumber = (value) => value.toLocaleString(undefined, { maximumFractionDigits: 0 });

const verticalProfileLabels = {
  belowGradeTrench: 'Below-grade trench',
  partiallyBelowGrade: 'Partially below-grade',
  atGrade: 'At-grade',
  elevatedOrViaduct: 'Elevated / viaduct',
};

const verticalProfileInputLabels = {
  belowGradeTrench: 'Below-grade trench',
  partiallyBelowGrade: 'Partially below-grade',
  atGrade: 'At-grade',
  elevatedOrViaduct: 'Elevated / viaduct',
};

const trenchCompatibilityLabels = {
  deckReady: 'Deck-ready',
  possibleWithMajorRebuild: 'Possible with major rebuild',
  notCompatibleOrUnknown: 'Not compatible',
  unknown: 'Unknown',
};

const geotechRiskLabels = {
  low: 'Low',
  moderate: 'Moderate',
  high: 'High',
  highOrUnknown: 'High',
  unknown: 'Unknown',
};

const structureInterfacesLabels = {
  none: 'None',
  some: 'Some',
  major: 'Major',
  unknown: 'Unknown',
};

const trafficOpsLabels = {
  flexible: 'Flexible',
  moderate: 'Moderate constraint',
  severe: 'Severe constraint',
};

const stagingLabels = {
  linear: 'Linear',
  multi_phase: 'Multi-phase',
  brittle: 'Brittle',
};

const workWindowLabels = {
  standard: 'Standard',
  restricted: 'Restricted',
  heavy: 'Heavy',
};

const subsurfaceLabels = {
  well_documented: 'Well documented',
  moderate_uncertainty: 'Moderate',
  high_uncertainty: 'High',
  missing_data: 'Missing data',
  unknown: 'Unknown',
};

const urbanContextLabels = {
  dense: 'Dense',
  moderate: 'Moderate',
  low: 'Low',
};

const urbanConnectivityLabels = {
  major: 'Major',
  partial: 'Partial',
  minimal: 'Minimal',
};

const urbanPublicSpaceLabels = {
  large: 'Large',
  moderate: 'Moderate',
  limited: 'Limited',
};

const urbanDestinationsLabels = {
  multiple: 'Multiple',
  one: 'One',
  none: 'None',
};

const lookupLabel = (map, value, fallback = 'Unknown') => map[value] || fallback;

const formatOwnershipLabel = (ownership) => {
  if (ownership === 'city') return 'City';
  if (ownership === 'state') return 'State';
  if (ownership === 'mixed') return 'Mixed';
  return 'Unknown';
};

const formatJurisdictionValue = (count) => {
  if (typeof count !== 'number') return 'Unknown';
  if (count >= 3) return '3+';
  return formatNumber(count);
};

const formatPlainText = (value) => {
  if (typeof value !== 'string' || value.trim().length === 0) return 'Not provided';
  return value
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const formatBoolean = (value) => (value ? 'Yes' : 'No');

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Layout>
          <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
            <h2>Something went wrong</h2>
            <p>We encountered an error while processing the feasibility analysis.</p>
            <button 
              className="button" 
              onClick={() => window.location.reload()}
              style={{ marginTop: '1rem' }}
            >
              Reload Page
            </button>
            <details style={{ marginTop: '1rem', textAlign: 'left' }}>
              <summary>Error details (for debugging)</summary>
              <pre style={{ fontSize: '12px', marginTop: '0.5rem' }}>
                {this.state.error?.toString()}
              </pre>
            </details>
          </div>
        </Layout>
      );
    }

    return this.props.children;
  }
}

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
  </div>
);

const buildDrivers = (segment, feasibility) => {
  const rampCount = segment.ramp_count !== undefined ? segment.ramp_count : 0;
  const drivers = {
    structural: [],
    cost: [],
    schedule: [],
    urban: [],
    political: [],
  };

  // Structural drivers
  feasibility.structural.penalties.forEach(penalty => {
    drivers.structural.push(penalty.label);
  });

  // Cost drivers
  feasibility.cost.penalties.forEach(penalty => {
    if (penalty.key === 'width') {
      let widthDriver;
      if (segment.width_ft > 300) {
        widthDriver = 'Width exceeds 300 ft, significantly increasing structural quantities.';
      } else if (segment.width_ft > 240) {
        widthDriver = 'Width between 240–300 ft, increasing structural quantities.';
      } else {
        widthDriver = 'Width between 200–240 ft, moderately increasing costs.';
      }
      drivers.cost.push(widthDriver);
    } else if (penalty.key === 'length') {
      let lengthDriver;
      if (segment.length_ft > 4000) {
        lengthDriver = 'Length exceeds 4,000 ft, significantly increasing deck quantities and staging.';
      } else if (segment.length_ft > 3000) {
        lengthDriver = 'Length between 3,000–4,000 ft, increasing deck quantities.';
      } else {
        lengthDriver = 'Length between 2,000–3,000 ft, moderately increasing costs.';
      }
      drivers.cost.push(lengthDriver);
    } else if (penalty.key === 'ramps') {
      drivers.cost.push(`Ramps (${rampCount}) add ${penalty.points} points to staging and diaphragm costs.`);
    } else if (penalty.key === 'interchange') {
      drivers.cost.push('Major interchange within segment adds 8 points for complexity and cost.');
    } else {
      drivers.cost.push(`Penalty: ${penalty.key} - ${penalty.points} points`);
    }
  });

  // Schedule drivers
  feasibility.schedule.penalties.forEach(penalty => {
    drivers.schedule.push(penalty.key); // key is now the full label with explanation
  });

  // Urban drivers
  feasibility.urban.penalties.forEach(penalty => {
    drivers.urban.push(penalty.key);
  });

  // Political/Process drivers
  feasibility.politicalProcess.penalties.forEach(penalty => {
    drivers.political.push(`Penalty: ${penalty.key} - ${penalty.points} points`);
  });

  return drivers;
};

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
          <li>Order-of-magnitude quantities and cost range</li>
          <li>Urban, political, and schedule drivers</li>
        </ul>
      </div>
    </div>
    <div className="disclaimer">
      <div style={{ fontWeight: 600 }}>Comparative feasibility only.</div>
      <div style={{ fontSize: '14px', marginTop: '4px' }}>Not engineering design, cost estimating, or schedule prediction.</div>
    </div>
  </Layout>
);

const SegmentLibrary = () => {
  return (
    <Layout>
      <h2>Segment Library</h2>
      <p>Pre-curated below-grade freeway segments across U.S. cities.</p>
      <div className="grid">
        {segments.map((segment) => {
          return (
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
                Clear width {segment.width_ft} ft · Deck length {segment.length_ft} ft · {segment.condition.replace('_', ' ')}
              </div>
              <p style={{ marginBottom: 0 }}>{segment.notes}</p>
            </div>
          );
        })}
      </div>
    </Layout>
  );
};

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
            {segment.city}, {segment.state} · Clear width {segment.width_ft} ft · Deck length {segment.length_ft} ft ·{' '}
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
            <li>Ownership / control: {formatOwnershipLabel(segment.ownership)}</li>
            <li>Prior studies: {segment.priorStudies ? 'Yes' : 'No'}</li>
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
    <div style={{ fontWeight: 700, minWidth: 90, textAlign: 'right' }}>{mapScoreToBadgeLabel(score)}</div>
  </div>
);

const CostCard = ({ cost }) => (
  <div className="card">
    <div className="section-title" style={{ marginTop: 0 }}>Estimated capital range</div>
    <p className="muted" style={{ fontSize: 14 }}>
      Indicative capital cost range based on segment geometry, structural complexity, and comparable urban freeway cap
      projects. Values are intended for relative screening only.
    </p>
    <div className="score-row" style={{ marginTop: 16 }}>
      <div style={{ fontWeight: 800, fontSize: 24, color: '#0f172a' }}>
        ${Math.round(cost.low / 1_000_000).toLocaleString()}M – ${Math.round(cost.high / 1_000_000).toLocaleString()}M
      </div>
    </div>
  </div>
);

const CategoryBreakdown = ({ max, score, penalties }) => {
  const validPenalties = penalties.filter(p => p && typeof p.points === 'number' && p.label);
  return (
    <div className="category-breakdown">
      <h4>Point breakdown</h4>
      <div className="breakdown-row">
        <span>Starting points</span>
        <span>+{max}</span>
      </div>
      {validPenalties.map((penalty) => (
        <div key={penalty.key} className="breakdown-row penalty-row">
          <div>
            <strong>{penalty.label}</strong>
            <div className="description">{penalty.description || 'No description provided.'}</div>
          </div>
          <span>{penalty.points}</span>
        </div>
      ))}
      <div className="breakdown-row final-row">
        <span>Category score</span>
        <span>{score}/{max}</span>
      </div>
    </div>
  );
};

const PillarCard = ({ title, points, max, explanation, drivers = [], isExpanded, onToggle, penalties = [] }) => {
  const isCost = title === 'Cost feasibility';
  const badgeLabel = isCost ? mapCostPointsToLabel(points) : mapPointsToBadgeLabel(points, max);
  const badgeColor = isCost ? mapCostPointsToColor(points) : mapPointsToColor(points, max);
  return (
    <div className="card" style={{ borderTop: `6px solid ${badgeColor}` }}>
      <div className="score-row">
        <div>
          <div style={{ fontWeight: 800 }}>{title}</div>
          <div style={{ color: '#334155' }}>{explanation}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={onToggle}
            aria-expanded={isExpanded}
            aria-controls={`breakdown-${title.replace(/\s+/g, '-').toLowerCase()}`}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}
          >
            {isExpanded ? '▲' : '▼'}
          </button>
          <div className="badge" style={{ background: badgeColor, color: '#0f172a' }}>
            {badgeLabel}
          </div>
        </div>
      </div>
      {isExpanded && (
        <div
          id={`breakdown-${title.replace(/\s+/g, '-').toLowerCase()}`}
          style={{
            maxHeight: isExpanded ? '500px' : '0',
            opacity: isExpanded ? 1 : 0,
            transition: 'max-height 0.3s ease, opacity 0.3s ease',
            overflow: 'hidden'
          }}
        >
          <CategoryBreakdown max={max} score={points} penalties={penalties} />
        </div>
      )}
    </div>
  );
};

const buildSegmentInputRows = (segment) => {
  const rampCount = typeof segment.ramp_count === 'number' ? formatNumber(segment.ramp_count) : null;
  return [
    { label: 'Deck length', value: typeof segment.length_ft === 'number' ? `${formatNumber(segment.length_ft)} ft` : 'Not provided' },
    { label: 'Clear width', value: typeof segment.width_ft === 'number' ? `${formatNumber(segment.width_ft)} ft` : 'Not provided' },
    { label: 'Ramps within segment', value: rampCount ?? formatBoolean(!!segment.ramps_present) },
    { label: 'Major interchange', value: formatBoolean(!!segment.interchange_within_segment) },
    {
      label: 'Vertical profile',
      value: verticalProfileInputLabels[segment.verticalProfile] || formatPlainText(segment.condition),
    },
    { label: 'Ownership / control', value: formatOwnershipLabel(segment.ownership) },
    { label: 'Prior studies', value: formatBoolean(!!segment.priorStudies) },
    {
      label: 'Jurisdiction count',
      value: formatJurisdictionValue(segment.jurisdictionCount),
    },
  ];
};

const buildScoringInputGroups = (inputs) => {
  const lengthValue = typeof inputs.length_ft === 'number' ? `${formatNumber(inputs.length_ft)} ft` : 'Not provided';
  const widthValue = typeof inputs.width_ft === 'number' ? `${formatNumber(inputs.width_ft)} ft` : 'Not provided';
  const rampCountValue = typeof inputs.ramp_count === 'number' ? formatNumber(inputs.ramp_count) : 'Not provided';

  return [
    {
      title: 'Structural & Civil — Inputs',
      rows: [
        { label: 'Vertical profile', value: lookupLabel(verticalProfileInputLabels, inputs.verticalProfile) },
        { label: 'Trench compatibility', value: lookupLabel(trenchCompatibilityLabels, inputs.trenchCompatibility) },
        { label: 'Geotechnical risk', value: lookupLabel(geotechRiskLabels, inputs.geotechRisk) },
        { label: 'Structural interfaces within segment', value: lookupLabel(structureInterfacesLabels, inputs.structureInterfaces) },
      ],
    },
    {
      title: 'Cost Feasibility — Inputs',
      rows: [
        { label: 'Deck length', value: lengthValue !== 'Not provided' ? `${lengthValue}` : 'Not provided' },
        { label: 'Clear width', value: widthValue !== 'Not provided' ? `${widthValue}` : 'Not provided' },
        { label: 'Ramps within segment', value: rampCountValue },
        { label: 'Major freeway-to-freeway interchange present', value: formatBoolean(inputs.interchange_within_segment) },
      ],
    },
    {
      title: 'Schedule Feasibility — Inputs',
      rows: [
        { label: 'Traffic operations constraint', value: lookupLabel(trafficOpsLabels, inputs.scheduleTrafficOps) },
        { label: 'Construction staging', value: lookupLabel(stagingLabels, inputs.scheduleStaging) },
        { label: 'Work windows', value: lookupLabel(workWindowLabels, inputs.scheduleWorkWindows) },
        { label: 'Subsurface uncertainty', value: lookupLabel(subsurfaceLabels, inputs.scheduleSubsurface) },
      ],
    },
    {
      title: 'Urban Benefit — Inputs',
      rows: [
        { label: 'Urban context intensity', value: lookupLabel(urbanContextLabels, inputs.urbanContext) },
        { label: 'Connectivity restoration', value: lookupLabel(urbanConnectivityLabels, inputs.urbanConnectivity) },
        { label: 'Public realm opportunity', value: lookupLabel(urbanPublicSpaceLabels, inputs.urbanPublicSpace) },
        { label: 'Destination adjacency', value: lookupLabel(urbanDestinationsLabels, inputs.urbanDestinations) },
      ],
    },
    {
      title: 'Political / Process — Inputs',
      rows: [
        { label: 'Ownership / control', value: formatOwnershipLabel(inputs.ownership) },
        { label: 'Prior studies', value: formatBoolean(inputs.priorStudies) },
        { label: 'Jurisdiction count', value: formatJurisdictionValue(inputs.jurisdictionCount) },
      ],
    },
  ];
};

const InputGroup = ({ title, rows }) => (
  <div className="category-breakdown scoring-panel-section">
    <h4>{title}</h4>
    <div className="key-value-grid">
      {rows.map((row) => (
        <div key={row.label} className="kv-pair">
          <span className="kv-label">{row.label}</span>
          <span className="kv-value">{row.value}</span>
        </div>
      ))}
    </div>
  </div>
);

const InputsUsedForScoring = ({ inputs, panelId = 'inputs-used-panel', style }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const groups = buildScoringInputGroups(inputs);

  return (
    <div className="card scoring-details-card" style={style}>
      <div className="score-row">
        <div>
          <div style={{ fontWeight: 800 }}>Inputs used for scoring</div>
        </div>
        <button
          onClick={() => setIsExpanded((prev) => !prev)}
          aria-expanded={isExpanded}
          aria-controls={panelId}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}
        >
          {isExpanded ? '▲' : '▼'}
        </button>
      </div>
      <div
        id={panelId}
        style={{
          maxHeight: isExpanded ? '1000px' : '0',
          opacity: isExpanded ? 1 : 0,
          transition: 'max-height 0.3s ease, opacity 0.3s ease',
          overflow: 'hidden',
        }}
      >
        {groups.map((group) => (
          <InputGroup key={group.title} title={group.title} rows={group.rows} />
        ))}
      </div>
    </div>
  );
};

const ScoringDetailsPanel = ({ segment, panelId = 'scoring-details-panel', embedded = false, style }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const segmentInputs = buildSegmentInputRows(segment);
  return (
    <div className={`card scoring-details-card${embedded ? ' scoring-details-card--embedded' : ''}`} style={style}>
      <div className="score-row">
        <div>
          <div style={{ fontWeight: 800 }}>General Segment Information</div>
        </div>
        <button
          onClick={() => setIsExpanded((prev) => !prev)}
          aria-expanded={isExpanded}
          aria-controls={panelId}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}
        >
          {isExpanded ? '▲' : '▼'}
        </button>
      </div>
      <div
        id={panelId}
        style={{
          maxHeight: isExpanded ? '800px' : '0',
          opacity: isExpanded ? 1 : 0,
          transition: 'max-height 0.3s ease, opacity 0.3s ease',
          overflow: 'hidden',
        }}
      >
        <div className="category-breakdown scoring-panel-section">
          <h4>Baseline segment data</h4>
          <div className="key-value-grid">
            {segmentInputs.map((row) => (
              <div key={row.label} className="kv-pair">
                <span className="kv-label">{row.label}</span>
                <span className="kv-value">{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const ScoringMethodologyPanel = ({ onClose }) => (
  <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Scoring methodology">
    <div className="modal-panel">
      <div className="modal-header">
        <div>
          <div className="modal-title">Scoring methodology</div>
          <div className="muted" style={{ marginTop: 4 }}>
            Static ruleset used for every segment. Categories start at their maximum points and lose points per the
            deductions below. Weighted total: Structural 25%, Cost 25%, Schedule 20%, Urban 20%, Political/Process 10%.
          </div>
        </div>
        <button className="button secondary" onClick={onClose} style={{ padding: '8px 12px' }}>
          Close
        </button>
      </div>
      <div className="methodology-body">
        {scoringMethodology.map((category) => (
          <div key={category.key} className="methodology-block">
            <div className="methodology-heading">{category.title}</div>
            <div className="muted" style={{ marginBottom: 8 }}>{category.summary}</div>
            <ul className="methodology-list">
              {category.rules.map((rule, idx) => (
                <li key={`${category.key}-${idx}`}>{rule}</li>
              ))}
            </ul>
          </div>
        ))}
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

  const feasibility = calculateFeasibilityScores(segment);
  const scoringInputs = buildScoringInputs(segment);
  
  // Runtime assertion: ensure all categories exist with required shape
  const requiredCategories = ['structural', 'cost', 'schedule', 'urban', 'politicalProcess'];
  for (const cat of requiredCategories) {
    if (!feasibility[cat] || typeof feasibility[cat].score !== 'number' || !Array.isArray(feasibility[cat].penalties)) {
      throw new Error(`Invalid feasibility result: missing or malformed ${cat} category`);
    }
  }
  
  const points = {
    structural: feasibility.structural.score,
    cost: feasibility.cost.score,
    schedule: feasibility.schedule.score,
    urban: feasibility.urban.score,
    politicalProcess: feasibility.politicalProcess.score,
    total: feasibility.total,
  };
  const quantities = materialQuantities(segment, defaultConfig);
  const cost = costEstimates(segment, quantities, defaultConfig);
  const drivers = buildDrivers(segment, feasibility);
  const [expanded, setExpanded] = useState(new Set());
  const [isMethodologyOpen, setIsMethodologyOpen] = useState(false);

  const toggleExpanded = (category) => {
    const newExpanded = new Set(expanded);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpanded(newExpanded);
  };

  const explanations = {
    structural: 'Can a cap be physically built here using conventional construction methods?',
    cost: 'How complex and expensive this cap would be compared to other segments.',
    schedule: 'How difficult it would be to build the cap without major construction delays.',
    urban: 'How much the cap would reconnect neighborhoods and create usable urban space.',
    political: 'How straightforward the approvals and agency coordination would be.',
  };

  const geometryNarrative = `Segment geometry: clear width ${segment.width_ft} ft over deck length ${segment.length_ft} ft of corridor.`;

  const overallNarrative =
    segment.condition === 'partial_tunnel'
      ? `${geometryNarrative} Partial tunnel conditions add ventilation and life-safety allowances; staging complexity scales with width and any interchange touches.`
      : `${geometryNarrative} Open trench conditions keep the concept in the screening range; remaining risk centers on width-driven staging and traffic impacts.`;

  return (
    <Layout>
      <div className="card" style={{ borderTop: `8px solid ${mapTotalPointsToColor(points.total)}` }}>
        <div className="score-row">
          <div>
            <div className="badge">Overall feasibility</div>
            <h2 style={{ margin: '6px 0 4px' }}>{mapTotalPointsToPresentationLabel(points.total)}</h2>
            <p style={{ margin: 0, color: '#334155' }}>
              Weighted view across structural (25%), cost (25%), schedule (20%), urban (20%), and political/process (10%).
            </p>
            <p style={{ margin: '6px 0 0', color: '#0f172a', fontWeight: 600 }}>{overallNarrative}</p>
            <div style={{ marginTop: 8, fontWeight: 800, fontSize: 18 }}>Total: {points.total}/100</div>
          </div>
          <div className="score-bar" style={{ width: 260 }}>
            <div className="score-indicator" style={{ left: `${points.total}%` }} />
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
          <div className="section-title" style={{ margin: 0 }}>Points breakdown</div>
          <button
            className="button secondary"
            style={{ padding: '10px 14px' }}
            onClick={() => setIsMethodologyOpen(true)}
          >
            Scoring methodology
          </button>
        </div>
        <ul>
          <li>Structural: {points.structural}/25</li>
          <li>Cost: {points.cost}/25</li>
          <li>Schedule: {points.schedule}/20</li>
          <li>Urban: {points.urban}/20</li>
          <li>Political/Process: {points.politicalProcess}/10</li>
        </ul>
      </div>

      <ScoringDetailsPanel
        segment={segment}
        panelId={`results-${segment.id}-scoring`}
        style={{ marginTop: 12 }}
      />

      <div className="grid" style={{ marginTop: 14 }}>
        <PillarCard
          title="Structural & Civil"
          points={points.structural}
          max={feasibility.structural.max}
          explanation={explanations.structural}
          drivers={drivers.structural}
          isExpanded={expanded.has('structural')}
          onToggle={() => toggleExpanded('structural')}
          penalties={feasibility.structural.penalties}
        />
        <PillarCard
          title="Cost feasibility"
          points={points.cost}
          max={feasibility.cost.max}
          explanation={explanations.cost}
          drivers={drivers.cost}
          isExpanded={expanded.has('cost')}
          onToggle={() => toggleExpanded('cost')}
          penalties={feasibility.cost.penalties}
        />
        <PillarCard
          title="Schedule"
          points={points.schedule}
          max={feasibility.schedule.max}
          explanation={explanations.schedule}
          drivers={drivers.schedule}
          isExpanded={expanded.has('schedule')}
          onToggle={() => toggleExpanded('schedule')}
          penalties={feasibility.schedule.penalties}
        />
        <PillarCard
          title="Urban benefit"
          points={points.urban}
          max={feasibility.urban.max}
          explanation={explanations.urban}
          drivers={drivers.urban}
          isExpanded={expanded.has('urban')}
          onToggle={() => toggleExpanded('urban')}
          penalties={feasibility.urban.penalties}
        />
        <PillarCard
          title="Political/Process"
          points={points.politicalProcess}
          max={feasibility.politicalProcess.max}
          explanation={explanations.political}
          drivers={drivers.political}
          isExpanded={expanded.has('political')}
          onToggle={() => toggleExpanded('political')}
          penalties={feasibility.politicalProcess.penalties}
        />
      </div>

      <InputsUsedForScoring
        inputs={scoringInputs}
        panelId={`inputs-${segment.id}`}
        style={{ marginTop: 12 }}
      />

      <CostCard cost={cost} />

      {isMethodologyOpen && <ScoringMethodologyPanel onClose={() => setIsMethodologyOpen(false)} />}
    </Layout>
  );
};

const App = () => (
  <ErrorBoundary>
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/segments" element={<SegmentLibrary />} />
      <Route path="/segments/:id" element={<SegmentDetail />} />
      <Route path="/segments/:id/results" element={<Results />} />
    </Routes>
  </ErrorBoundary>
);

export default App;
