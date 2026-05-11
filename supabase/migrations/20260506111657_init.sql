-- ─── Extensions ───────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ─── Enums ────────────────────────────────────────────────────────────────────

CREATE TYPE "nutrition_style" AS ENUM (
  'low_carb_high_protein',
  'vegetarian',
  'vegan',
  'mediterranean',
  'balanced',
  'paleo'
);

CREATE TYPE "language" AS ENUM ('de', 'en');

CREATE TYPE "meal_type" AS ENUM ('breakfast', 'lunch', 'dinner');

CREATE TYPE "shopping_category" AS ENUM (
  'produce',
  'meat',
  'dairy',
  'frozen',
  'dry_goods',
  'beverages',
  'household',
  'other'
);

CREATE TYPE "calendar_source" AS ENUM ('google', 'manual');

-- ─── Tabellen ─────────────────────────────────────────────────────────────────

CREATE TABLE "families" (
  "id"                  UUID              NOT NULL DEFAULT uuid_generate_v4(),
  "name"                TEXT              NOT NULL,
  "invite_code"         TEXT              NOT NULL DEFAULT substring(md5(random()::text), 1, 8),
  "nutrition_style"     "nutrition_style" NOT NULL DEFAULT 'balanced',
  "language"            "language"        NOT NULL DEFAULT 'de',
  "owner_id"            UUID              REFERENCES auth.users(id) ON DELETE SET NULL,
  "active_meal_types"   TEXT[]            NOT NULL DEFAULT ARRAY['breakfast','lunch','dinner'],
  "active_days"         INT[]             NOT NULL DEFAULT ARRAY[0,1,2,3,4,5,6],
  "cook_available_days" INT[]             NOT NULL DEFAULT ARRAY[0,1,2,3,4,5,6],
  "created_at"          TIMESTAMPTZ       NOT NULL DEFAULT NOW(),

  CONSTRAINT "families_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "families_invite_code_key" UNIQUE ("invite_code")
);

CREATE TABLE "members" (
  "id"                 UUID        NOT NULL DEFAULT uuid_generate_v4(),
  "family_id"          UUID        NOT NULL,
  "user_id"            UUID        UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  "name"               TEXT        NOT NULL,
  "is_child"           BOOLEAN     NOT NULL DEFAULT FALSE,
  "preferences"        TEXT[]      NOT NULL DEFAULT '{}',
  "dislikes"           TEXT[]      NOT NULL DEFAULT '{}',
  "meal_schedule"      JSONB,
  "google_oauth_token" TEXT,
  "ical_secret_token"  UUID        NOT NULL DEFAULT uuid_generate_v4(),
  "created_at"         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "members_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "members_family_id_fkey" FOREIGN KEY ("family_id")
    REFERENCES "families"("id") ON DELETE CASCADE
);

CREATE INDEX "members_user_id_idx" ON "members"("user_id");

CREATE TABLE "week_plans" (
  "id"              UUID        NOT NULL DEFAULT uuid_generate_v4(),
  "family_id"       UUID        NOT NULL,
  "week_start_date" DATE        NOT NULL,
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "week_plans_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "week_plans_family_id_week_start_date_key" UNIQUE ("family_id", "week_start_date"),
  CONSTRAINT "week_plans_family_id_fkey" FOREIGN KEY ("family_id")
    REFERENCES "families"("id") ON DELETE CASCADE
);

CREATE TABLE "plan_days" (
  "id"             UUID    NOT NULL DEFAULT uuid_generate_v4(),
  "week_plan_id"   UUID    NOT NULL,
  "date"           DATE    NOT NULL,
  "cook_available" BOOLEAN NOT NULL DEFAULT TRUE,

  CONSTRAINT "plan_days_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "plan_days_week_plan_id_date_key" UNIQUE ("week_plan_id", "date"),
  CONSTRAINT "plan_days_week_plan_id_fkey" FOREIGN KEY ("week_plan_id")
    REFERENCES "week_plans"("id") ON DELETE CASCADE
);

