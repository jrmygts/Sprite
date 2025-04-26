-- Add mode column to generations table
ALTER TABLE generations 
ADD COLUMN mode text NOT NULL DEFAULT 'character';

-- Update existing rows to have a default mode
UPDATE generations 
SET mode = 'character' 
WHERE mode IS NULL;

-- Add check constraint to ensure valid modes
ALTER TABLE generations 
ADD CONSTRAINT valid_mode CHECK (mode IN ('character', 'sprite-sheet')); 