-- Migration: Create cities table for Top 100 U.S. Cities
-- Source: U.S. Census Bureau, 2020 Population Estimates
-- See: https://www.census.gov/data/tables/2020/demo/popest/2020-cities-total.html

CREATE TABLE IF NOT EXISTS cities (
    city_id UUID PRIMARY KEY,
    city_name TEXT NOT NULL,
    state_abbr TEXT NOT NULL,
    display_name TEXT NOT NULL,
    rank_top INT NOT NULL,
    population INT NOT NULL,
    population_year INT NOT NULL,
    source_name TEXT NOT NULL,
    source_url TEXT NOT NULL,
    ingested_at TIMESTAMP NOT NULL DEFAULT NOW(),
    city_boundary_geom GEOMETRY(POLYGON, 4326) NOT NULL,
    analysis_area_geom GEOMETRY(POLYGON, 4326) NOT NULL,
    segment_library_status TEXT NOT NULL DEFAULT 'NOT_BUILT',
    last_built_at TIMESTAMP NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Index for search
CREATE INDEX IF NOT EXISTS idx_cities_name ON cities (city_name);
CREATE INDEX IF NOT EXISTS idx_cities_display_name ON cities (display_name);
