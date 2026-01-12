-- Migration: Create segments table for city freeway segments
-- Source: OpenStreetMap motorway features

CREATE TABLE IF NOT EXISTS segments (
    segment_id UUID PRIMARY KEY,
    city_id UUID REFERENCES cities(city_id),
    route_label TEXT,
    geometry GEOMETRY(LINESTRING, 4326) NOT NULL,
    length_ft FLOAT NOT NULL,
    source_name TEXT NOT NULL DEFAULT 'OpenStreetMap',
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_segments_city_id ON segments(city_id);
CREATE INDEX IF NOT EXISTS idx_segments_geom ON segments USING GIST(geometry);
