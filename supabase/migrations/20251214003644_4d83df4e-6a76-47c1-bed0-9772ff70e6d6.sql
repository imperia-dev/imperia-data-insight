-- Remove conflicting permissive policies from lead tables that allow any authenticated user to view all data
DROP POLICY IF EXISTS "Authenticated users can view lead conversions" ON lead_conversions;
DROP POLICY IF EXISTS "Authenticated users can view lead events" ON lead_events;
DROP POLICY IF EXISTS "Authenticated users can view lead page views" ON lead_page_views;
DROP POLICY IF EXISTS "Authenticated users can view lead sessions" ON lead_sessions;

-- Remove duplicate INSERT policies (keep only one anonymous insert per table)
DROP POLICY IF EXISTS "Anyone can insert lead conversions" ON lead_conversions;
DROP POLICY IF EXISTS "Anyone can insert lead events" ON lead_events;
DROP POLICY IF EXISTS "Anyone can insert lead page views" ON lead_page_views;
DROP POLICY IF EXISTS "Anyone can insert lead sessions" ON lead_sessions;