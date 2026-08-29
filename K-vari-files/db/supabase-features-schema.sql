-- Supabase Schema for VariMitra Features Integration
-- Add this to your Supabase SQL editor and run to create the necessary tables and functions

-- ============================================================================
-- 1. YATRA GROUPS TABLE - for "Create / Join Group Yatra" feature
-- ============================================================================
CREATE TABLE IF NOT EXISTS yatra_groups (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_by TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

-- Create index for faster code lookup
CREATE INDEX IF NOT EXISTS idx_groups_code ON yatra_groups(code);
CREATE INDEX IF NOT EXISTS idx_groups_created_by ON yatra_groups(created_by);

-- ============================================================================
-- 2. GROUP MEMBERS TABLE - tracks who is in each group
-- ============================================================================
CREATE TABLE IF NOT EXISTS group_members (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  group_id TEXT NOT NULL REFERENCES yatra_groups(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  member_name TEXT NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  role TEXT DEFAULT 'member', -- 'admin' or 'member'
  last_location_lat DECIMAL(10, 8),
  last_location_lng DECIMAL(11, 8),
  last_location_update TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  
  UNIQUE(group_id, phone_number)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_phone ON group_members(phone_number);

-- ============================================================================
-- 3. LOCATION UPDATES TABLE - for real-time location tracking
-- ============================================================================
CREATE TABLE IF NOT EXISTS location_updates (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  group_id TEXT NOT NULL REFERENCES yatra_groups(id) ON DELETE CASCADE,
  member_phone TEXT NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  accuracy DECIMAL(10, 2),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  source TEXT DEFAULT 'mobile' -- 'mobile', 'web', 'api'
);

-- Create indexes for time-based queries
CREATE INDEX IF NOT EXISTS idx_location_updates_group_id ON location_updates(group_id);
CREATE INDEX IF NOT EXISTS idx_location_updates_timestamp ON location_updates(timestamp);
CREATE INDEX IF NOT EXISTS idx_location_updates_member_phone ON location_updates(member_phone);

-- ============================================================================
-- 4. CROWD STATUS TABLE - for "Crowd Status & Safety" feature
-- ============================================================================
CREATE TABLE IF NOT EXISTS crowd_status (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  location_name TEXT NOT NULL,
  density_percentage INTEGER NOT NULL,
  estimated_wait_time_minutes INTEGER,
  status TEXT NOT NULL, -- 'low', 'moderate', 'high', 'critical'
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  
  UNIQUE(location_name, timestamp)
);

-- Create index for location-based queries
CREATE INDEX IF NOT EXISTS idx_crowd_status_location ON crowd_status(location_name);
CREATE INDEX IF NOT EXISTS idx_crowd_status_timestamp ON crowd_status(timestamp DESC);

-- ============================================================================
-- 5. WEATHER DATA TABLE - for "Route & Weather" feature
-- ============================================================================
CREATE TABLE IF NOT EXISTS weather_forecast (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  route_stage TEXT NOT NULL,
  date DATE NOT NULL,
  temperature_celsius INTEGER,
  weather_condition TEXT,
  wind_speed_kmh INTEGER,
  humidity_percentage INTEGER,
  rainfall_probability INTEGER,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(route_stage, date)
);

-- Create index for stage and date lookups
CREATE INDEX IF NOT EXISTS idx_weather_stage_date ON weather_forecast(route_stage, date);

-- ============================================================================
-- 6. LOST AND FOUND TABLE - for "Lost & Found Services" feature
-- ============================================================================
CREATE TABLE IF NOT EXISTS lost_found_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  item_type TEXT NOT NULL, -- 'lost' or 'found'
  item_name TEXT NOT NULL,
  item_description TEXT,
  location TEXT,
  reported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reported_by_phone TEXT NOT NULL,
  reported_by_name TEXT,
  contact_number TEXT NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  image_url TEXT,
  status TEXT DEFAULT 'open', -- 'open', 'resolved', 'closed'
  is_active BOOLEAN DEFAULT TRUE
);

-- Create indexes for efficient searching
CREATE INDEX IF NOT EXISTS idx_lost_found_item_type ON lost_found_items(item_type);
CREATE INDEX IF NOT EXISTS idx_lost_found_status ON lost_found_items(status);
CREATE INDEX IF NOT EXISTS idx_lost_found_reported_at ON lost_found_items(reported_at DESC);
CREATE INDEX IF NOT EXISTS idx_lost_found_phone ON lost_found_items(reported_by_phone);

-- ============================================================================
-- 7. MEDICAL/EMERGENCY REPORTS TABLE - for "Medical Help" feature
-- ============================================================================
CREATE TABLE IF NOT EXISTS medical_reports (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  patient_phone TEXT NOT NULL,
  patient_name TEXT,
  emergency_level TEXT DEFAULT 'normal', -- 'normal', 'urgent', 'critical'
  symptoms TEXT[] DEFAULT ARRAY[]::TEXT[],
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  reported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'pending', -- 'pending', 'assigned', 'resolved'
  assigned_to TEXT, -- medical staff ID
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE
);

-- Create indexes for urgent queries
CREATE INDEX IF NOT EXISTS idx_medical_emergency_level ON medical_reports(emergency_level);
CREATE INDEX IF NOT EXISTS idx_medical_status ON medical_reports(status);
CREATE INDEX IF NOT EXISTS idx_medical_reported_at ON medical_reports(reported_at DESC);
CREATE INDEX IF NOT EXISTS idx_medical_patient_phone ON medical_reports(patient_phone);

-- ============================================================================
-- 8. DARSHAN BOOKINGS TABLE - for "Darshan Slot Booking" feature
-- ============================================================================
CREATE TABLE IF NOT EXISTS darshan_bookings (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  temple_name TEXT NOT NULL,
  booking_date DATE NOT NULL,
  booking_time_slot TEXT NOT NULL, -- e.g., "06:00 AM - 07:00 AM"
  pilgrim_phone TEXT NOT NULL,
  pilgrim_name TEXT NOT NULL,
  pilgrim_age INTEGER,
  group_size INTEGER DEFAULT 1,
  qr_code_id TEXT UNIQUE,
  booking_status TEXT DEFAULT 'confirmed', -- 'confirmed', 'cancelled', 'completed'
  booked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  slot_date TIMESTAMP WITH TIME ZONE,
  
  UNIQUE(temple_name, booking_date, booking_time_slot, pilgrim_phone)
);

-- Create indexes for efficient slot lookup
CREATE INDEX IF NOT EXISTS idx_darshan_temple_date ON darshan_bookings(temple_name, booking_date);
CREATE INDEX IF NOT EXISTS idx_darshan_pilgrim_phone ON darshan_bookings(pilgrim_phone);
CREATE INDEX IF NOT EXISTS idx_darshan_status ON darshan_bookings(booking_status);
CREATE INDEX IF NOT EXISTS idx_darshan_qr_code ON darshan_bookings(qr_code_id);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get active group members with latest location
CREATE OR REPLACE FUNCTION get_group_members_with_location(group_id_param TEXT)
RETURNS TABLE (
  member_name TEXT,
  phone_number TEXT,
  role TEXT,
  last_location_lat DECIMAL,
  last_location_lng DECIMAL,
  last_location_update TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gm.member_name,
    gm.phone_number,
    gm.role,
    gm.last_location_lat,
    gm.last_location_lng,
    gm.last_location_update
  FROM group_members gm
  WHERE gm.group_id = group_id_param AND gm.is_active = TRUE
  ORDER BY gm.joined_at ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to update member location
CREATE OR REPLACE FUNCTION update_member_location(
  group_id_param TEXT,
  phone_param TEXT,
  lat DECIMAL,
  lng DECIMAL
) RETURNS void AS $$
BEGIN
  -- Update group_members table
  UPDATE group_members
  SET 
    last_location_lat = lat,
    last_location_lng = lng,
    last_location_update = NOW()
  WHERE group_id = group_id_param AND phone_number = phone_param;
  
  -- Insert into location_updates table for history
  INSERT INTO location_updates (group_id, member_phone, latitude, longitude, timestamp)
  VALUES (group_id_param, phone_param, lat, lng, NOW());
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE yatra_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE crowd_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE weather_forecast ENABLE ROW LEVEL SECURITY;
ALTER TABLE lost_found_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE darshan_bookings ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own group data
CREATE POLICY "Users can view their groups" ON yatra_groups
  FOR SELECT USING (
    created_by = auth.uid()::TEXT OR 
    id IN (SELECT group_id FROM group_members WHERE phone_number = auth.uid()::TEXT)
  );

-- Policy: Users can view location updates for their groups
CREATE POLICY "Users can view group location updates" ON location_updates
  FOR SELECT USING (
    group_id IN (SELECT id FROM yatra_groups WHERE created_by = auth.uid()::TEXT) OR
    group_id IN (SELECT group_id FROM group_members WHERE phone_number = auth.uid()::TEXT)
  );

-- Policy: All users can view crowd status (public data)
CREATE POLICY "Everyone can view crowd status" ON crowd_status
  FOR SELECT USING (true);

-- Policy: All users can view weather forecasts (public data)
CREATE POLICY "Everyone can view weather" ON weather_forecast
  FOR SELECT USING (true);

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================

-- Notes for deployment:
-- 1. Run these SQL statements in your Supabase SQL editor
-- 2. Ensure Row Level Security (RLS) is properly configured
-- 3. Set up auth.uid() in your Supabase project
-- 4. Test all functions before going to production
-- 5. Set up automated backups for these tables