CREATE TABLE "meals" (
  "id"            UUID        NOT NULL DEFAULT uuid_generate_v4(),
  "plan_day_id"   UUID        NOT NULL,
  "meal_type"     "meal_type" NOT NULL,
  "name"          TEXT        NOT NULL,
  "is_ready_meal" BOOLEAN     NOT NULL DEFAULT FALSE,
  "recipe_json"   JSONB,
  "instructions"  TEXT,
  "servings"      INTEGER     NOT NULL DEFAULT 4,

  CONSTRAINT "meals_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "meals_plan_day_id_meal_type_key" UNIQUE ("plan_day_id", "meal_type"),
  CONSTRAINT "meals_plan_day_id_fkey" FOREIGN KEY ("plan_day_id")
    REFERENCES "plan_days"("id") ON DELETE CASCADE
);

CREATE TABLE "meal_attendees" (
  "meal_id"   UUID NOT NULL,
  "member_id" UUID NOT NULL,

  CONSTRAINT "meal_attendees_pkey" PRIMARY KEY ("meal_id", "member_id"),
  CONSTRAINT "meal_attendees_meal_id_fkey" FOREIGN KEY ("meal_id")
    REFERENCES "meals"("id") ON DELETE CASCADE,
  CONSTRAINT "meal_attendees_member_id_fkey" FOREIGN KEY ("member_id")
    REFERENCES "members"("id") ON DELETE CASCADE
);

CREATE TABLE "family_wishes" (
  "id"         UUID        NOT NULL DEFAULT uuid_generate_v4(),
  "family_id"  UUID        NOT NULL,
  "member_id"  UUID,
  "wish_text"  TEXT        NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "family_wishes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "family_wishes_family_id_fkey" FOREIGN KEY ("family_id")
    REFERENCES "families"("id") ON DELETE CASCADE,
  CONSTRAINT "family_wishes_member_id_fkey" FOREIGN KEY ("member_id")
    REFERENCES "members"("id") ON DELETE SET NULL
);

CREATE INDEX "family_wishes_family_id_idx" ON "family_wishes"("family_id");

CREATE TABLE "shopping_items" (
  "id"                   UUID                NOT NULL DEFAULT uuid_generate_v4(),
  "family_id"            UUID                NOT NULL,
  "name"                 TEXT                NOT NULL,
  "amount"               DECIMAL,
  "unit"                 TEXT,
  "category"             "shopping_category" NOT NULL DEFAULT 'other',
  "checked"              BOOLEAN             NOT NULL DEFAULT FALSE,
  "source_meal_id"       UUID,
  "last_updated_by_plan" DATE,
  "created_at"           TIMESTAMPTZ         NOT NULL DEFAULT NOW(),

  CONSTRAINT "shopping_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "shopping_items_family_id_name_key" UNIQUE ("family_id", "name"),
  CONSTRAINT "shopping_items_family_id_fkey" FOREIGN KEY ("family_id")
    REFERENCES "families"("id") ON DELETE CASCADE,
  CONSTRAINT "shopping_items_source_meal_id_fkey" FOREIGN KEY ("source_meal_id")
    REFERENCES "meals"("id") ON DELETE SET NULL
);

CREATE TABLE "product_history" (
  "id"        UUID                NOT NULL DEFAULT uuid_generate_v4(),
  "family_id" UUID                NOT NULL,
  "name"      TEXT                NOT NULL,
  "unit"      TEXT,
  "category"  "shopping_category",

  CONSTRAINT "product_history_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "product_history_family_id_name_key" UNIQUE ("family_id", "name"),
  CONSTRAINT "product_history_family_id_fkey" FOREIGN KEY ("family_id")
    REFERENCES "families"("id") ON DELETE CASCADE
);

CREATE INDEX "product_history_name_trgm" ON "product_history"
  USING GIN ("name" gin_trgm_ops);

