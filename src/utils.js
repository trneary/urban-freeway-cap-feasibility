export const feasibilityColors = ['#22c55e', '#a3e635', '#facc15', '#f97316', '#ef4444'];

export const gradeLabels = ['Most feasible', 'Favorable', 'Moderate', 'Challenged', 'Least feasible'];

const clampScore = (value) => Math.min(5, Math.max(1, value));

export const systemTypeFromWidth = (width) => {
  if (width <= 120) return 'slab';
  if (width <= 200) return 'girder';
  return 'mega';
};

export const structuralSystem = (width) => {
  const systemType = systemTypeFromWidth(width);
  if (systemType === 'slab') return 'Concrete slab / post-tensioned deck concept';
  if (systemType === 'girder') return 'Precast or steel girder system with concrete deck';
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
  const systemType = systemTypeFromWidth(segment.width_ft);
  const usesGirders = systemType !== 'slab';
  const area = segment.width_ft * segment.length_ft;
  const slabThickness = config.slab_thickness_ft;
  const girderSpacing = config.girder_spacing_ft;
  const deckThickness = config.deck_thickness_ft;
  const assumedSpan = config.assumed_span_ft;
  const tonPerGirderFt = config.ton_per_girder_ft;

  const slabConcreteVolume = systemType === 'slab' ? area * slabThickness : 0;
  const deckConcreteVolume = usesGirders ? area * deckThickness : 0;
  const structuralConcreteVolume = systemType === 'slab' ? slabConcreteVolume : deckConcreteVolume;
  const rebarWeight = structuralConcreteVolume * config.rebar_factor;
  const waterproofingArea = area;

  const numGirders = usesGirders ? Math.ceil(segment.width_ft / girderSpacing) : 0;
  const girderTonnage =
    usesGirders ? numGirders * tonPerGirderFt * segment.length_ft * (systemType === 'mega' ? 1.25 : 1) : 0;

  const numBents = Math.ceil(segment.length_ft / assumedSpan);
  const supports = numBents * 2;

  return {
    systemType,
    area,
    structuralConcreteVolume,
    slabConcreteVolume,
    rebarWeight,
    waterproofingArea,
    numGirders,
    deckConcreteVolume,
    girderTonnage,
    numBents,
    supports,
    concreteDescriptor:
      systemType === 'slab'
        ? `${slabThickness} ft slab thickness assumption`
        : `${deckThickness} ft deck thickness over girders`,
    girderSpacing,
    assumedSpan,
  };
};

export const costEstimates = (segment, quantities, config) => {
  const concreteCost = quantities.structuralConcreteVolume * config.unit_costs.concrete;
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
    { label: 'Structural concrete and reinforcing', value: concreteCost + rebarCost },
    { label: 'Steel girders and frames', value: girderCost },
    { label: 'Foundations and supports', value: foundationCost },
    { label: 'Traffic staging and utilities', value: utilities + staging },
    { label: 'Ventilation / fire-life safety (if tunnel)', value: tunnelSystems },
  ]
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value);

  const drivers = driverEntries.slice(0, 3).map((d) => d.label);

  return { low, high, drivers };
};

