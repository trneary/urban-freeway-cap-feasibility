-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;
-- Test geometry type
SELECT ST_GeomFromText('POINT(-71.060316 48.432044)', 4326);
