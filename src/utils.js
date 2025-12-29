export const feasibilityColors = ['#22c55e', '#a3e635', '#facc15', '#f97316', '#ef4444'];

export const gradeLabels = ['Most feasible', 'Favorable', 'Moderate', 'Challenged', 'Least feasible'];

const clampScore = (value) => Math.min(5, Math.max(1, value));

export const structuralSystem = (width) => {
  if (width <= 120) return 'Concrete slab / post-tensioned deck concept';
  if (width <= 200) return 'Precast or steel girder system with concrete deck';
  return 'Mega-span / segmental box / truss concept (high complexity)';
};

export const structuralFeasibility = (segment) => {
  let score = 5;
  if (segment.width_ft > 200) score -= 2;
  else if (segment.width_ft > 120) score -= 1;
  if (segment.condition === 'partial_tunnel') score -= 2;
  if (segment.interchange_within_segment) score -= 2;
  if (segment.ramps_present) score -= 1;
  return clampScore(score);
};

export const urbanBenefit = (segment) => {
  const { adjacent_density: density, grid_reconnection_value: grid } = segment;
  if (density === 'high' && grid === 'high') return 5;
  if ((density === 'high' && grid === 'medium') || (density === 'medium' && grid === 'high')) return 4;
  if (density === 'medium' && grid === 'medium') return 3;
  if ((density === 'low' && grid === 'medium') || (density === 'medium' && grid === 'low')) return 2;
  return 1;
};

export const politicalScore = (segment) => {
  let score = 3;
  if (segment.prior_studies) score += 1;
  if (segment.ownership === 'mixed') score -= 1;
  if (segment.funding_alignment === 'high') score += 1;
  if (segment.funding_alignment === 'low') score -= 1;
  return clampScore(score);
};

export const costScore = (segment) => {
  let score = 5;
  if (segment.condition === 'partial_tunnel') score -= 2;
  if (segment.width_ft > 200) score -= 2;
  else if (segment.width_ft > 120) score -= 1;
  if (segment.interchange_within_segment) score -= 2;
  if (segment.ramps_present) score -= 1;
  if (segment.length_ft > 1500) score -= 1;
  return clampScore(score);
};

export const scheduleScore = (segment) => {
  let score = 4;
  if (segment.ownership === 'mixed') score -= 1;
  if (!segment.prior_studies) score -= 1;
  if (segment.interchange_within_segment) score -= 2;
  if (segment.condition === 'partial_tunnel') score -= 1;
  if (segment.length_ft > 1500) score -= 1;
  return clampScore(score);
};

export const weightedOverall = (scores) => {
  const weighted =
    scores.structural * 0.25 +
    scores.cost * 0.25 +
    scores.schedule * 0.2 +
    scores.urban * 0.2 +
    scores.political * 0.1;
  return Math.round(weighted);
};

export const mapScoreToLabel = (score) => gradeLabels[score - 1] || 'Unknown';

export const scoreToPercentage = (score) => ((score - 1) / 4) * 100;

export const materialQuantities = (segment, config) => {
  const area = segment.width_ft * segment.length_ft;
  const slabThickness = config.slab_thickness_ft;
  const girderSpacing = config.girder_spacing_ft;
  const deckThickness = config.deck_thickness_ft;
  const assumedSpan = config.assumed_span_ft;
  const tonPerGirderFt = config.ton_per_girder_ft;

  const slabConcreteVolume = area * slabThickness;
  const rebarWeight = slabConcreteVolume * config.rebar_factor;
  const waterproofingArea = area;

  const numGirders = Math.ceil(segment.width_ft / girderSpacing);
  const deckConcreteVolume = area * deckThickness;
  const girderTonnage = numGirders * tonPerGirderFt * segment.length_ft;

  const numBents = Math.ceil(segment.length_ft / assumedSpan);
  const supports = numBents * 2;

  return {
    area,
    slabConcreteVolume,
    rebarWeight,
    waterproofingArea,
    numGirders,
    deckConcreteVolume,
    girderTonnage,
    numBents,
    supports,
  };
};

export const costEstimates = (segment, quantities, config) => {
  const concreteCost = quantities.slabConcreteVolume * config.unit_costs.concrete;
  const rebarCost = quantities.rebarWeight * config.unit_costs.rebar;
  const waterproofingCost = quantities.waterproofingArea * config.unit_costs.waterproofing;
  const girderCost = quantities.girderTonnage * config.unit_costs.girder_steel;
  const foundationCost = quantities.numBents * config.unit_costs.foundation_bent;

  const baseCost = concreteCost + rebarCost + waterproofingCost + girderCost + foundationCost;
  const utilities = baseCost * config.allowances.utilities_pct;
  const staging = baseCost * config.allowances.traffic_staging_pct;
  const tunnelSystems = segment.condition === 'partial_tunnel' ? baseCost * config.allowances.tunnel_systems_pct : 0;

  const low = baseCost + utilities + staging + tunnelSystems;
  const high = low * 1.2;

  const driverEntries = [
    { label: 'Structural concrete and deck', value: concreteCost + rebarCost },
    { label: 'Steel girders and frames', value: girderCost },
    { label: 'Traffic staging and utilities', value: utilities + staging },
    { label: 'Ventilation / fire-life safety (if tunnel)', value: tunnelSystems },
  ].sort((a, b) => b.value - a.value);

  const drivers = driverEntries.slice(0, 3).map((d) => d.label);

  return { low, high, drivers };
};

export const buildApproach = (segment) => {
  const system = structuralSystem(segment.width_ft);
  const steps = [];

  steps.push('Maintain traffic in trench while building foundations from the edges.');
  steps.push('Construct transverse bents or walls at assumed span spacing to receive the deck.');

  if (system.startsWith('Precast') || system.includes('girder')) {
    steps.push('Set steel or precast girders at roughly 10 ft spacing, then place a cast-in-place deck.');
  } else if (system.includes('slab')) {
    steps.push('Form and pour a thick concrete slab or post-tensioned deck spanning the corridor.');
  } else {
    steps.push('Install long-span steel trusses or segmental concrete boxes to clear the full width.');
  }

  if (segment.condition === 'partial_tunnel') {
    steps.push('Include ventilation shafts, jet fans, fire-life safety zones, and egress systems.');
  }

  steps.push('Waterproof, backfill, and build the surface public realm with drainage and utilities.');

  return { system, steps };
};
