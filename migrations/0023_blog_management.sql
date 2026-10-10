PRAGMA foreign_keys = ON;

CREATE TABLE blog_post_metrics (
  blog_id TEXT PRIMARY KEY REFERENCES website_content_items(id) ON DELETE RESTRICT,
  view_count INTEGER NOT NULL DEFAULT 0 CHECK (view_count >= 0),
  last_viewed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
) STRICT;

INSERT OR IGNORE INTO blog_post_metrics(blog_id)
SELECT id FROM website_content_items WHERE collection_key = 'blog_posts';

CREATE UNIQUE INDEX website_blog_slug_unique
ON website_content_items(json_extract(data_json, '$.slug'))
WHERE collection_key = 'blog_posts'
  AND status != 'ARCHIVED'
  AND json_extract(data_json, '$.slug') IS NOT NULL;

CREATE INDEX website_blog_public_date_idx
ON website_content_items(status, published_at DESC, updated_at DESC)
WHERE collection_key = 'blog_posts';

INSERT INTO platform_settings(setting_key,value_json,is_public,description)
VALUES('platform.blog_management.version','"1.0.0"',1,'Dedicated blog CMS workflow, metrics, SEO, and public integration version');
