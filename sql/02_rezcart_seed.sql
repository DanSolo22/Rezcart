-- ==============================================================================
-- REZCART: DATOS SEMILLA OFICIALES (FASE 3 - SEED CATALOG)
-- ==============================================================================
-- Incluye: Alimentos básicos con frescura implícita, recetas curadas del Atelier
-- y configuración inicial del hogar.
-- ==============================================================================

-- 1. HOGAR POR DEFECTO
INSERT INTO households (id, name)
VALUES ('00000000-0000-0000-0000-000000000001', 'Atelier Hogar Principal')
ON CONFLICT (id) DO NOTHING;

-- 2. DIRECTIVA DIETÉTICA ACTIVA
INSERT INTO household_dietary_profiles (household_id, base_diet, restrictions, default_servings, notes)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'omnivore',
    ARRAY['sin_lactosa'],
    2,
    'Perfil inicial Atelier: Base omnívora con precaución sin lactosa'
)
ON CONFLICT (household_id) DO NOTHING;

-- 3. CATÁLOGO MAESTRO DE ALIMENTOS BÁSICOS (STAPLE FOODS)
INSERT INTO staple_foods (canonical_name, category, default_zone, estimated_shelf_days, compatible_bases, allergens, is_keto, synonyms, quick_staple)
VALUES
    ('Pechuga de Pollo', 'carnes_aves', 'fridge', 4, '{omnivore,carnivore}', '{}', true, '{"pechuga", "pollo", "pechugas", "filetes de pollo"}', true),
    ('Huevos Camperos', 'lacteos_huevos', 'fridge', 18, '{omnivore,vegetarian}', '{"huevo"}', true, '{"huevos", "docena huevos", "huevos camperos"}', true),
    ('Aguacates', 'verduras_frutas', 'fruit_bowl', 5, '{omnivore,vegetarian,vegan}', '{}', true, '{"aguacate", "palta"}', true),
    ('Espaguetis', 'despensa_conservas', 'pantry', 365, '{omnivore,vegetarian,vegan}', '{"gluten"}', false, '{"pasta", "espagueti", "macarrones"}', true),
    ('Leche Desnatada', 'lacteos_huevos', 'fridge', 6, '{omnivore,vegetarian}', '{"lactosa"}', false, '{"leche", "brick leche", "leche vaca"}', true),
    ('Dientes de Ajo', 'verduras_frutas', 'pantry', 30, '{omnivore,vegetarian,vegan,carnivore}', '{}', true, '{"ajo", "cabeza de ajo"}', false),
    ('Aceite de Oliva Virgen Extra', 'despensa_conservas', 'pantry', 365, '{omnivore,vegetarian,vegan,carnivore}', '{}', true, '{"aove", "aceite", "aceite oliva"}', false),
    ('Espinacas Baby', 'verduras_frutas', 'fridge', 5, '{omnivore,vegetarian,vegan}', '{}', true, '{"espinacas", "bolsa espinacas"}', false),
    ('Queso Parmesano', 'lacteos_huevos', 'fridge', 25, '{omnivore,vegetarian}', '{"lactosa"}', true, '{"parmesano", "grana padano"}', false),
    ('Tomate Frito', 'despensa_conservas', 'pantry', 180, '{omnivore,vegetarian,vegan}', '{}', false, '{"tomate", "bote tomate"}', false),
    ('Entrecot de Ternera', 'carnes_aves', 'fridge', 4, '{omnivore,carnivore}', '{}', true, '{"entrecot", "ternera", "filete ternera"}', false)
ON CONFLICT (canonical_name) DO NOTHING;

