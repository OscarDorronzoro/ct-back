

-- Positions: speed (km/h) and heading computed from the previous position --------------------------------
-- speed was the value sent by the old gateway (unknown unit); now the backend computes it.

ALTER TABLE positions ADD COLUMN heading real;
COMMENT ON COLUMN positions.speed IS 'km/h, average since the previous position of the collar';
COMMENT ON COLUMN positions.heading IS 'degrees clockwise from north, from the previous position; null under 10 m';

-- Backfill of the existing positions (same rules as the processing job). Can be re-run.
-- Less than 30 s apart: no speed or heading. Less than 10 m: speed 0, no heading.
WITH ordered AS (
  SELECT id, recorded_at, location,
    lag(recorded_at) OVER w AS previous_at,
    lag(location) OVER w AS previous_location
  FROM positions
  WINDOW w AS (PARTITION BY collar_id ORDER BY recorded_at, id)
), measured AS (
  SELECT id, location, previous_location,
    EXTRACT(EPOCH FROM (recorded_at - previous_at)) AS seconds,
    ST_Distance(previous_location, location) AS meters
  FROM ordered
)
UPDATE positions p SET
  speed = CASE
    WHEN m.seconds IS NULL OR m.seconds < 30 THEN NULL
    WHEN m.meters < 10 THEN 0
    ELSE m.meters / m.seconds * 3.6 END,
  heading = CASE
    WHEN m.seconds IS NULL OR m.seconds < 30 OR m.meters < 10 THEN NULL
    ELSE degrees(ST_Azimuth(m.previous_location, m.location)) END
FROM measured m
WHERE m.id = p.id;



-- Weather: hourly series at the farm, from Open-Meteo (job weatherSync, every hour) ------------------------
-- The first run fills the last 92 days.

CREATE TABLE weather_observations (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  observed_at timestamp with time zone NOT NULL UNIQUE,
  latitude real NOT NULL,
  longitude real NOT NULL,
  temperature real,
  apparent_temperature real,
  relative_humidity smallint,
  precipitation real,
  weather_code smallint,
  cloud_cover smallint,
  pressure real,
  wind_speed real,
  wind_gusts real,
  wind_direction smallint,
  source character varying NOT NULL,
  fetched_at timestamp with time zone NOT NULL
);

COMMENT ON TABLE weather_observations IS 'Hourly weather at the center of the zones, from an external provider';
COMMENT ON COLUMN weather_observations.observed_at IS 'End of the hour (UTC); precipitation is the sum of that hour';
COMMENT ON COLUMN weather_observations.temperature IS '°C at 2 m';
COMMENT ON COLUMN weather_observations.relative_humidity IS '%';
COMMENT ON COLUMN weather_observations.precipitation IS 'mm in the hour';
COMMENT ON COLUMN weather_observations.weather_code IS 'WMO weather interpretation code';
COMMENT ON COLUMN weather_observations.cloud_cover IS '%';
COMMENT ON COLUMN weather_observations.pressure IS 'hPa at sea level';
COMMENT ON COLUMN weather_observations.wind_speed IS 'km/h at 10 m';
COMMENT ON COLUMN weather_observations.wind_gusts IS 'km/h at 10 m';
COMMENT ON COLUMN weather_observations.wind_direction IS 'degrees the wind comes from';


GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ctapp;




-- Cattle categories and sex of the cows ----------------------------------------------------------------
-- Each category is for one sex. cows references (category_id, sex), so the database rejects a cow in
-- a category of the other sex. The CHECK makes the sex required to set a category: with a null sex
-- PostgreSQL doesn't check the composite foreign key.

CREATE TABLE categories (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name character varying NOT NULL UNIQUE,
  sex character varying NOT NULL CHECK (sex IN ('male', 'female')),
  UNIQUE (id, sex)
);

COMMENT ON TABLE categories IS 'Cattle category (stage of the animal for its management), for a single sex';

-- In order of the life of the animal, for each sex
INSERT INTO categories (name, sex) VALUES
  ('Ternera', 'female'),
  ('Vaquillona', 'female'),
  ('Vaca', 'female'),
  ('Ternero', 'male'),
  ('Novillito', 'male'),
  ('Novillo', 'male'),
  ('Torito', 'male'),
  ('Toro', 'male');

