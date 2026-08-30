-- Standalone SQL initialization script for PostgreSQL short_code_seq
-- Run this in your PostgreSQL database (e.g. Supabase SQL Editor / psql)
CREATE SEQUENCE IF NOT EXISTS short_code_seq
  START WITH 100000
  INCREMENT BY 1
  CACHE 50;
