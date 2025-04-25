-- Create a bucket for sprites
INSERT INTO storage.buckets (id, name, public) 
VALUES ('sprites', 'sprites', true);

-- Allow authenticated users to upload sprites
CREATE POLICY "Authenticated users can upload sprites"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'sprites' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public access to view sprites
CREATE POLICY "Anyone can view sprites"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'sprites');

-- Allow users to delete their own sprites
CREATE POLICY "Users can delete their own sprites"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'sprites' AND 
  (storage.foldername(name))[1] = auth.uid()::text
); 