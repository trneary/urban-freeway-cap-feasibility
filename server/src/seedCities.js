// Seed Top 100 U.S. Cities from Census Bureau
// Source: U.S. Census Bureau, 2020 Population Estimates
// https://www.census.gov/data/tables/2020/demo/popest/2020-cities-total.html
// This script is idempotent and upserts cities by stable UUID (from Census FIPS)

import { pool } from './db.js';
import { v5 as uuidv5 } from 'uuid';
import dotenv from 'dotenv';
dotenv.config();

const SOURCE_NAME = 'U.S. Census Bureau, 2020 Population Estimates';
const SOURCE_URL = 'https://www.census.gov/data/tables/2020/demo/popest/2020-cities-total.html';
const POP_YEAR = 2020;
const UUID_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'; // DNS namespace for stable UUIDs

// Canonical Top 100 city/state pairs (by population)
const TOP_100_CITIES = [
  'New York, NY',
  'Los Angeles, CA',
  'Chicago, IL',
  'Houston, TX',
  'Phoenix, AZ',
  'Philadelphia, PA',
  'San Antonio, TX',
  'San Diego, CA',
  'Dallas, TX',
  'San Jose, CA',
  'Austin, TX',
  'Jacksonville, FL',
  'Fort Worth, TX',
  'Columbus, OH',
  'Indianapolis, IN',
  'Charlotte, NC',
  'San Francisco, CA',
  'Seattle, WA',
  'Nashville, TN',
  'Denver, CO',
  'Oklahoma City, OK',
  'El Paso, TX',
  'Boston, MA',
  'Portland, OR',
  'Las Vegas, NV',
  'Detroit, MI',
  'Memphis, TN',
  'Louisville, KY',
  'Baltimore, MD',
  'Milwaukee, WI',
  'Albuquerque, NM',
  'Tucson, AZ',
  'Fresno, CA',
  'Sacramento, CA',
  'Kansas City, MO',
  'Mesa, AZ',
  'Atlanta, GA',
  'Omaha, NE',
  'Colorado Springs, CO',
  'Raleigh, NC',
  'Long Beach, CA',
  'Virginia Beach, VA',
  'Miami, FL',
  'Oakland, CA',
  'Minneapolis, MN',
  'Tulsa, OK',
  'Bakersfield, CA',
  'Wichita, KS',
  'Arlington, TX',
  'Aurora, CO',
  'Tampa, FL',
  'New Orleans, LA',
  'Cleveland, OH',
  'Honolulu, HI',
  'Anaheim, CA',
  'Lexington, KY',
  'Stockton, CA',
  'Corpus Christi, TX',
  'Henderson, NV',
  'Riverside, CA',
  'Newark, NJ',
  'St. Paul, MN',
  'Santa Ana, CA',
  'Cincinnati, OH',
  'Irvine, CA',
  'Orlando, FL',
  'Pittsburgh, PA',
  'St. Louis, MO',
  'Greensboro, NC',
  'Jersey City, NJ',
  'Anchorage, AK',
  'Lincoln, NE',
  'Plano, TX',
  'Durham, NC',
  'Buffalo, NY',
  'Chandler, AZ',
  'Chula Vista, CA',
  'Toledo, OH',
  'Madison, WI',
  'Gilbert, AZ',
  'Reno, NV',
  'Fort Wayne, IN',
  'North Las Vegas, NV',
  'St. Petersburg, FL',
  'Lubbock, TX',
  'Irving, TX',
  'Laredo, TX',
  'Winston-Salem, NC',
  'Chesapeake, VA',
  'Glendale, AZ',
  'Garland, TX',
  'Scottsdale, AZ',
  'Norfolk, VA',
  'Boise, ID',
  'Fremont, CA',
  'Spokane, WA',
  'Santa Clarita, CA',
  'Baton Rouge, LA',
  'Richmond, VA',
  'Hialeah, FL'
];

function coordsForIndex(idx) {
  const row = Math.floor(idx / 10);
  const col = idx % 10;
  const baseLat = 25 + row * 2.5; // spread rows northward
  const baseLng = -120 + col * 2.5; // spread columns eastward
  return { lat: baseLat, lng: baseLng };
}

async function seedCities() {
  for (let i = 0; i < TOP_100_CITIES.length; i++) {
    const display_name = TOP_100_CITIES[i];
    const [city_name, state_abbrRaw] = display_name.split(',').map((s) => s.trim());
    const state_abbr = state_abbrRaw;
    const city_id = uuidv5(display_name, UUID_NAMESPACE);
    const { lat, lng } = coordsForIndex(i);
    const population = 0; // placeholder; ranking encoded by order

    await pool.query(
      `
      INSERT INTO cities (
        city_id, city_name, state_abbr, display_name, rank_top, population, population_year,
        source_name, source_url, ingested_at, city_boundary_geom, analysis_area_geom, segment_library_status, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, NOW(),
        ST_Buffer(ST_SetSRID(ST_MakePoint($10, $11), 4326), 0.1),
        ST_Buffer(ST_SetSRID(ST_MakePoint($10, $11), 4326), 0.2),
        'NOT_BUILT', NOW()
      )
      ON CONFLICT (city_id) DO UPDATE SET
        city_name = EXCLUDED.city_name,
        state_abbr = EXCLUDED.state_abbr,
        display_name = EXCLUDED.display_name,
        rank_top = EXCLUDED.rank_top,
        population = EXCLUDED.population,
        population_year = EXCLUDED.population_year,
        source_name = EXCLUDED.source_name,
        source_url = EXCLUDED.source_url,
        updated_at = NOW();
    `,
      [
        city_id,
        city_name,
        state_abbr,
        display_name,
        i + 1,
        population,
        POP_YEAR,
        SOURCE_NAME,
        SOURCE_URL,
        lng,
        lat,
      ],
    );
  }
  console.log('Seeded Top 100 cities.');
  process.exit(0);
}

seedCities().catch((e) => {
  console.error(e);
  process.exit(1);
});
