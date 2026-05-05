-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Enums
CREATE TYPE nutrition_style AS ENUM (
  'low_carb_high_protein', 'vegetarian', 'vegan',
  'mediterranean', 'balanced', 'paleo'
);

CREATE TYPE language AS ENUM ('de', 'en');

CREATE TYPE meal_type AS ENUM ('breakfast', 'lunch', 'dinner');

CREATE TYPE shopping_category AS ENUM (
  'produce', 'meat', 'dairy', 'frozen',
  'dry_goods', 'beverages', 'household', 'other'
);

CREATE TYPE calendar_source AS ENUM ('google', 'manual');

-- families
CREATE TABLE families (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  invite_code TEXT NOT NULL UNIQUE DEFAULT substring(md5(random()::text), 1, 8),
  nutrition_style nutrition_style NOT NULL DEFAULT 'balanced',
  language language NOT NULL DEFAULT 'de',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- members
CREATE TABLE members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_child BOOLEAN NOT NULL DEFAULT FALSE,
  preferences TEXT[] NOT NULL DEFAULT '{}',
  dislikes TEXT[] NOT NULL DEFAULT '{}',
  google_oauth_token TEXT,
  ical_secret_token UUID NOT NULL DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- week_plans
CREATE TABLE week_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(family_id, week_start_date)
);

-- plan_days
CREATE TABLE plan_days (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  week_plan_id UUID NOT NULL REFERENCES week_plans(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  cook_available BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE(week_plan_id, date)
);

-- meals
CREATE TABLE meals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_day_id UUID NOT NULL REFERENCES plan_days(id) ON DELETE CASCADE,
  meal_type meal_type NOT NULL,
  name TEXT NOT NULL,
  is_ready_meal BOOLEAN NOT NULL DEFAULT FALSE,
  recipe_json JSONB,
  servings INTEGER NOT NULL DEFAULT 4,
  UNIQUE(plan_day_id, meal_type)
);

-- meal_attendees
CREATE TABLE meal_attendees (
  meal_id UUID NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  PRIMARY KEY (meal_id, member_id)
);

-- meal_wishes
CREATE TABLE meal_wishes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_day_id UUID NOT NULL REFERENCES plan_days(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  wish_text TEXT NOT NULL,
  fulfilled BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- shopping_items (one persistent list per family)
CREATE TABLE shopping_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount NUMERIC,
  unit TEXT,
  category shopping_category NOT NULL DEFAULT 'other',
  checked BOOLEAN NOT NULL DEFAULT FALSE,
  source_meal_id UUID REFERENCES meals(id) ON DELETE SET NULL,
  last_updated_by_plan DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(family_id, name)
);

-- product_history
CREATE TABLE product_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  unit TEXT,
  category shopping_category,
  UNIQUE(family_id, name)
);

CREATE INDEX product_history_name_trgm ON product_history
  USING GIN (name gin_trgm_ops);

-- calendar_events
CREATE TABLE calendar_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  all_day BOOLEAN NOT NULL DEFAULT FALSE,
  source calendar_source NOT NULL DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE shopping_items;
ALTER PUBLICATION supabase_realtime ADD TABLE meals;
ALTER PUBLICATION supabase_realtime ADD TABLE plan_days;
