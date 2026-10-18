-- ==============================================================================
-- REZCART: ESQUEMA OFICIAL DE BASE DE DATOS (FASE 3 - CONTRATOS DEFINITIVOS)
-- ==============================================================================
-- Motor: PostgreSQL 15+ / Supabase
-- Arquitectura: Modo Dual Offline-First (IndexedDB outbox sync) + Supabase Realtime
-- Sistema Visual: Layered Elevation (Atelier Gourmet & Platino)
-- ==============================================================================

-- 1. EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. TIPOS ENUMERADOS
DO $$ BEGIN
    CREATE TYPE diet_base_type AS ENUM ('omnivore', 'carnivore', 'vegetarian', 'vegan');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE cart_lane_type AS ENUM ('fresh_pantry', 'household_bazar');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE cart_item_status_type AS ENUM ('pending', 'purchased', 'postponed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE food_category_type AS ENUM (
        'carnes_aves',
        'lacteos_huevos',
        'pescados',
        'verduras_frutas',
        'despensa_conservas',
        'congelados'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE storage_zone_type AS ENUM ('fridge', 'pantry', 'fruit_bowl', 'freezer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE pantry_status_type AS ENUM ('active', 'depleted', 'discarded');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE recipe_source_type AS ENUM ('curated', 'user', 'chef_ai');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE scan_type_enum AS ENUM ('countertop_bulk', 'zone_audit');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. TABLA: HOGARES (HOUSEHOLDS)
-- Entidad raíz para compartir carritos y despensa viva entre miembros
CREATE TABLE IF NOT EXISTS households (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL DEFAULT 'Mi Hogar',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 4. TABLA: DIRECTIVA DIETÉTICA UNIFICADA DEL HOGAR (DIETARY PROFILES)
-- La directiva rectora activa que gobierna el Pulso de Cocina, el Recetario y el Chef IA
CREATE TABLE IF NOT EXISTS household_dietary_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    base_diet diet_base_type NOT NULL DEFAULT 'omnivore',
    restrictions TEXT[] NOT NULL DEFAULT '{}',
    default_servings INTEGER NOT NULL DEFAULT 2 CHECK (default_servings >= 1 AND default_servings <= 20),
    notes TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    CONSTRAINT unique_household_diet UNIQUE (household_id)
);

-- 5. TABLA: MIEMBROS INDIVIDUALES DEL HOGAR (MODELO HÍBRIDO EXTENSIBLE)
-- Permite registrar miembros con dietas particulares sin romper la directiva general
CREATE TABLE IF NOT EXISTS household_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    avatar_color TEXT DEFAULT '#0f766e',
    base_diet diet_base_type NOT NULL DEFAULT 'omnivore',
    individual_restrictions TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 6. TABLA: CATÁLOGO MAESTRO CANÓNICO DE ALIMENTOS (STAPLE FOODS)
-- Soporta la doble capa flexible: texto libre con auto-vinculación a reglas de frescura
CREATE TABLE IF NOT EXISTS staple_foods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    canonical_name TEXT NOT NULL UNIQUE,
    category food_category_type NOT NULL,
    default_zone storage_zone_type NOT NULL DEFAULT 'fridge',
    estimated_shelf_days INTEGER NOT NULL DEFAULT 7 CHECK (estimated_shelf_days > 0),
    compatible_bases diet_base_type[] NOT NULL DEFAULT '{omnivore}',
    allergens TEXT[] NOT NULL DEFAULT '{}',
    is_keto BOOLEAN NOT NULL DEFAULT false,
    synonyms TEXT[] NOT NULL DEFAULT '{}',
    quick_staple BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Índices para búsqueda rápida de sinónimos e ingredientes
CREATE INDEX IF NOT EXISTS idx_staple_foods_canonical ON staple_foods(canonical_name);
CREATE INDEX IF NOT EXISTS idx_staple_foods_category ON staple_foods(category);

-- 7. TABLA: CARRITOS DE COMPRA (CARTS)
CREATE TABLE IF NOT EXISTS carts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    icon TEXT NOT NULL DEFAULT 'fa-cart-shopping',
    color_token TEXT NOT NULL DEFAULT '#0f766e',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_carts_household ON carts(household_id);

-- 8. TABLA: ELEMENTOS DEL CARRITO (CART ITEMS)
-- Soporta el Pase Dual (Comida/Despensa vs Hogar/Bazar) y el Valor Culinario
CREATE TABLE IF NOT EXISTS cart_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cart_id UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
    staple_food_id UUID REFERENCES staple_foods(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    quantity TEXT NOT NULL DEFAULT '1 ud',
    lane cart_lane_type NOT NULL DEFAULT 'fresh_pantry',
    culinary_impact TEXT,
    is_checked BOOLEAN NOT NULL DEFAULT false,
    status cart_item_status_type NOT NULL DEFAULT 'pending',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_cart_items_cart ON cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_status ON cart_items(status);

-- 9. TABLA: DESPENSA VIVA (PANTRY ITEMS)
-- Control binario con frescura implícita automática (sin fechas manuales de caducidad)
CREATE TABLE IF NOT EXISTS pantry_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    staple_food_id UUID REFERENCES staple_foods(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    category food_category_type NOT NULL DEFAULT 'verduras_frutas',
    storage_zone storage_zone_type NOT NULL DEFAULT 'fridge',
    quantity TEXT NOT NULL DEFAULT '1 ud',
    purchased_at DATE NOT NULL DEFAULT CURRENT_DATE,
    estimated_shelf_days INTEGER NOT NULL DEFAULT 7 CHECK (estimated_shelf_days > 0),
    status pantry_status_type NOT NULL DEFAULT 'active',
    last_checkin_at TIMESTAMPTZ,
    origin_cart_item_id UUID REFERENCES cart_items(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_pantry_items_household ON pantry_items(household_id);
CREATE INDEX IF NOT EXISTS idx_pantry_items_status ON pantry_items(status);
CREATE INDEX IF NOT EXISTS idx_pantry_items_zone ON pantry_items(storage_zone);

-- 10. TABLA: RECETAS (RECIPES)
-- Recetario híbrido: Curadas, Creadas por Usuario y Guardadas del Chef IA
CREATE TABLE IF NOT EXISTS recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID REFERENCES households(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    prep_time_minutes INTEGER NOT NULL DEFAULT 20 CHECK (prep_time_minutes > 0),
    servings INTEGER NOT NULL DEFAULT 2 CHECK (servings > 0),
    difficulty TEXT NOT NULL DEFAULT 'Fácil',
    source recipe_source_type NOT NULL DEFAULT 'curated',
    base_diets diet_base_type[] NOT NULL DEFAULT '{omnivore}',
    allergens TEXT[] NOT NULL DEFAULT '{}',
    is_keto BOOLEAN NOT NULL DEFAULT false,
    substitutions JSONB NOT NULL DEFAULT '{}'::jsonb,
    instructions JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_favorite BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_recipes_source ON recipes(source);
CREATE INDEX IF NOT EXISTS idx_recipes_base_diets ON recipes USING GIN(base_diets);
CREATE INDEX IF NOT EXISTS idx_recipes_allergens ON recipes USING GIN(allergens);

-- 11. TABLA: INGREDIENTES DE RECETAS (RECIPE INGREDIENTS)
CREATE TABLE IF NOT EXISTS recipe_ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    staple_food_id UUID REFERENCES staple_foods(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    amount TEXT NOT NULL DEFAULT '1 ud',
    is_optional BOOLEAN NOT NULL DEFAULT false,
    sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe ON recipe_ingredients(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_staple ON recipe_ingredients(staple_food_id);

-- 12. TABLA: ESCÁNER VISUAL Y AUDITORÍAS (VISION SCANS)
-- Registra fotos de encimera (alta masiva) y auditorías de nevera (reconciliación 3 columnas)
CREATE TABLE IF NOT EXISTS vision_scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    scan_type scan_type_enum NOT NULL DEFAULT 'countertop_bulk',
    target_zone storage_zone_type,
    image_storage_path TEXT,
    detected_items JSONB NOT NULL DEFAULT '[]'::jsonb,
    reconciliation_summary JSONB DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'applied', 'discarded')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_vision_scans_household ON vision_scans(household_id);

-- ==============================================================================
-- VISTAS DINÁMICAS INTELIGENTES (PULSO DE COCINA Y BANDEJA 48H)
-- ==============================================================================

-- Vista que calcula la frescura viva y el estado de la Bandeja 48h
CREATE OR REPLACE VIEW view_active_pantry_freshness AS
SELECT 
    p.id,
    p.household_id,
    p.name,
    p.category,
    p.storage_zone,
    p.quantity,
    p.purchased_at,
    p.estimated_shelf_days,
    (CURRENT_DATE - p.purchased_at) AS days_elapsed,
    GREATEST(0, p.estimated_shelf_days - (CURRENT_DATE - p.purchased_at)) AS days_remaining,
    CASE 
        WHEN (p.estimated_shelf_days - (CURRENT_DATE - p.purchased_at)) <= 2 THEN true 
        ELSE false 
    END AS is_priority_48h,
    CASE
        WHEN (p.estimated_shelf_days - (CURRENT_DATE - p.purchased_at)) > (p.estimated_shelf_days * 0.6) THEN 'optimal'
        WHEN (p.estimated_shelf_days - (CURRENT_DATE - p.purchased_at)) > 2 THEN 'medium'
        WHEN (p.estimated_shelf_days - (CURRENT_DATE - p.purchased_at)) >= 0 THEN 'warning'
        ELSE 'depleted'
    END AS freshness_tier,
    p.status
FROM pantry_items p
WHERE p.status = 'active';

-- ==============================================================================
-- FUNCIONES Y TRIGGERS AUTOMÁTICOS
-- ==============================================================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION fn_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc', now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_households_updated ON households;
CREATE TRIGGER tr_households_updated BEFORE UPDATE ON households FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

DROP TRIGGER IF EXISTS tr_dietary_updated ON household_dietary_profiles;
CREATE TRIGGER tr_dietary_updated BEFORE UPDATE ON household_dietary_profiles FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

DROP TRIGGER IF EXISTS tr_carts_updated ON carts;
CREATE TRIGGER tr_carts_updated BEFORE UPDATE ON carts FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

DROP TRIGGER IF EXISTS tr_cart_items_updated ON cart_items;
CREATE TRIGGER tr_cart_items_updated BEFORE UPDATE ON cart_items FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

DROP TRIGGER IF EXISTS tr_pantry_items_updated ON pantry_items;
CREATE TRIGGER tr_pantry_items_updated BEFORE UPDATE ON pantry_items FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

DROP TRIGGER IF EXISTS tr_recipes_updated ON recipes;
CREATE TRIGGER tr_recipes_updated BEFORE UPDATE ON recipes FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

-- ==============================================================================
-- POLÍTICAS DE SEGURIDAD (ROW LEVEL SECURITY - RLS)
-- ==============================================================================
ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_dietary_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE staple_foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE pantry_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE vision_scans ENABLE ROW LEVEL SECURITY;

-- Catálogo maestro público de lectura
CREATE POLICY "Staple foods son legibles por todos los usuarios" ON staple_foods FOR SELECT USING (true);

-- Recetas curadas legibles por todos; recetas de usuario legibles por su hogar
CREATE POLICY "Recetas legibles por hogar o curadas" ON recipes FOR SELECT 
USING (source = 'curated' OR household_id IS NOT NULL);

-- ==============================================================================
-- HABILITACIÓN DE SUPABASE REALTIME
-- ==============================================================================
-- Permite que los carritos y la despensa se sincronicen al instante entre miembros
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE carts;
    ALTER PUBLICATION supabase_realtime ADD TABLE cart_items;
    ALTER PUBLICATION supabase_realtime ADD TABLE pantry_items;
    ALTER PUBLICATION supabase_realtime ADD TABLE household_dietary_profiles;
EXCEPTION WHEN undefined_object THEN NULL; END $$;