ALTER TABLE cows
  ADD COLUMN sex character varying CHECK (sex IN ('male', 'female')),
  ADD COLUMN category_id integer,
  ADD CONSTRAINT cows_category_fkey FOREIGN KEY (category_id, sex) REFERENCES categories (id, sex),
  ADD CONSTRAINT cows_category_requires_sex CHECK (category_id IS NULL OR sex IS NOT NULL);

COMMENT ON COLUMN cows.sex IS 'male | female';
COMMENT ON COLUMN cows.category_id IS 'Current category; must be for the sex of the cow';

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ctapp;



-- Zone types: manga (chute, where the animals are handled) ---------------------------------------------

INSERT INTO zone_types (name)
SELECT 'manga'
WHERE NOT EXISTS (SELECT 1 FROM zone_types WHERE name = 'manga');



-- Users: several roles per user (permissions per role are in the code: identity/permission.constants) ---
-- Old numeric roles: 0 admin, 1 operator -> manager, 2 viewer.
-- Two steps, so the deploy never runs code against a database it doesn't expect:
--   1. before deploying: new table and copy (the old code keeps working with users.role);
--   2. after deploying: drop users.role.

-- Step 1 -------------------------------------------------------------------------------------------------
CREATE TABLE user_roles (
  user_id integer NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  role character varying NOT NULL
    CHECK (role IN ('admin', 'manager', 'veterinarian', 'technician', 'viewer')),
  PRIMARY KEY (user_id, role)
);

COMMENT ON TABLE user_roles IS 'Roles of each user; a user has the union of the permissions of their roles';

INSERT INTO user_roles (user_id, role)
SELECT id, CASE role WHEN 0 THEN 'admin' WHEN 1 THEN 'manager' ELSE 'viewer' END
FROM users;

-- The new code creates users without it
ALTER TABLE users ALTER COLUMN role DROP NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON user_roles TO ctapp;

-- Step 2 (after deploying) -------------------------------------------------------------------------------
-- Users created by the old code between step 1 and the deploy have no roles yet: copy them first
INSERT INTO user_roles (user_id, role)
SELECT id, CASE role WHEN 0 THEN 'admin' WHEN 1 THEN 'manager' ELSE 'viewer' END
FROM users u
WHERE role IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM user_roles r WHERE r.user_id = u.id);

ALTER TABLE users DROP COLUMN role;



-- Health: clinical history of the cows (animal events) and products ------------------------------------
-- animal_events is the timeline; each type has a detail table with the same id (supertype/subtype).
-- Events are never edited or deleted: a wrong one is voided (voided_at, voided_by, void_reason).

