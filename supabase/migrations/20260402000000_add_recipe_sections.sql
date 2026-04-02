-- ============================================
-- Recipe Sections Migration
-- Adds ingredient sections and instruction sections to recipes.
-- Replaces the flat JSON `instructions` TEXT column with a proper
-- recipe_instruction_steps table (consistent with recipe_ingredients).
-- ============================================

-- --------------------------------------------
-- INGREDIENT SECTIONS
-- --------------------------------------------

CREATE TABLE ingredient_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0
);

CREATE INDEX idx_ingredient_sections_recipe ON ingredient_sections(recipe_id);

ALTER TABLE recipe_ingredients
  ADD COLUMN section_id UUID REFERENCES ingredient_sections(id) ON DELETE SET NULL;

CREATE INDEX idx_recipe_ingredients_section ON recipe_ingredients(section_id);

-- --------------------------------------------
-- INSTRUCTION SECTIONS
-- --------------------------------------------

CREATE TABLE instruction_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0
);

CREATE INDEX idx_instruction_sections_recipe ON instruction_sections(recipe_id);

CREATE TABLE recipe_instruction_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  section_id UUID REFERENCES instruction_sections(id) ON DELETE SET NULL,
  text TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0
);

CREATE INDEX idx_recipe_instruction_steps_recipe ON recipe_instruction_steps(recipe_id);
CREATE INDEX idx_recipe_instruction_steps_section ON recipe_instruction_steps(section_id);

-- --------------------------------------------
-- BACKFILL: migrate existing instructions JSON
-- into recipe_instruction_steps
-- --------------------------------------------

DO $$
DECLARE
  r RECORD;
  step_text TEXT;
  step_order INT;
  parsed_steps JSONB;
BEGIN
  FOR r IN SELECT id, instructions FROM recipes WHERE instructions IS NOT NULL AND instructions != '' AND instructions != '[]' LOOP
    BEGIN
      parsed_steps := r.instructions::JSONB;
      step_order := 0;
      IF jsonb_typeof(parsed_steps) = 'array' THEN
        FOR step_text IN
          SELECT jsonb_array_elements_text(parsed_steps)
        LOOP
          IF trim(step_text) != '' THEN
            INSERT INTO recipe_instruction_steps (recipe_id, text, sort_order)
            VALUES (r.id, trim(step_text), step_order);
            step_order := step_order + 1;
          END IF;
        END LOOP;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- Skip rows with unparseable instructions
      NULL;
    END;
  END LOOP;
END $$;

-- Keep the instructions column for backward compatibility during rollout
-- (application code will write to the new table and ignore this column)

-- --------------------------------------------
-- RLS
-- --------------------------------------------

ALTER TABLE ingredient_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE instruction_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_instruction_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "family_isolation" ON ingredient_sections
  FOR ALL USING (
    recipe_id IN (SELECT id FROM recipes WHERE family_id = ANY(get_user_family_ids()))
  );

CREATE POLICY "family_isolation" ON instruction_sections
  FOR ALL USING (
    recipe_id IN (SELECT id FROM recipes WHERE family_id = ANY(get_user_family_ids()))
  );

CREATE POLICY "family_isolation" ON recipe_instruction_steps
  FOR ALL USING (
    recipe_id IN (SELECT id FROM recipes WHERE family_id = ANY(get_user_family_ids()))
  );
