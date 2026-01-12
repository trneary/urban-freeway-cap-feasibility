-- Migration: Create segment_inputs table for scoring inputs

CREATE TABLE IF NOT EXISTS segment_inputs (
    input_id UUID PRIMARY KEY,
    segment_id UUID REFERENCES segments(segment_id),
    category TEXT NOT NULL,
    input_key TEXT NOT NULL,
    input_value TEXT NOT NULL DEFAULT 'UNKNOWN',
    confidence TEXT NOT NULL DEFAULT 'UNKNOWN',
    source TEXT NOT NULL DEFAULT 'SYSTEM',
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(segment_id, input_key)
);

CREATE INDEX IF NOT EXISTS idx_segment_inputs_segment_id ON segment_inputs(segment_id);