CREATE TABLE "calendar_events" (
  "id"         UUID              NOT NULL DEFAULT uuid_generate_v4(),
  "family_id"  UUID              NOT NULL,
  "member_id"  UUID              NOT NULL,
  "title"      TEXT              NOT NULL,
  "date"       DATE              NOT NULL,
  "start_time" TIME,
  "end_time"   TIME,
  "all_day"    BOOLEAN           NOT NULL DEFAULT FALSE,
  "source"     "calendar_source" NOT NULL DEFAULT 'manual',
  "created_at" TIMESTAMPTZ       NOT NULL DEFAULT NOW(),

  CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "calendar_events_family_id_fkey" FOREIGN KEY ("family_id")
    REFERENCES "families"("id") ON DELETE CASCADE,
  CONSTRAINT "calendar_events_member_id_fkey" FOREIGN KEY ("member_id")
    REFERENCES "members"("id") ON DELETE CASCADE
);

-- ─── Row Level Security ───────────────────────────────────────────────────────

ALTER TABLE families        ENABLE ROW LEVEL SECURITY;
ALTER TABLE members         ENABLE ROW LEVEL SECURITY;
ALTER TABLE week_plans      ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_days       ENABLE ROW LEVEL SECURITY;
ALTER TABLE meals           ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_attendees  ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_wishes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- Helper: family_id des eingeloggten Users
CREATE OR REPLACE FUNCTION get_my_family_id()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT family_id FROM public.members WHERE user_id = (SELECT auth.uid()) LIMIT 1;
$$;

-- families
CREATE POLICY "families_insert" ON families
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = (SELECT auth.uid()));

CREATE POLICY "families_select" ON families
  FOR SELECT TO authenticated
  USING (id = get_my_family_id());

CREATE POLICY "families_update" ON families
  FOR UPDATE TO authenticated
  USING (owner_id = (SELECT auth.uid()));

-- members: family-weite CRUD durch eingeloggte Family-Members
CREATE POLICY "members_insert" ON members
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()) OR family_id = get_my_family_id());

CREATE POLICY "members_select" ON members
  FOR SELECT TO authenticated
  USING (family_id = get_my_family_id() OR user_id = (SELECT auth.uid()));

CREATE POLICY "members_update" ON members
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()) OR family_id = get_my_family_id())
  WITH CHECK (user_id = (SELECT auth.uid()) OR family_id = get_my_family_id());

CREATE POLICY "members_delete" ON members
  FOR DELETE TO authenticated
  USING (family_id = get_my_family_id() AND user_id IS DISTINCT FROM (SELECT auth.uid()));

-- week_plans: Family-weiter Voll-CRUD
CREATE POLICY "week_plans_modify" ON week_plans
  FOR ALL TO authenticated
  USING (family_id = get_my_family_id())
  WITH CHECK (family_id = get_my_family_id());

-- plan_days: chain via week_plans
CREATE POLICY "plan_days_modify" ON plan_days
  FOR ALL TO authenticated
  USING (
    week_plan_id IN (SELECT id FROM week_plans WHERE family_id = get_my_family_id())
  )
  WITH CHECK (
    week_plan_id IN (SELECT id FROM week_plans WHERE family_id = get_my_family_id())
  );

-- meals: chain via plan_days + week_plans
CREATE POLICY "meals_modify" ON meals
  FOR ALL TO authenticated
  USING (
    plan_day_id IN (
      SELECT pd.id FROM plan_days pd
      JOIN week_plans wp ON wp.id = pd.week_plan_id
      WHERE wp.family_id = get_my_family_id()
    )
  )
  WITH CHECK (
    plan_day_id IN (
      SELECT pd.id FROM plan_days pd
      JOIN week_plans wp ON wp.id = pd.week_plan_id
      WHERE wp.family_id = get_my_family_id()
    )
  );

-- meal_attendees: chain via members
CREATE POLICY "meal_attendees_modify" ON meal_attendees
  FOR ALL TO authenticated
  USING (
    member_id IN (SELECT id FROM members WHERE family_id = get_my_family_id())
  )
  WITH CHECK (
    member_id IN (SELECT id FROM members WHERE family_id = get_my_family_id())
  );

