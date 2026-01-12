

import express from 'express';
import healthRouter from './routes/health.js';
import dbHealthRouter from './routes/dbHealth.js';
import citiesRouter from './routes/cities.js';
import citySegmentsRouter from './routes/citySegments.js';
import segmentInputsRouter from './routes/segmentInputs.js';

const app = express();

// Mount API routes FIRST (static + SPA fallback added in index.js)
app.use('/api/cities', citiesRouter);
app.use('/api/cities', citySegmentsRouter);
app.use('/api/segments', segmentInputsRouter);

export default app;
