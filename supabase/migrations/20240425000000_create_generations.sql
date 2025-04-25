-- Create generations table
CREATE TABLE generations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    prompt TEXT NOT NULL,
    resolution TEXT NOT NULL,
    style_preset TEXT NOT NULL,
    image_url TEXT NOT NULL,
    status TEXT DEFAULT 'completed' NOT NULL
);

-- Set up RLS (Row Level Security)
ALTER TABLE generations ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to view their own generations
CREATE POLICY "Users can view their own generations"
    ON generations
    FOR SELECT
    USING (auth.uid() = user_id);

-- Create policy to allow users to create their own generations
CREATE POLICY "Users can create their own generations"
    ON generations
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX generations_user_id_idx ON generations(user_id);
CREATE INDEX generations_created_at_idx ON generations(created_at DESC); 