-- family_wishes: Voll-CRUD
CREATE POLICY "family_wishes_all" ON family_wishes
  TO authenticated
  USING (family_id = get_my_family_id())
  WITH CHECK (family_id = get_my_family_id());

-- shopping_items
CREATE POLICY "shopping_items_select" ON shopping_items
  FOR SELECT TO authenticated
  USING (family_id = get_my_family_id());

CREATE POLICY "shopping_items_insert" ON shopping_items
  FOR INSERT TO authenticated
  WITH CHECK (family_id = get_my_family_id());

CREATE POLICY "shopping_items_update" ON shopping_items
  FOR UPDATE TO authenticated
  USING (family_id = get_my_family_id());

CREATE POLICY "shopping_items_delete" ON shopping_items
  FOR DELETE TO authenticated
  USING (family_id = get_my_family_id());

-- product_history: Voll-CRUD
CREATE POLICY "product_history_modify" ON product_history
  FOR ALL TO authenticated
  USING (family_id = get_my_family_id())
  WITH CHECK (family_id = get_my_family_id());

-- calendar_events
CREATE POLICY "calendar_events_select" ON calendar_events
  FOR SELECT TO authenticated
  USING (family_id = get_my_family_id());

CREATE POLICY "calendar_events_insert" ON calendar_events
  FOR INSERT TO authenticated
  WITH CHECK (family_id = get_my_family_id());

CREATE POLICY "calendar_events_update" ON calendar_events
  FOR UPDATE TO authenticated
  USING (family_id = get_my_family_id())
  WITH CHECK (family_id = get_my_family_id());

CREATE POLICY "calendar_events_delete" ON calendar_events
  FOR DELETE TO authenticated
  USING (family_id = get_my_family_id());

-- Helper: lookup family by invite_code without RLS restriction (used in join flow)
CREATE OR REPLACE FUNCTION get_family_id_by_invite_code(p_invite_code text)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT id FROM public.families WHERE invite_code = p_invite_code LIMIT 1;
$$;

-- Onboarding: create family + first member atomically, bypassing RLS.
-- auth.uid() is checked inside the function so only authenticated callers succeed.
CREATE OR REPLACE FUNCTION create_family_and_member(
  p_family_name  TEXT,
  p_member_name  TEXT,
  p_nutrition_style nutrition_style DEFAULT 'balanced',
  p_language     language          DEFAULT 'de'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id  UUID;
  v_family_id UUID;
  v_member_id UUID;
BEGIN
  v_user_id := (SELECT auth.uid());
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  INSERT INTO families (name, nutrition_style, language, owner_id)
  VALUES (p_family_name, p_nutrition_style, p_language, v_user_id)
  RETURNING id INTO v_family_id;

  INSERT INTO members (family_id, name, user_id)
  VALUES (v_family_id, p_member_name, v_user_id)
  RETURNING id INTO v_member_id;

  RETURN json_build_object('family_id', v_family_id, 'member_id', v_member_id);
END;
$$;

-- Onboarding: join an existing family via invite code + create member.
CREATE OR REPLACE FUNCTION join_family_as_member(
  p_invite_code TEXT,
  p_member_name TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id   UUID;
  v_family_id UUID;
  v_member_id UUID;
BEGIN
  v_user_id := (SELECT auth.uid());
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT id INTO v_family_id FROM families WHERE invite_code = upper(p_invite_code) LIMIT 1;
  IF v_family_id IS NULL THEN
    RAISE EXCEPTION 'invalid invite code';
  END IF;

  INSERT INTO members (family_id, name, user_id)
  VALUES (v_family_id, p_member_name, v_user_id)
  RETURNING id INTO v_member_id;

  RETURN json_build_object('family_id', v_family_id, 'member_id', v_member_id);
END;
$$;

-- ─── Grants (PostgREST / Data API) ───────────────────────────────────────────

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated;

-- ─── Realtime ─────────────────────────────────────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE "shopping_items";
ALTER PUBLICATION supabase_realtime ADD TABLE "meals";
ALTER PUBLICATION supabase_realtime ADD TABLE "plan_days";
