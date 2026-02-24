-- Extend room_type CHECK constraint to include 'exterior' and 'other'
-- Also extend style to include 'other' for custom styles

ALTER TABLE visualizations DROP CONSTRAINT IF EXISTS visualizations_room_type_check;
ALTER TABLE visualizations ADD CONSTRAINT visualizations_room_type_check
  CHECK (room_type IN (
    'kitchen', 'bathroom', 'living_room', 'bedroom', 'basement', 'dining_room', 'exterior', 'other'
  ));

ALTER TABLE visualizations DROP CONSTRAINT IF EXISTS visualizations_style_check;
ALTER TABLE visualizations ADD CONSTRAINT visualizations_style_check
  CHECK (style IN (
    'modern', 'traditional', 'farmhouse', 'industrial', 'minimalist', 'contemporary', 'other'
  ));
