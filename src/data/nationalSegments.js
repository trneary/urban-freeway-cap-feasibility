// National candidate cap segments (Phase 1 demo data)
// Each segment must have id, name, city, state, freeway, scoringInputs

const nationalSegments = [
  {
    id: 'chi-i90-westloop',
    name: 'I-90 West Loop',
    city: 'Chicago',
    state: 'IL',
    freeway: 'I-90',
    scoringInputs: {
      structural: {
        verticalProfile: 'belowGradeTrench',
        trenchCompatibility: 'deckReady',
        geotechnicalRisk: 'moderate',
        structuralInterfaces: 'none',
      },
      cost: {
        deckLengthFt: 2200,
        clearWidthFt: 180,
        rampsWithinSegment: 2,
        majorInterchangePresent: true,
      },
      schedule: {
        trafficOpsConstraint: 'moderate',
        constructionStaging: 'multi_phase',
        workWindows: 'restricted',
        subsurfaceUncertainty: 'moderate_uncertainty',
      },
      urban: {
        contextIntensity: 'dense',
        connectivityRestoration: 'major',
        publicRealmOpportunity: 'large',
        destinationAdjacency: 'multiple',
      },
      political: {
        ownershipControl: 'city',
        priorStudies: false,
        jurisdictionCount: 2,
      },
    },
  },
  {
    id: 'bos-i93-central',
    name: 'I-93 Central Artery',
    city: 'Boston',
    state: 'MA',
    freeway: 'I-93',
    scoringInputs: {
      structural: {
        verticalProfile: 'belowGradeTrench',
        trenchCompatibility: 'deckReady',
        geotechnicalRisk: 'moderate',
        structuralInterfaces: 'some',
      },
      cost: {
        deckLengthFt: 3200,
        clearWidthFt: 160,
        rampsWithinSegment: 3,
        majorInterchangePresent: true,
      },
      schedule: {
        trafficOpsConstraint: 'severe',
        constructionStaging: 'brittle',
        workWindows: 'heavy',
        subsurfaceUncertainty: 'high_uncertainty',
      },
      urban: {
        contextIntensity: 'dense',
        connectivityRestoration: 'major',
        publicRealmOpportunity: 'large',
        destinationAdjacency: 'multiple',
      },
      political: {
        ownershipControl: 'state',
        priorStudies: true,
        jurisdictionCount: 3,
      },
    },
  },
  {
    id: 'la-101-dt',
    name: 'US-101 Downtown LA',
    city: 'Los Angeles',
    state: 'CA',
    freeway: 'US-101',
    scoringInputs: {
      structural: {
        verticalProfile: 'partiallyBelowGrade',
        trenchCompatibility: 'possibleWithMajorRebuild',
        geotechnicalRisk: 'highOrUnknown',
        structuralInterfaces: 'major',
      },
      cost: {
        deckLengthFt: 1800,
        clearWidthFt: 220,
        rampsWithinSegment: 4,
        majorInterchangePresent: true,
      },
      schedule: {
        trafficOpsConstraint: 'severe',
        constructionStaging: 'brittle',
        workWindows: 'heavy',
        subsurfaceUncertainty: 'high_uncertainty',
      },
      urban: {
        contextIntensity: 'dense',
        connectivityRestoration: 'partial',
        publicRealmOpportunity: 'moderate',
        destinationAdjacency: 'multiple',
      },
      political: {
        ownershipControl: 'mixed',
        priorStudies: false,
        jurisdictionCount: 3,
      },
    },
  },
  {
    id: 'hou-i45-midtown',
    name: 'I-45 Midtown',
    city: 'Houston',
    state: 'TX',
    freeway: 'I-45',
    scoringInputs: {
      structural: {
        verticalProfile: 'belowGradeTrench',
        trenchCompatibility: 'deckReady',
        geotechnicalRisk: 'low',
        structuralInterfaces: 'none',
      },
      cost: {
        deckLengthFt: 1400,
        clearWidthFt: 160,
        rampsWithinSegment: 1,
        majorInterchangePresent: false,
      },
      schedule: {
        trafficOpsConstraint: 'moderate',
        constructionStaging: 'multi_phase',
        workWindows: 'restricted',
        subsurfaceUncertainty: 'moderate_uncertainty',
      },
      urban: {
        contextIntensity: 'moderate',
        connectivityRestoration: 'partial',
        publicRealmOpportunity: 'moderate',
        destinationAdjacency: 'one',
      },
      political: {
        ownershipControl: 'state',
        priorStudies: true,
        jurisdictionCount: 2,
      },
    },
  },
];

export default nationalSegments;
