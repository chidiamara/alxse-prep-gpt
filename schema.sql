-- Run 1st
CREATE EXTENSION vector;

-- Run 2nd
CREATE TABLE team_members (
  id SERIAL PRIMARY KEY,
  name TEXT,
  role TEXT,
  image_src TEXT,
  tokens BIGINT,
  socials JSONB -- You can use JSONB to store socials as a JSON object
);

-- Run 3rd
CREATE TABLE topics (
  id SERIAL PRIMARY KEY,
  heading TEXT,
  properties JSONB -- You can use JSONB to store dynamic properties as a JSON object
);

-- Run 4th
CREATE TABLE scraped_chunks (
  id BIGSERIAL PRIMARY KEY,
  title TEXT,
  content TEXT,
  links TEXT,
  team_member_id INT REFERENCES team_members(id),
  topic_id INT REFERENCES topics(id),
  content_length BIGINT,
  content_tokens BIGINT,
  embedding VECTOR(1536)
);

-- Run 5th after running the scripts
CREATE OR REPLACE FUNCTION search_scraped_chunks (
  query_embedding VECTOR(1536),
  similarity_threshold FLOAT,
  match_count INT
)
RETURNS TABLE (
  id BIGINT,
  title TEXT,
  content TEXT,
  links TEXT,
  team_member_id INT,
  topic_id INT,
  content_length BIGINT,
  content_tokens BIGINT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    sc.id,
    sc.title,
    sc.content,
    sc.links,
    sc.team_member_id,
    sc.topic_id,
    sc.content_length,
    sc.content_tokens,
    1 - (sc.embedding <=> query_embedding) AS similarity
  FROM scraped_chunks AS sc
  WHERE 1 - (sc.embedding <=> query_embedding) > similarity_threshold
  ORDER BY sc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Run 6th
CREATE INDEX idx_scraped_chunks_embedding ON scraped_chunks
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
