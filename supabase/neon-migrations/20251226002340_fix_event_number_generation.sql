-- Fix event number generation function to be more robust
-- Previous implementation used SUBSTRING(FROM 10) which was incorrect for ENVT-YYYY-NNNN
-- (ENVT-YYYY- is 10 chars, so sequence starts at 11)

CREATE OR REPLACE FUNCTION tenant_events.fn_generate_event_number()
RETURNS TRIGGER AS $$
DECLARE
  v_year text;
  v_sequence_num int;
  v_event_number text;
BEGIN
  -- Extract year from current date
  v_year := to_char(CURRENT_DATE, 'YYYY');

  -- Get next sequence number for this tenant and year
  -- ENVT-YYYY-NNNN -> split_part(event_number, '-', 3) gives NNNN
  SELECT COALESCE(MAX(CAST(NULLIF(split_part(event_number, '-', 3), '') AS integer)), 0) + 1
  INTO v_sequence_num
  FROM tenant_events.events
  WHERE tenant_id = NEW.tenant_id
  AND event_number LIKE 'ENVT-' || v_year || '-%';

  -- Format as ENVT-YYYY-NNNN with leading zeros for NNNN
  v_event_number := 'ENVT-' || v_year || '-' || LPAD(v_sequence_num::text, 4, '0');

  -- Set the event number if not already set (for new records)
  IF NEW.event_number IS NULL OR NEW.event_number = '' THEN
    NEW.event_number := v_event_number;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Drop and recreate trigger to be cleaner (only on INSERT)
DROP TRIGGER IF EXISTS events_generate_event_number ON tenant_events.events;
CREATE TRIGGER events_generate_event_number
  BEFORE INSERT ON tenant_events.events
  FOR EACH ROW EXECUTE FUNCTION tenant_events.fn_generate_event_number();









