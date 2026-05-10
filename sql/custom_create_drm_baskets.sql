-- =============================================================
-- Création des bannettes pour DIRECTION RECHERCHE MINIERE (DRM)
-- Réplique toutes les bannettes DCM en les adaptant pour DRM
-- =============================================================
-- UTILISATION :
--   1) DIAGNOSTIC SEUL   : exécuter uniquement les requêtes SELECT ci-dessous
--   2) EXÉCUTION COMPLÈTE : exécuter tout le fichier
-- =============================================================

-- -------------------------------------------------------
-- DIAGNOSTIC : Lancer d'abord ces requêtes pour vérifier
-- -------------------------------------------------------

-- A) Bannettes DCM existantes qui seront répliquées pour DRM :
/*
SELECT basket_id, basket_name, basket_desc
FROM baskets
WHERE basket_id LIKE '%DCM%'
ORDER BY basket_order;
*/

-- B) Groupes existants contenant 'DCM' et leur équivalent DRM potentiel :
/*
SELECT
    group_id                         AS groupe_DCM,
    REPLACE(group_id, 'DCM', 'DRM') AS groupe_DRM_a_creer,
    EXISTS (
        SELECT 1 FROM usergroups ug2
        WHERE ug2.group_id = REPLACE(group_id, 'DCM', 'DRM')
    ) AS groupe_DRM_existe
FROM usergroups
WHERE group_id LIKE '%DCM%';
*/

-- C) Vérifier que l'entité DRM existe :
/*
SELECT entity_id, entity_label, short_label
FROM entities
WHERE entity_id = 'DRM';
*/

-- -------------------------------------------------------
-- EXÉCUTION
-- -------------------------------------------------------

BEGIN;

-- -------------------------------------------------------
-- ETAPE 1 : Créer les bannettes DRM depuis les modèles DCM
-- -------------------------------------------------------
-- Pour chaque bannette DCM trouvée, on crée son équivalent DRM
-- en remplaçant 'DCM' par 'DRM' dans l'ID, le nom, la description et la clause

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
    REPLACE(b.basket_id,    'DCM', 'DRM')           AS basket_id,
    REPLACE(b.basket_name,  'DCM', 'DRM')           AS basket_name,
    REPLACE(b.basket_desc,  'DCM', 'DRM')           AS basket_desc,
    REPLACE(b.basket_clause, '''DCM''', '''DRM''')  AS basket_clause,
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
-- ETAPE 2 : Attacher les bannettes DRM aux groupes DRM
-- -------------------------------------------------------
-- Copie la configuration d'affichage des groupes DCM vers les groupes DRM

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
-- ETAPE 3 : Copier les actions sur les bannettes DRM
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
-- ETAPE 4 : Activer les bannettes pour les utilisateurs DRM
-- -------------------------------------------------------
-- Pour chaque utilisateur dont l'entité primaire est DRM
-- et appartenant à un groupe DRM, on active les nouvelles bannettes

INSERT INTO users_baskets_preferences (
    user_serial_id,
    group_serial_id,
    basket_id,
    display,
    color
)
SELECT DISTINCT
    u.id        AS user_serial_id,
    ug.id       AS group_serial_id,
    REPLACE(ubp.basket_id, 'DCM', 'DRM') AS basket_id,
    ubp.display,
    ubp.color
FROM users u
JOIN users_entities ue
    ON ue.user_id = u.id
    AND ue.entity_id = 'DRM'
    AND ue.primary_entity = 'Y'
JOIN usergroup_content ugc
    ON ugc.user_id = u.id
JOIN usergroups ug
    ON ug.id = ugc.group_id
    AND ug.group_id LIKE '%DRM%'
JOIN users_baskets_preferences ubp
    ON ubp.basket_id LIKE '%DCM%'
    AND ubp.group_serial_id = (
        SELECT ug2.id FROM usergroups ug2
        WHERE ug2.group_id = REPLACE(ug.group_id, 'DRM', 'DCM')
        LIMIT 1
    )
WHERE NOT EXISTS (
    SELECT 1 FROM users_baskets_preferences x
    WHERE x.user_serial_id  = u.id
      AND x.group_serial_id = ug.id
      AND x.basket_id       = REPLACE(ubp.basket_id, 'DCM', 'DRM')
);

-- -------------------------------------------------------
-- ETAPE 5 : Résultat — bannettes créées pour DRM
-- -------------------------------------------------------
SELECT
    basket_id,
    basket_name,
    basket_desc,
    LEFT(basket_clause, 100) AS clause_preview
FROM baskets
WHERE basket_id LIKE '%DRM%'
ORDER BY basket_order;

COMMIT;