export const buildApproach = (segment) => {
  const systemType = systemTypeFromWidth(segment.width_ft);
  const system = structuralSystem(segment.width_ft);
  const steps = [];

  steps.push('Maintain traffic in trench while building foundations from the edges.');
  steps.push('Construct transverse bents or walls at assumed span spacing to receive the deck.');

  if (systemType === 'girder') {
    steps.push('Set steel or precast girders at roughly 10 ft spacing, then place a cast-in-place deck.');
  } else if (systemType === 'slab') {
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

export const mapScoreToColor = (score) => {
  const s = clampScore(score);
  if (s === 5) return '#22c55e';
  if (s === 3 || s === 4) return '#facc15';
  return '#ef4444';
};

const normalizeCategoryResult = (result, maxPoints) => {
  if (!result || typeof result !== 'object') {
    return { score: 0, max: maxPoints, penalties: [], summary: '' };
  }
  const score = typeof result.score === 'number' ? Math.max(0, Math.min(maxPoints, result.score)) : 0;
  const penalties = Array.isArray(result.penalties) ? result.penalties : [];
  const summary = typeof result.summary === 'string' ? result.summary : '';
  return { score, max: maxPoints, penalties, summary };
};

export const computePoliticalProcess = (inputs) => {
  const { ownership = 'mixed', priorStudies = false, jurisdictionCount = 2 } = inputs;
  let score = 10;
  const penalties = [];

  if (ownership === 'state') {
    penalties.push({ key: 'ownership', points: 2, reason: 'State ownership requires additional coordination' });
    score -= 2;
  } else if (ownership === 'mixed') {
    penalties.push({ key: 'ownership', points: 4, reason: 'Mixed ownership complicates decision making' });
    score -= 4;
  }

  if (!priorStudies) {
    penalties.push({ key: 'priorStudies', points: 3, reason: 'No prior studies or planning work' });
    score -= 3;
  }

  if (jurisdictionCount === 2) {
    penalties.push({ key: 'jurisdictions', points: 2, reason: '2 jurisdictions require inter-agency coordination' });
    score -= 2;
  } else if (jurisdictionCount >= 3) {
    penalties.push({ key: 'jurisdictions', points: 3, reason: `${jurisdictionCount} jurisdictions increase coordination complexity` });
    score -= 3;
  }

  score = Math.max(0, Math.min(10, score));

  const summary = penalties.length > 0
    ? `Penalties: ${penalties.map(p => `${p.key} (-${p.points})`).join(', ')}`
    : 'No penalties';

  return { score, max: 10, penalties, summary };
};

export const buildScoringInputs = (segment) => {
  return {
    ...segment,
    ownership: segment.ownership || 'mixed',
    priorStudies: segment.priorStudies !== undefined ? segment.priorStudies : false,
    jurisdictionCount: typeof segment.jurisdictionCount === 'number' ? segment.jurisdictionCount : 2,
    width_ft: typeof segment.width_ft === 'number' ? segment.width_ft : 0,
    length_ft: typeof segment.length_ft === 'number' ? segment.length_ft : 0,
    condition: segment.condition || 'trench',
    ramps_present: !!segment.ramps_present,
    interchange_within_segment: !!segment.interchange_within_segment,
    adjacent_density: segment.adjacent_density || 'low',
    grid_reconnection_value: segment.grid_reconnection_value || 'low',
    ramp_count: typeof segment.ramp_count === 'number' ? segment.ramp_count : 0,
    scheduleTrafficOps: segment.scheduleTrafficOps || 'moderate',
    scheduleStaging: segment.scheduleStaging || 'multi_phase',
    scheduleWorkWindows: segment.scheduleWorkWindows || 'restricted',
    scheduleSubsurface: segment.scheduleSubsurface || 'moderate_uncertainty',
    urbanContext: segment.urbanContext || 'moderate',
    urbanConnectivity: segment.urbanConnectivity || 'partial',
    urbanPublicSpace: segment.urbanPublicSpace || 'moderate',
    urbanDestinations: segment.urbanDestinations || 'one',
    verticalProfile: segment.verticalProfile || 'belowGradeTrench',
    trenchCompatibility: segment.trenchCompatibility || 'deckReady',
    geotechRisk: segment.geotechRisk || 'moderate',
    structureInterfaces: segment.structureInterfaces || 'none',
  };
};

export const calculateFeasibilityScores = (segment) => {
  const safeSegment = buildScoringInputs(segment);

  let structural = 25;
  const structuralPenalties = [];

  if (safeSegment.verticalProfile === 'partiallyBelowGrade') {
    structuralPenalties.push({ key: 'verticalProfile', label: 'Vertical profile', points: -5, description: 'Partially below grade profile requires additional structural considerations' });
    structural -= 5;
  } else if (safeSegment.verticalProfile === 'atGrade') {
    structuralPenalties.push({ key: 'verticalProfile', label: 'Vertical profile', points: -8, description: 'At grade profile complicates deck installation and support' });
    structural -= 8;
  } else if (safeSegment.verticalProfile === 'elevatedOrViaduct') {
    structuralPenalties.push({ key: 'verticalProfile', label: 'Vertical profile', points: -10, description: 'Elevated or viaduct profile poses significant structural challenges' });
    structural -= 10;
  }

  if (safeSegment.trenchCompatibility === 'possibleWithMajorRebuild') {
    structuralPenalties.push({ key: 'trenchCompatibility', label: 'Trench compatibility', points: -4, description: 'Retaining walls or right-of-way may require major rebuild for deck support' });
    structural -= 4;
  } else if (safeSegment.trenchCompatibility === 'notCompatibleOrUnknown') {
    structuralPenalties.push({ key: 'trenchCompatibility', label: 'Trench compatibility', points: -7, description: 'Retaining walls, right-of-way fit, or deck support uncertainty' });
    structural -= 7;
  }

  if (safeSegment.geotechRisk === 'moderate') {
    structuralPenalties.push({ key: 'geotechRisk', label: 'Geotechnical risk', points: -2, description: 'Moderate geotechnical risk with potential settlement sensitivity' });
    structural -= 2;
  } else if (safeSegment.geotechRisk === 'highOrUnknown') {
    structuralPenalties.push({ key: 'geotechRisk', label: 'Geotechnical risk', points: -5, description: 'Unknown soils, high groundwater, or settlement sensitivity' });
    structural -= 5;
  }

  if (safeSegment.structureInterfaces === 'some') {
    structuralPenalties.push({ key: 'structureInterfaces', label: 'Structural interfaces', points: -1, description: 'Some complex interfaces with ramps/bridges that complicate span placement' });
    structural -= 1;
  } else if (safeSegment.structureInterfaces === 'major') {
    structuralPenalties.push({ key: 'structureInterfaces', label: 'Structural interfaces', points: -3, description: 'Major complex interfaces with ramps/bridges/irregular geometry complicating staged foundations' });
    structural -= 3;
  }

  structural = Math.max(0, Math.min(25, structural));

  let cost = 25;
  const costPenalties = {};

  let widthPenalty = 0;
  if (safeSegment.width_ft > 300) widthPenalty = 6;
  else if (safeSegment.width_ft > 240) widthPenalty = 4;
  else if (safeSegment.width_ft > 200) widthPenalty = 2;
  if (widthPenalty > 0) costPenalties.width = widthPenalty;
  cost -= widthPenalty;

  let lengthPenalty = 0;
  if (safeSegment.length_ft > 4000) lengthPenalty = 6;
  else if (safeSegment.length_ft > 3000) lengthPenalty = 4;
  else if (safeSegment.length_ft > 2000) lengthPenalty = 2;
  if (lengthPenalty > 0) costPenalties.length = lengthPenalty;
  cost -= lengthPenalty;

  const rampCount = safeSegment.ramp_count !== undefined ? safeSegment.ramp_count : 0;
  const rampPenalty = Math.min(rampCount * 2, 8);
  if (rampPenalty > 0) costPenalties.ramps = rampPenalty;
  cost -= rampPenalty;

  const interchangePenalty = safeSegment.interchange_within_segment ? 8 : 0;
  if (interchangePenalty > 0) costPenalties.interchange = interchangePenalty;
  cost -= interchangePenalty;

  cost = Math.max(0, Math.min(25, cost));

  let schedule = 20;
  const schedulePenalties = [];

  if (safeSegment.scheduleTrafficOps === 'moderate') {
    schedulePenalties.push({ key: 'trafficOps', label: 'Traffic operations', points: -4, description: 'Moderate impact with limited detours and peak restrictions' });
    schedule -= 4;
  } else if (safeSegment.scheduleTrafficOps === 'severe') {
    schedulePenalties.push({ key: 'trafficOps', label: 'Traffic operations', points: -8, description: 'Severe impact requiring lanes to remain open most times' });
    schedule -= 8;
  }

  if (safeSegment.scheduleStaging === 'multi_phase') {
    schedulePenalties.push({ key: 'staging', label: 'Construction staging', points: -3, description: 'Multi-phase dependencies' });
    schedule -= 3;
  } else if (safeSegment.scheduleStaging === 'brittle') {
    schedulePenalties.push({ key: 'staging', label: 'Construction staging', points: -6, description: 'Highly interdependent phases' });
    schedule -= 6;
  }

  if (safeSegment.scheduleWorkWindows === 'restricted') {
    schedulePenalties.push({ key: 'workWindows', label: 'Work windows', points: -2, description: 'Restricted to seasonal or time-of-day limits' });
    schedule -= 2;
  } else if (safeSegment.scheduleWorkWindows === 'heavy') {
    schedulePenalties.push({ key: 'workWindows', label: 'Work windows', points: -4, description: 'Heavy restrictions due to schools, hospitals, events, or noise curfews' });
    schedule -= 4;
  }

  if (safeSegment.scheduleSubsurface === 'moderate_uncertainty') {
    schedulePenalties.push({ key: 'subsurface', label: 'Subsurface uncertainty', points: -1, description: 'Moderate uncertainty with some missing data' });
    schedule -= 1;
  } else if (safeSegment.scheduleSubsurface === 'high_uncertainty') {
    schedulePenalties.push({ key: 'subsurface', label: 'Subsurface uncertainty', points: -2, description: 'High uncertainty with missing or unreliable data' });
    schedule -= 2;
  }

  schedule = Math.max(0, Math.min(20, schedule));

  let urban = 20;
  const urbanPenalties = [];

  if (safeSegment.urbanContext === 'moderate') {
    urbanPenalties.push({ key: 'urbanContext', label: 'Urban context intensity', points: -4, description: 'Moderate urban context intensity' });
    urban -= 4;
  } else if (safeSegment.urbanContext === 'low') {
    urbanPenalties.push({ key: 'urbanContext', label: 'Urban context intensity', points: -8, description: 'Low urban context intensity' });
    urban -= 8;
  }

  if (safeSegment.urbanConnectivity === 'partial') {
    urbanPenalties.push({ key: 'urbanConnectivity', label: 'Connectivity restoration', points: -3, description: 'Partial connectivity restoration' });
    urban -= 3;
  } else if (safeSegment.urbanConnectivity === 'minimal') {
    urbanPenalties.push({ key: 'urbanConnectivity', label: 'Connectivity restoration', points: -6, description: 'Minimal connectivity restoration' });
    urban -= 6;
  }

  if (safeSegment.urbanPublicSpace === 'moderate') {
    urbanPenalties.push({ key: 'urbanPublicSpace', label: 'Public realm opportunity', points: -2, description: 'Moderate public realm opportunity' });
    urban -= 2;
  } else if (safeSegment.urbanPublicSpace === 'limited') {
    urbanPenalties.push({ key: 'urbanPublicSpace', label: 'Public realm opportunity', points: -4, description: 'Limited public realm opportunity' });
    urban -= 4;
  }

  if (safeSegment.urbanDestinations === 'one') {
    urbanPenalties.push({ key: 'urbanDestinations', label: 'Destination adjacency', points: -1, description: 'One destination adjacency' });
    urban -= 1;
  } else if (safeSegment.urbanDestinations === 'none') {
    urbanPenalties.push({ key: 'urbanDestinations', label: 'Destination adjacency', points: -2, description: 'No destination adjacency' });
    urban -= 2;
  }

  urban = Math.max(0, Math.min(20, urban));

  const politicalResult = computePoliticalProcess({
    ownership: safeSegment.ownership,
    priorStudies: safeSegment.priorStudies,
    jurisdictionCount: safeSegment.jurisdictionCount,
  });

  const total = structural + cost + schedule + urban + politicalResult.score;

  const rawResult = {
    structural: { score: structural, max: 25, penalties: structuralPenalties },
    cost: {
      score: cost,
      penalties: Object.entries(costPenalties).map(([key, points]) => {
        const description =
          key === 'width'
            ? 'Width increases structural quantities'
            : key === 'length'
            ? 'Length increases deck quantities'
            : key === 'ramps'
            ? `Ramps (${safeSegment.ramp_count}) increase staging costs`
            : key === 'interchange'
            ? 'Major interchange increases complexity'
            : `${key} penalty`;
        return { key, label: key.charAt(0).toUpperCase() + key.slice(1), points: -points, description };
      }),
    },
    schedule: { score: schedule, penalties: schedulePenalties },
    urban: { score: urban, penalties: urbanPenalties },
    politicalProcess: {
      score: politicalResult.score,
      max: 10,
      penalties: politicalResult.penalties.map((p) => ({
        key: p.key,
        label: p.key.charAt(0).toUpperCase() + p.key.slice(1),
        points: -p.points,
        description: p.reason,
      })),
    },
    total,
  };

  const result = {
    structural: normalizeCategoryResult(rawResult.structural, 25),
    cost: normalizeCategoryResult(rawResult.cost, 25),
    schedule: normalizeCategoryResult(rawResult.schedule, 20),
    urban: normalizeCategoryResult(rawResult.urban, 20),
    politicalProcess: normalizeCategoryResult(rawResult.politicalProcess, 10),
    total: rawResult.total,
  };

  const requiredCategories = ['structural', 'cost', 'schedule', 'urban', 'politicalProcess'];
  for (const cat of requiredCategories) {
    if (!result[cat] || typeof result[cat].score !== 'number' || !Array.isArray(result[cat].penalties)) {
      throw new Error(`Category ${cat} has invalid shape: ${JSON.stringify(result[cat])}`);
    }
  }

  return result;
};

export const pillarPoints = (scores) => {
  const structuralPoints = (scores.structural / 5) * 25;
  const costPoints = scores.cost;
  const schedulePoints = (scores.schedule / 5) * 20;
  const urbanPoints = (scores.urban / 5) * 20;
  const politicalPoints = (scores.political / 5) * 10;
  const rounded = {
    structural: Math.round(structuralPoints),
    cost: Math.round(costPoints),
    schedule: Math.round(schedulePoints),
    urban: Math.round(urbanPoints),
    political: Math.round(politicalPoints),
  };
  const total = rounded.structural + rounded.cost + rounded.schedule + rounded.urban + rounded.political;
  return { ...rounded, total };
};

export const mapTotalPointsToPresentationLabel = (totalPoints) => {
  if (totalPoints > 75) return 'Most feasible';
  if (totalPoints > 50) return 'Moderately feasible';
  return 'Not feasible';
};

export const mapPointsToBadgeLabel = (points, max) => {
  const pct = (points / max) * 100;
  if (pct >= 80) return 'Most feasible';
  if (pct >= 50) return 'Moderately feasible';
  return 'Not feasible';
};

export const mapTotalPointsToColor = (totalPoints) => {
  if (totalPoints > 75) return '#22c55e';
  if (totalPoints > 50) return '#facc15';
  return '#ef4444';
};

export const mapPointsToColor = (points, max) => {
  const pct = (points / max) * 100;
  if (pct >= 80) return '#22c55e';
  if (pct >= 50) return '#facc15';
  return '#ef4444';
};

export const mapCostPointsToLabel = (points) => {
  if (points >= 19) return 'Most feasible';
  if (points >= 11) return 'Moderately feasible';
  return 'Not feasible';
};

export const mapCostPointsToColor = (points) => {
  if (points >= 19) return '#22c55e';
  if (points >= 11) return '#facc15';
  return '#ef4444';
};
