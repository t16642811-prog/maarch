-- =============================================================
-- DIRECTION RECHERCHE MINIERE (DRM)
-- Création complète : Groupes + Bannettes
-- Modèle : groupes et bannettes DCM (Secrétaire DCM / Chef DCM)
-- =============================================================
-- ORDRE D'EXÉCUTION :
--   Étape 1 : Créer les groupes DRM (Secrétaire DRM, Chef DRM)
--   Étape 2 : Copier les privilèges DCM → DRM
--   Étape 3 : Créer les 4 bannettes DRM
--   Étape 4 : Attacher les bannettes aux groupes DRM
--   Étape 5 : Copier les actions DCM → DRM
-- =============================================================

BEGIN;

-- -------------------------------------------------------
-- ÉTAPE 1 : Créer les groupes DRM depuis les groupes DCM
-- -------------------------------------------------------
-- Crée "Secrétaire DRM", "Chef DRM", etc.
-- en copiant exactement les paramètres des groupes DCM

INSERT INTO usergroups (
    group_id,
    group_desc,
    can_index,
    indexation_parameters,
    external_id
)
SELECT
    REPLACE(ug.group_id,   'DCM', 'DRM') AS group_id,
    REPLACE(ug.group_desc, 'DCM', 'DRM') AS group_desc,
    ug.can_index,
    ug.indexation_parameters,
    ug.external_id
FROM usergroups ug
WHERE ug.group_id LIKE '%DCM%'
  AND NOT EXISTS (
      SELECT 1 FROM usergroups x
      WHERE x.group_id = REPLACE(ug.group_id, 'DCM', 'DRM')
  );

-- -------------------------------------------------------
-- ÉTAPE 2 : Copier les privilèges (services) DCM → DRM
-- -------------------------------------------------------
-- Copie toutes les permissions des groupes DCM vers les groupes DRM

INSERT INTO usergroups_services (
    group_id,
    service_id,
    parameters
)
SELECT
    REPLACE(us.group_id, 'DCM', 'DRM') AS group_id,
    us.service_id,
    us.parameters
FROM usergroups_services us
WHERE us.group_id LIKE '%DCM%'
  AND NOT EXISTS (
      SELECT 1 FROM usergroups_services x
      WHERE x.group_id   = REPLACE(us.group_id, 'DCM', 'DRM')
        AND x.service_id = us.service_id
  );

-- -------------------------------------------------------
-- ÉTAPE 3 : Créer les 4 bannettes DRM depuis les DCM
-- -------------------------------------------------------
-- Remplace 'DCM' → 'DRM' dans l'identifiant, le nom,
-- la description et la clause de filtrage

INSERT INTO baskets (
    coll_id,
    basket_id,
    basket_name,
    basket_desc,
    basket_clause,
    is_visible,
    enabled,
    basket_order,
    color,
    basket_res_order,
    flag_notif
)
SELECT
    b.coll_id,
    REPLACE(b.basket_id,    'DCM', 'DRM')          AS basket_id,
    REPLACE(b.basket_name,  'DCM', 'DRM')          AS basket_name,
    REPLACE(b.basket_desc,  'DCM', 'DRM')          AS basket_desc,
    REPLACE(b.basket_clause, '''DCM''', '''DRM''') AS basket_clause,
    b.is_visible,
    b.enabled,
    b.basket_order + 100,
    b.color,
    b.basket_res_order,
    b.flag_notif
FROM baskets b
WHERE b.basket_id LIKE '%DCM%'
  AND NOT EXISTS (
      SELECT 1 FROM baskets x
      WHERE x.basket_id = REPLACE(b.basket_id, 'DCM', 'DRM')
  );

-- -------------------------------------------------------
-- ÉTAPE 4 : Attacher les bannettes aux groupes DRM
-- -------------------------------------------------------

INSERT INTO groupbasket (
    group_id,
    basket_id,
    list_display,
    list_event,
    list_event_data
)
SELECT
    REPLACE(gb.group_id,  'DCM', 'DRM') AS group_id,
    REPLACE(gb.basket_id, 'DCM', 'DRM') AS basket_id,
    gb.list_display,
    gb.list_event,
    gb.list_event_data
FROM groupbasket gb
WHERE gb.basket_id LIKE '%DCM%'
  AND EXISTS (
      SELECT 1 FROM usergroups ug
      WHERE ug.group_id = REPLACE(gb.group_id, 'DCM', 'DRM')
  )
  AND NOT EXISTS (
      SELECT 1 FROM groupbasket x
      WHERE x.group_id  = REPLACE(gb.group_id,  'DCM', 'DRM')
        AND x.basket_id = REPLACE(gb.basket_id, 'DCM', 'DRM')
  );

-- -------------------------------------------------------
-- ÉTAPE 5 : Copier les actions DCM → bannettes DRM
-- -------------------------------------------------------

INSERT INTO actions_groupbaskets (
    id_action,
    where_clause,
    group_id,
    basket_id,
    used_in_basketlist,
    used_in_action_page,
    default_action_list
)
SELECT
    agb.id_action,
    agb.where_clause,
    REPLACE(agb.group_id,  'DCM', 'DRM') AS group_id,
    REPLACE(agb.basket_id, 'DCM', 'DRM') AS basket_id,
    agb.used_in_basketlist,
    agb.used_in_action_page,
    agb.default_action_list
FROM actions_groupbaskets agb
WHERE agb.basket_id LIKE '%DCM%'
  AND EXISTS (
      SELECT 1 FROM usergroups ug
      WHERE ug.group_id = REPLACE(agb.group_id, 'DCM', 'DRM')
  )
  AND NOT EXISTS (
      SELECT 1 FROM actions_groupbaskets x
      WHERE x.id_action  = agb.id_action
        AND x.group_id   = REPLACE(agb.group_id,  'DCM', 'DRM')
        AND x.basket_id  = REPLACE(agb.basket_id, 'DCM', 'DRM')
  );

-- -------------------------------------------------------
-- RÉSULTAT : Afficher ce qui a été créé
-- -------------------------------------------------------
SELECT '=== GROUPES DRM CRÉÉS ===' AS info;
SELECT group_id, group_desc, can_index
FROM usergroups
WHERE group_id LIKE '%DRM%'
ORDER BY group_id;

SELECT '=== BANNETTES DRM CRÉÉES ===' AS info;
SELECT
    basket_id,
    basket_name,
    basket_desc,
    LEFT(basket_clause, 80) AS clause_preview
FROM baskets
WHERE basket_id LIKE '%DRM%'
ORDER BY basket_order;

SELECT '=== ASSOCIATIONS GROUPE ↔ BANNETTE ===' AS info;
SELECT gb.group_id, gb.basket_id
FROM groupbasket gb
WHERE gb.basket_id LIKE '%DRM%'
ORDER BY gb.group_id, gb.basket_id;

COMMIT;
