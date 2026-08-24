PRAGMA foreign_keys = ON;

-- Project slugs are public route identifiers. Application validation provides
-- friendly suffixing; this index remains the final concurrency-safe boundary.
CREATE UNIQUE INDEX website_projects_slug_unique_idx
  ON website_content_items(collection_key, lower(json_extract(data_json, '$.slug')))
  WHERE collection_key = 'projects'
    AND json_type(data_json, '$.slug') = 'text';