CREATE TABLE products (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name character varying NOT NULL UNIQUE,
  type character varying NOT NULL CHECK (type IN ('vaccine', 'drug', 'antiparasitic')),
  meat_withdrawal_days integer NOT NULL DEFAULT 0 CHECK (meat_withdrawal_days >= 0),
  milk_withdrawal_days integer NOT NULL DEFAULT 0 CHECK (milk_withdrawal_days >= 0),
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

COMMENT ON TABLE products IS 'Vaccines, drugs and antiparasitics used in vaccinations and treatments';
COMMENT ON COLUMN products.meat_withdrawal_days IS 'Days after the last application before the meat can be sold';
COMMENT ON COLUMN products.milk_withdrawal_days IS 'Days after the last application before the milk can be sold';
COMMENT ON COLUMN products.active IS 'false: not offered for new events (recorded ones keep it)';

CREATE TABLE animal_events (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cow_id integer NOT NULL REFERENCES cows (id),
  type character varying NOT NULL
    CHECK (type IN ('vaccination', 'treatment', 'examination', 'weighing')),
  occurred_at timestamp with time zone NOT NULL,
  notes text,
  recorded_by integer REFERENCES users (id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  voided_at timestamp with time zone,
  voided_by integer REFERENCES users (id) ON DELETE SET NULL,
  void_reason text,
  CONSTRAINT animal_events_void_reason CHECK ((voided_at IS NULL) = (void_reason IS NULL))
);

CREATE INDEX idx_animal_events_cow_occurred_at ON animal_events (cow_id, occurred_at DESC);

COMMENT ON TABLE animal_events IS 'Events of the animal entered by a person: the clinical history. Voided, never deleted';

CREATE TABLE vaccinations (
  event_id integer PRIMARY KEY REFERENCES animal_events (id) ON DELETE CASCADE,
  product_id integer NOT NULL REFERENCES products (id),
  dose character varying,
  batch character varying,
  route character varying,
  next_dose_on date,
  meat_withdrawal_until timestamp with time zone,
  milk_withdrawal_until timestamp with time zone
);

CREATE TABLE treatments (
  event_id integer PRIMARY KEY REFERENCES animal_events (id) ON DELETE CASCADE,
  product_id integer NOT NULL REFERENCES products (id),
  diagnosis text,
  dose character varying,
  route character varying,
  duration_days integer NOT NULL DEFAULT 1 CHECK (duration_days >= 1),
  meat_withdrawal_until timestamp with time zone,
  milk_withdrawal_until timestamp with time zone
);

COMMENT ON COLUMN treatments.duration_days IS 'Days of application, starting on the day of the event';

CREATE TABLE examinations (
  event_id integer PRIMARY KEY REFERENCES animal_events (id) ON DELETE CASCADE,
  finding text,
  temperature real,
  body_condition real CHECK (body_condition BETWEEN 1 AND 5)
);

COMMENT ON COLUMN examinations.temperature IS '°C';
COMMENT ON COLUMN examinations.body_condition IS 'Body condition score, 1 (very thin) to 5 (obese)';

CREATE TABLE weighings (
  event_id integer PRIMARY KEY REFERENCES animal_events (id) ON DELETE CASCADE,
  weight_kg real NOT NULL CHECK (weight_kg > 0)
);

GRANT SELECT, INSERT, UPDATE, DELETE
  ON products, animal_events, vaccinations, treatments, examinations, weighings
  TO ctapp;



-- Weather: reload from scratch with the historical API -------------------------------------------------
-- The first version took the history from the forecast API, which has only ~2 months of past data
-- and stored the older hours empty. The next run of the job loads the last 92 days again.

DELETE FROM weather_observations;



-- Products: common ones to start with -------------------------------------------------------------------
-- Reference withdrawal days (meat, milk) from usual labels; when unsure, the longest (conservative).
-- They depend on the brand and formulation: the veterinarian must check them against the label
-- (Configuración > Productos). "No usar en lactancia": the label forbids it in lactating cows; the
-- system has no way to say so yet, hence the note in the name. Can be re-run (skips existing names).

INSERT INTO products (name, type, meat_withdrawal_days, milk_withdrawal_days) VALUES
  ('Vacuna antiaftosa', 'vaccine', 21, 0),
  ('Vacuna brucelosis (cepa 19)', 'vaccine', 21, 0),
  ('Vacuna clostridial polivalente (mancha, gangrena, enterotoxemia)', 'vaccine', 21, 0),
  ('Vacuna reproductiva (IBR, DVB, leptospirosis)', 'vaccine', 21, 0),
  ('Vacuna carbunclo bacteridiano', 'vaccine', 42, 0),
  ('Vacuna queratoconjuntivitis', 'vaccine', 21, 0),
  ('Ivermectina 1% inyectable (no usar en lactancia)', 'antiparasitic', 35, 0),
  ('Doramectina 1% inyectable (no usar en lactancia)', 'antiparasitic', 35, 0),
  ('Eprinomectina 0,5% pour-on', 'antiparasitic', 0, 0),
  ('Albendazol oral (no usar en lactancia)', 'antiparasitic', 27, 0),
  ('Levamisol inyectable (no usar en lactancia)', 'antiparasitic', 7, 0),
  ('Oxitetraciclina LA 20% (no usar en lactancia)', 'drug', 28, 0),
  ('Penicilina G procaínica', 'drug', 14, 2),
  ('Florfenicol (no usar en lactancia)', 'drug', 28, 0),
  ('Flunixin meglumina', 'drug', 4, 2),
  ('Tilosina 20% (no usar en lactancia)', 'drug', 21, 0),
  ('Oxitocina', 'drug', 0, 0)
ON CONFLICT (name) DO NOTHING;



-- Positions: zone of each position ----------------------------------------------------------------------
-- The processing job now sets positions.zone_id: the smallest active zone that contains the point (the
-- most specific one: a paddock inside a general zone), or null outside every zone.
-- Backfill of the existing positions with the current zones. Can be re-run (only fills empty ones).

UPDATE positions p
SET zone_id = (
  SELECT z.id
  FROM zones z
  WHERE z.deleted_at IS NULL
    AND ST_Covers(z.polygon, p.location)
  ORDER BY ST_Area(z.polygon), z.id
  LIMIT 1
)
WHERE p.zone_id IS NULL;
