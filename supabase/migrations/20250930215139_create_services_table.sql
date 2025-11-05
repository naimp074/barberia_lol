/*
  # Create services table for barbershop tracking

  1. New Tables
    - `services`
      - `id` (uuid, primary key) - Unique identifier for each service
      - `user_id` (uuid, foreign key) - References the user who owns this service record
      - `name` (text) - Name of the service (e.g., "Corte", "Corte y barba")
      - `price` (integer) - Price of the service in CLP
      - `timestamp` (timestamptz) - When the service was performed
      - `created_at` (timestamptz) - When the record was created

  2. Security
    - Enable RLS on `services` table
    - Add policy for authenticated users to read their own services
    - Add policy for authenticated users to insert their own services
    - Add policy for authenticated users to update their own services
    - Add policy for authenticated users to delete their own services

  3. Notes
    - All users can only access their own service records
    - Timestamps use timezone-aware format for accurate tracking
*/

CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  price integer NOT NULL,
  timestamp timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own services"
  ON services FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own services"
  ON services FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own services"
  ON services FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own services"
  ON services FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS services_user_id_idx ON services(user_id);
CREATE INDEX IF NOT EXISTS services_timestamp_idx ON services(timestamp);