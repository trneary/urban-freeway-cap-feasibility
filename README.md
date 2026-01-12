# Urban Freeway Cap Feasibility Explorer

A client-side React + Vite concept app that screens the feasibility of capping below-grade urban freeways using transparent rules and assumption-driven quantities.

## Getting started

### Development Mode (Frontend + Backend Separate)

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd server
npm install
cd ..

# Start both frontend and backend concurrently
npm run dev
```

### Production Mode (Combined Frontend + Backend)

This mode runs Express serving the React build from a single origin (no CORS, no separate ports):

```bash
# Install all dependencies
npm install
cd server && npm install && cd ..

# Build frontend and start backend (serves React from /dist)
npm run start
```

The backend will serve:
- React app at `/`
- APIs at `/api/*`

## Backend & Database Setup

See [server/README.md](server/README.md) for backend and PostGIS setup instructions.

If npm installation is blocked in your environment, inspect `package.json` for dependencies and install from an accessible registry mirror.

## Features
- Pre-curated library of below-grade freeway segments
- Structural system selection logic with memo-style sequencing
- Five-pillar feasibility scores plus weighted overall grade and color banding
- Order-of-magnitude materials, quantities, and cost range with top drivers
- Always-on disclaimer to reinforce conceptual intent
