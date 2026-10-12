-- Touch the six public category rows when the keyword-targeted category SEO copy is deployed.
-- This keeps sitemap <lastmod> aligned with the actual rendered category content.
UPDATE categories
SET updated_at=CURRENT_TIMESTAMP
WHERE slug IN (
  'gas-detectors',
  'fire-extinguishers',
  'fire-alarm',
  'sprinklers',
  'firebox-hosereel',
  'fire-pumps'
);