-- 4. RECETAS CURADAS OFICIALES DEL RECETARIO
INSERT INTO recipes (id, title, description, prep_time_minutes, servings, difficulty, source, base_diets, allergens, is_keto, substitutions, instructions, is_favorite)
VALUES
    (
        '10000000-0000-0000-0000-000000000001',
        'Pollo al Ajillo Tradicional',
        'Un clásico de cazuela con ajo dorado en aceite de oliva virgen extra y reducción lenta.',
        25,
        2,
        'Fácil',
        'curated',
        '{omnivore,carnivore}',
        '{}',
        true,
        '{}'::jsonb,
        '["Cortar la pechuga en dados medianos.", "Dorar los dientes de ajo laminados a fuego suave.", "Subir el fuego y dorar el pollo hasta sellar.", "Bajar fuego y cocinar 10 minutos con una pizca de sal y pimienta."]'::jsonb,
        true
    ),
    (
        '10000000-0000-0000-0000-000000000002',
        'Espaguetis al Parmesano y Ajo',
        'Pasta al dente salteada con ajo en láminas, AOVE y lluvia de queso parmesano.',
        15,
        2,
        'Fácil',
        'curated',
        '{omnivore,vegetarian}',
        '{"gluten","lactosa"}',
        false,
        '{"gluten": "Usa espaguetis de maíz o harina de arroz sin gluten", "lactosa": "Sustituye por Parmesano curado 24m sin lactosa o levadura nutricional"}'::jsonb,
        '["Hervir los espaguetis en abundante agua con sal durante 9 minutos.", "Laminar el ajo y dorarlo a fuego muy bajo en AOVE.", "Escurrir la pasta reservando dos cucharadas de agua de cocción.", "Mezclar la pasta con el ajo y mantecar con el parmesano rallado."]'::jsonb,
        false
    ),
    (
        '10000000-0000-0000-0000-000000000003',
        'Revuelto Campestre con Pollo',
        'Plato rápido y rico en proteínas, aprovechando pechuga fresca y huevos camperos.',
        12,
        1,
        'Fácil',
        'curated',
        '{omnivore,carnivore}',
        '{"huevo"}',
        true,
        '{}'::jsonb,
        '["Saltear las tiras de pechuga en una sartén con AOVE.", "Batir ligeramente los huevos camperos.", "Verter los huevos y cuajar a fuego suave removiendo con espátula."]'::jsonb,
        false
    ),
    (
        '10000000-0000-0000-0000-000000000004',
        'Salteado Verde de Espinacas y Ajo',
        'Salteado rápido de espinacas baby al wok con ajo laminado y toque crujiente.',
        8,
        2,
        'Fácil',
        'curated',
        '{omnivore,vegetarian,vegan}',
        '{}',
        true,
        '{}'::jsonb,
        '["Dorar el ajo en AOVE a fuego medio.", "Añadir las espinacas baby en dos tandas hasta que reduzcan.", "Sazonar al punto de sal y servir de inmediato."]'::jsonb,
        false
    ),
    (
        '10000000-0000-0000-0000-000000000005',
        'Entrecot a la Plancha con Ajo Confitado',
        'Carne de ternera sellada al punto en plancha de hierro fundido con dientes de ajo enteros.',
        10,
        1,
        'Fácil',
        'curated',
        '{omnivore,carnivore}',
        '{}',
        true,
        '{}'::jsonb,
        '["Atemperar la carne 30 minutos antes.", "Calentar la plancha a máxima potencia.", "Sellar 2 minutos por lado con los ajos en la sartén.", "Dejar reposar 2 minutos y añadir sal en escamas."]'::jsonb,
        false
    )
ON CONFLICT (id) DO NOTHING;

-- 5. ASOCIACIÓN DE INGREDIENTES A LAS RECETAS
INSERT INTO recipe_ingredients (recipe_id, name, amount)
SELECT id, 'Pechuga de Pollo', '400g' FROM recipes WHERE title = 'Pollo al Ajillo Tradicional' UNION ALL
SELECT id, 'Dientes de Ajo', '4 uds' FROM recipes WHERE title = 'Pollo al Ajillo Tradicional' UNION ALL
SELECT id, 'Aceite de Oliva Virgen Extra', '30ml' FROM recipes WHERE title = 'Pollo al Ajillo Tradicional' UNION ALL
SELECT id, 'Espaguetis', '200g' FROM recipes WHERE title = 'Espaguetis al Parmesano y Ajo' UNION ALL
SELECT id, 'Queso Parmesano', '40g' FROM recipes WHERE title = 'Espaguetis al Parmesano y Ajo' UNION ALL
SELECT id, 'Dientes de Ajo', '2 uds' FROM recipes WHERE title = 'Espaguetis al Parmesano y Ajo' UNION ALL
SELECT id, 'Aceite de Oliva Virgen Extra', '20ml' FROM recipes WHERE title = 'Espaguetis al Parmesano y Ajo' UNION ALL
SELECT id, 'Huevos Camperos', '2 uds' FROM recipes WHERE title = 'Revuelto Campestre con Pollo' UNION ALL
SELECT id, 'Pechuga de Pollo', '150g' FROM recipes WHERE title = 'Revuelto Campestre con Pollo' UNION ALL
SELECT id, 'Espinacas Baby', '200g' FROM recipes WHERE title = 'Salteado Verde de Espinacas y Ajo' UNION ALL
SELECT id, 'Dientes de Ajo', '2 uds' FROM recipes WHERE title = 'Salteado Verde de Espinacas y Ajo' UNION ALL
SELECT id, 'Entrecot de Ternera', '300g' FROM recipes WHERE title = 'Entrecot a la Plancha con Ajo Confitado' UNION ALL
SELECT id, 'Dientes de Ajo', '3 uds' FROM recipes WHERE title = 'Entrecot a la Plancha con Ajo Confitado';
