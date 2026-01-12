# Urban Freeway Cap Feasibility — Backend


## Prerequisites
- Node.js (v18+ recommended)
- PostgreSQL (v14+ recommended) with PostGIS extension

### Running Postgres locally
- Install Postgres and PostGIS:
  ```sh
  sudo apt update && sudo apt install postgresql postgis
  ```
- Or use Docker:
  ```sh
  docker run --name pg-postgis -e POSTGRES_PASSWORD=yourpassword -p 5432:5432 -d postgis/postgis
  ```

### Example DATABASE_URL
```
DATABASE_URL=postgres://user:password@localhost:5432/urban_freeway_cap
```

## Environment Setup
1. Copy `.env.example` to `.env` and update values as needed:
  ```sh
  cp .env.example .env
  ```
2. Ensure your `DATABASE_URL` points to a local Postgres instance with PostGIS enabled.

## Database Setup
1. Create the database:
  ```sh
  createdb urban_freeway_cap
  ```
2. Enable PostGIS and test spatial types:
  ```sh
  psql -d urban_freeway_cap -f migrations/001-enable-postgis.sql
  ```


## Test the API

To verify the backend is running and /api/cities works:

```sh
curl "http://localhost:3001/api/cities?query=Ne"
```

You should see a JSON response with matching cities.

## Running the Backend
```sh
cd server
npm install
npm run dev
```

## Health Check
- Visit [http://localhost:4000/api/health](http://localhost:4000/api/health)
- Should return `{ "status": "ok" }`

## Running the Frontend
From the project root:
```sh
npm install
npm run dev
```


## Run the app locally

1. Start Postgres (Docker example):
  ```sh
  docker run --name pg-postgis -e POSTGRES_PASSWORD=yourpassword -p 5432:5432 -d postgis/postgis
  ```
2. Set DATABASE_URL in `.env` (see example above)
3. Run migrations and seed cities:
  ```sh
  cd server
  npm install
  psql -d urban_freeway_cap -f migrations/001-enable-postgis.sql
  psql -d urban_freeway_cap -f migrations/002-create-cities.sql
  psql -d urban_freeway_cap -f migrations/003-create-segments.sql
  psql -d urban_freeway_cap -f migrations/004-create-segment-inputs.sql
  npm run seed:cities
  ```
4. Run the app (from project root):
  ```sh
  npm install
  npm run dev
  ```
5. Open the app at [http://localhost:5173](http://localhost:5173)

## Smoke test checklist
- [ ] /api/health returns ok
- [ ] /api/db/health returns ok
- [ ] City search works
- [ ] Selecting a city generates segments
- [ ] Segment inputs load as UNKNOWN
- Visit [http://localhost:4000/api/db-check](http://localhost:4000/api/db-check)

---

## Dev workflow

- Start frontend: `npm run dev` (from project root)
- Start backend: `cd server && npm run dev`
- (Optional) Add a root-level script to run both concurrently.

---

## Notes
- No city/segment logic yet. This is backend + DB foundation only.
- PostGIS SRID 4326 is used for all geometry.
