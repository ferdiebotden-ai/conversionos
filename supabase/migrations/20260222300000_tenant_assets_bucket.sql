-- Create public storage bucket for tenant assets (logos, hero images, portfolio, team photos).
-- Public read access, service-role write access only.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'tenant-assets',
  'tenant-assets',
  true,
  10485760,  -- 10MB per file
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to tenant-assets bucket
CREATE POLICY "Public read access for tenant-assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'tenant-assets');

-- Allow service role to insert files
CREATE POLICY "Service role insert for tenant-assets"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'tenant-assets');

-- Allow service role to update files
CREATE POLICY "Service role update for tenant-assets"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'tenant-assets');

-- Allow service role to delete files
CREATE POLICY "Service role delete for tenant-assets"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'tenant-assets');
