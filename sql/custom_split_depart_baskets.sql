BEGIN;

-- 1) Create "Depart interne" basket if missing
INSERT INTO baskets (
    coll_id, basket_id, basket_name, basket_desc, basket_clause,
    is_visible, enabled, basket_order, color, basket_res_order, flag_notif
)
SELECT
    'letterbox_coll',
    'DepartInterneBasket',
    'Depart interne',
    'Courriers depart envoyes uniquement en interne',
    'status = ''EENV''
     and dest_user = @user_id
     and category_id = ''outgoing''
     and exists (
         select 1
         from resource_contacts rc
         where rc.res_id = res_id
           and rc.mode = ''recipient''
           and rc.type in (''entity'', ''user'')
     )
     and not exists (
         select 1
         from resource_contacts rc
         where rc.res_id = res_id
           and rc.mode = ''recipient''
           and rc.type = ''contact''
     )',
    'Y',
    'Y',
    COALESCE((SELECT MAX(basket_order) + 1 FROM baskets), 1),
    NULL,
    'res_id desc',
    'N'
WHERE NOT EXISTS (
    SELECT 1 FROM baskets WHERE basket_id = 'DepartInterneBasket'
);

-- 2) Create "Depart externe" basket if missing
INSERT INTO baskets (
    coll_id, basket_id, basket_name, basket_desc, basket_clause,
    is_visible, enabled, basket_order, color, basket_res_order, flag_notif
)
SELECT
    'letterbox_coll',
    'DepartExterneBasket',
    'Depart externe',
    'Courriers depart envoyes a l''exterieur',
    'status = ''EENV''
     and dest_user = @user_id
     and category_id = ''outgoing''
     and exists (
         select 1
         from resource_contacts rc
         where rc.res_id = res_id
           and rc.mode = ''recipient''
           and rc.type = ''contact''
     )',
    'Y',
    'Y',
    COALESCE((SELECT MAX(basket_order) + 1 FROM baskets), 1),
    NULL,
    'res_id desc',
    'N'
WHERE NOT EXISTS (
    SELECT 1 FROM baskets WHERE basket_id = 'DepartExterneBasket'
);

-- 3) Internal basket: attach to every group that already has EenvBasket
INSERT INTO groupbasket (group_id, basket_id, list_display, list_event, list_event_data)
SELECT
    gb.group_id,
    'DepartInterneBasket',
    gb.list_display,
    gb.list_event,
    gb.list_event_data
FROM groupbasket gb
WHERE gb.basket_id = 'EenvBasket'
ON CONFLICT (group_id, basket_id) DO UPDATE
SET list_display = EXCLUDED.list_display,
    list_event = EXCLUDED.list_event,
    list_event_data = EXCLUDED.list_event_data;

-- 4) External basket: attach only to groups of Houria
WITH houria_groups AS (
    SELECT DISTINCT ug.group_id
    FROM users u
    JOIN usergroup_content ugc ON ugc.user_id = u.id
    JOIN usergroups ug ON ug.id = ugc.group_id
    WHERE LOWER(u.user_id) = 'houria'
       OR LOWER(COALESCE(u.firstname, '')) LIKE '%houria%'
       OR LOWER(COALESCE(u.lastname, '')) LIKE '%houria%'
),
source_groupbasket AS (
    SELECT gb.group_id, gb.list_display, gb.list_event, gb.list_event_data
    FROM groupbasket gb
    WHERE gb.basket_id = 'EenvBasket'
)
INSERT INTO groupbasket (group_id, basket_id, list_display, list_event, list_event_data)
SELECT
    sgb.group_id,
    'DepartExterneBasket',
    sgb.list_display,
    sgb.list_event,
    sgb.list_event_data
FROM source_groupbasket sgb
WHERE sgb.group_id IN (SELECT group_id FROM houria_groups)
ON CONFLICT (group_id, basket_id) DO UPDATE
SET list_display = EXCLUDED.list_display,
    list_event = EXCLUDED.list_event,
    list_event_data = EXCLUDED.list_event_data;

-- 5) Internal basket actions: copy from EenvBasket for all groups
INSERT INTO actions_groupbaskets (
    id_action, where_clause, group_id, basket_id, used_in_basketlist, used_in_action_page, default_action_list
)
SELECT
    agb.id_action,
    agb.where_clause,
    agb.group_id,
    'DepartInterneBasket',
    agb.used_in_basketlist,
    agb.used_in_action_page,
    agb.default_action_list
FROM actions_groupbaskets agb
WHERE agb.basket_id = 'EenvBasket'
ON CONFLICT (id_action, group_id, basket_id) DO NOTHING;

-- 6) External basket actions: copy from EenvBasket but only on Houria groups
WITH houria_groups AS (
    SELECT DISTINCT ug.group_id
    FROM users u
    JOIN usergroup_content ugc ON ugc.user_id = u.id
    JOIN usergroups ug ON ug.id = ugc.group_id
    WHERE LOWER(u.user_id) = 'houria'
       OR LOWER(COALESCE(u.firstname, '')) LIKE '%houria%'
       OR LOWER(COALESCE(u.lastname, '')) LIKE '%houria%'
)
INSERT INTO actions_groupbaskets (
    id_action, where_clause, group_id, basket_id, used_in_basketlist, used_in_action_page, default_action_list
)
SELECT
    agb.id_action,
    agb.where_clause,
    agb.group_id,
    'DepartExterneBasket',
    agb.used_in_basketlist,
    agb.used_in_action_page,
    agb.default_action_list
FROM actions_groupbaskets agb
WHERE agb.basket_id = 'EenvBasket'
  AND agb.group_id IN (SELECT group_id FROM houria_groups)
ON CONFLICT (id_action, group_id, basket_id) DO NOTHING;

COMMIT;
