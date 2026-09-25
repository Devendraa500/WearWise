# Product detection

The generic detector parses JSON-LD scripts recursively for Schema.org Products, reads OpenGraph product context, and scans visible useful images with nearby card text, heading, links and price patterns. Candidates get source-weighted confidence, image/URL deduplication, normalization and category inference. JSON-LD is preferred on product pages; DOM image candidates make listing pages useful. Site adapters can be added later, but no site-specific CSS selector is the foundation.

Images resembling icons, logos, banners, avatars and data URLs are excluded. The UI leaves selection to the shopper, which provides a safe correction path for imperfect extraction.
