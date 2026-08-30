-- Create sequence for high-throughput, collision-free short code generation
-- Pre-allocates 50 numbers in PostgreSQL memory cache per connection to eliminate row-locking contention
CREATE SEQUENCE IF NOT EXISTS short_code_seq
  START WITH 100000
  INCREMENT BY 1
  CACHE 50;
