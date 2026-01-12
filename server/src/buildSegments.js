// Build freeway segments for a city using OpenStreetMap
// Only motorway and motorway_link features are used
// Segments are ~2,000 ft each, clipped to city analysis area
// No eligibility, scoring, or below-grade logic


import { pool } from './db.js';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { scoringInputs } from './segmentInputs.js';

const SEGMENT_LENGTH_FT = 2000;
const OSM_OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

async function buildSegmentsForCity(city_id) {
  // 1. Load city analysis area
  const cityRes = await pool.query('SELECT analysis_area_geom, segment_library_status FROM cities WHERE city_id = $1', [city_id]);
  if (cityRes.rows.length === 0) throw new Error('City not found');
  const city = cityRes.rows[0];
  if (city.segment_library_status === 'BUILDING') return 'BUILDING';
  if (city.segment_library_status === 'READY') return 'READY';
  if (city.segment_library_status === 'ERROR') return 'ERROR';

  // 2. Set status to BUILDING
  await pool.query('UPDATE cities SET segment_library_status = $1 WHERE city_id = $2', ['BUILDING', city_id]);

  // 3. Query OSM for motorway features in analysis area
  const wkt = (await pool.query('SELECT ST_AsText($1::geometry)', [city.analysis_area_geom])).rows[0].st_astext;
  const overpassQuery = `
    [out:json][timeout:60];
    (
      way["highway"~"motorway|motorway_link"](poly:"${wkt}");
    );
    out geom tags;
  `;
  let osmRes;
  try {
    osmRes = await axios.post(OSM_OVERPASS_URL, overpassQuery, { headers: { 'Content-Type': 'text/plain' } });
  } catch (err) {
    await pool.query('UPDATE cities SET segment_library_status = $1 WHERE city_id = $2', ['ERROR', city_id]);
    throw new Error('OSM fetch failed');
  }
  const ways = osmRes.data.elements.filter(e => e.type === 'way');

  // 4. For each way, clip to analysis area and segmentize
  for (const way of ways) {
    const coords = way.geometry.map(pt => [pt.lon, pt.lat]);
    // TODO: Clip to analysis_area_geom (skipped for minimal demo)
    // 5. Segmentize into ~2,000 ft chunks
    let start = 0;
    while (start < coords.length - 1) {
      let end = start + 1;
      let length = 0;
      while (end < coords.length) {
        // Compute length in feet
        const prev = coords[end - 1];
        const curr = coords[end];
        const dx = curr[0] - prev[0];
        const dy = curr[1] - prev[1];
        length += Math.sqrt(dx * dx + dy * dy) * 364000; // crude degree-to-ft
        if (length >= SEGMENT_LENGTH_FT) break;
        end++;
      }
      const segmentCoords = coords.slice(start, end + 1);
      if (segmentCoords.length < 2) break;
      const linestring = {
        type: 'LineString',
        coordinates: segmentCoords
      };
      const segment_id = uuidv4();
      await pool.query(
        `INSERT INTO segments (segment_id, city_id, route_label, geometry, length_ft, source_name)
         VALUES ($1, $2, $3, ST_SetSRID(ST_GeomFromGeoJSON($4), 4326), $5, 'OpenStreetMap')`,
        [segment_id, city_id, way.tags.ref || way.tags.name || null, JSON.stringify(linestring), length]
      );
      // Initialize scoring inputs for this segment
      for (const input of scoringInputs) {
        await pool.query(
          `INSERT INTO segment_inputs (input_id, segment_id, category, input_key, input_value, confidence, source)
           VALUES ($1, $2, $3, $4, 'UNKNOWN', 'UNKNOWN', 'SYSTEM')
           ON CONFLICT (segment_id, input_key) DO NOTHING`,
          [uuidv4(), segment_id, input.category, input.input_key]
        );
      }
      start = end;
    }
  }

  // 6. Set status to READY
  await pool.query('UPDATE cities SET segment_library_status = $1 WHERE city_id = $2', ['READY', city_id]);
  return 'READY';
}

export default buildSegmentsForCity;
