-- Shopping List Self-Learning: User Preference Tracking
-- Records which auto-generated items users frequently skip or modify

-- Table to track user behavior patterns
CREATE TABLE IF NOT EXISTS shopping_list_learning (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    
    -- Item identification
    item_name TEXT NOT NULL,
    category TEXT,
    
    -- Learning signals
    times_generated INTEGER DEFAULT 0,      -- How many times AI suggested this
    times_accepted INTEGER DEFAULT 0,        -- How many times user accepted
    times_skipped INTEGER DEFAULT 0,         -- How many times user deselected
    times_quantity_modified INTEGER DEFAULT 0, -- How many times user changed quantity
    avg_quantity_adjustment REAL DEFAULT 0,  -- Average % adjustment (negative = reduced)
    
    -- Last interaction
    last_generated_at TIMESTAMPTZ,
    last_accepted_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE(business_id, item_name)
);

-- Enable RLS
ALTER TABLE shopping_list_learning ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Same as other business tables
CREATE POLICY "Business members can manage shopping learning" ON shopping_list_learning
    FOR ALL USING (
        business_id IN (
            SELECT business_id FROM business_members
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );

-- Index for fast lookup
CREATE INDEX idx_shopping_learning_business_item 
ON shopping_list_learning(business_id, item_name);

-- Function to record learning signal
CREATE OR REPLACE FUNCTION record_shopping_learning(
    p_business_id UUID,
    p_item_name TEXT,
    p_category TEXT,
    p_action TEXT,  -- 'generated', 'accepted', 'skipped', 'quantity_modified'
    p_quantity_adjustment REAL DEFAULT 0
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO shopping_list_learning (
        business_id, item_name, category,
        times_generated, times_accepted, times_skipped, times_quantity_modified,
        last_generated_at, last_accepted_at
    ) VALUES (
        p_business_id, p_item_name, p_category,
        CASE WHEN p_action = 'generated' THEN 1 ELSE 0 END,
        CASE WHEN p_action = 'accepted' THEN 1 ELSE 0 END,
        CASE WHEN p_action = 'skipped' THEN 1 ELSE 0 END,
        CASE WHEN p_action = 'quantity_modified' THEN 1 ELSE 0 END,
        CASE WHEN p_action = 'generated' THEN now() ELSE NULL END,
        CASE WHEN p_action = 'accepted' THEN now() ELSE NULL END
    )
    ON CONFLICT (business_id, item_name) DO UPDATE SET
        times_generated = shopping_list_learning.times_generated + 
            CASE WHEN p_action = 'generated' THEN 1 ELSE 0 END,
        times_accepted = shopping_list_learning.times_accepted + 
            CASE WHEN p_action = 'accepted' THEN 1 ELSE 0 END,
        times_skipped = shopping_list_learning.times_skipped + 
            CASE WHEN p_action = 'skipped' THEN 1 ELSE 0 END,
        times_quantity_modified = shopping_list_learning.times_quantity_modified + 
            CASE WHEN p_action = 'quantity_modified' THEN 1 ELSE 0 END,
        avg_quantity_adjustment = CASE 
            WHEN p_action = 'quantity_modified' THEN 
                (shopping_list_learning.avg_quantity_adjustment * shopping_list_learning.times_quantity_modified + p_quantity_adjustment) 
                / (shopping_list_learning.times_quantity_modified + 1)
            ELSE shopping_list_learning.avg_quantity_adjustment
        END,
        last_generated_at = CASE WHEN p_action = 'generated' THEN now() ELSE shopping_list_learning.last_generated_at END,
        last_accepted_at = CASE WHEN p_action = 'accepted' THEN now() ELSE shopping_list_learning.last_accepted_at END,
        updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- View to get learning-adjusted suggestions (items frequently skipped will have lower priority)
CREATE OR REPLACE VIEW shopping_learning_scores AS
SELECT 
    business_id,
    item_name,
    category,
    times_generated,
    times_accepted,
    times_skipped,
    -- Score: higher = more likely to be accepted
    CASE 
        WHEN times_generated = 0 THEN 0.5  -- No data, neutral
        ELSE (times_accepted::REAL / GREATEST(times_generated, 1))
    END AS acceptance_rate,
    avg_quantity_adjustment
FROM shopping_list_learning;
