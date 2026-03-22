-- Extend leads.project_type CHECK constraint to include room types from the visualizer.
-- The visualizer offers living_room, bedroom, dining_room but the leads table
-- only accepted kitchen, bathroom, basement, flooring, painting, exterior, other.
-- This caused Zod validation failures when users submitted leads after visualizing
-- living rooms, bedrooms, or dining rooms.

ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_project_type_check;
ALTER TABLE leads ADD CONSTRAINT leads_project_type_check
  CHECK (project_type IN (
    'kitchen', 'bathroom', 'basement', 'flooring', 'painting', 'exterior', 'other',
    'living_room', 'bedroom', 'dining_room'
  ));
