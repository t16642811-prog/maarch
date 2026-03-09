BEGIN;

-- Create a dedicated group for Houria if missing
INSERT INTO usergroups (group_id, group_desc, can_index)
SELECT 'HOURIA_EXTERNE', 'Groupe dedie a Houria pour la bannette Depart externe', FALSE
WHERE NOT EXISTS (
    SELECT 1 FROM usergroups WHERE group_id = 'HOURIA_EXTERNE'
);

-- Attach all "Houria" users to this dedicated group
INSERT INTO usergroup_content (user_id, group_id, role)
SELECT
    u.id,
    ug_externe.id,
    'USER'
FROM users u
JOIN usergroups ug_externe ON ug_externe.group_id = 'HOURIA_EXTERNE'
WHERE LOWER(u.user_id) = 'houria'
   OR LOWER(COALESCE(u.firstname, '')) LIKE '%houria%'
   OR LOWER(COALESCE(u.lastname, '')) LIKE '%houria%'
ON CONFLICT (user_id, group_id) DO NOTHING;

-- Remove external basket links from every other group
DELETE FROM actions_groupbaskets
WHERE basket_id = 'DepartExterneBasket'
  AND group_id <> 'HOURIA_EXTERNE';

DELETE FROM groupbasket
WHERE basket_id = 'DepartExterneBasket'
  AND group_id <> 'HOURIA_EXTERNE';

-- Recreate external basket display settings for HOURIA_EXTERNE
INSERT INTO groupbasket (group_id, basket_id, list_display, list_event, list_event_data)
SELECT
    'HOURIA_EXTERNE',
    'DepartExterneBasket',
    gb.list_display,
    gb.list_event,
    gb.list_event_data
FROM groupbasket gb
WHERE gb.basket_id = 'EenvBasket'
ORDER BY CASE WHEN gb.group_id = 'RESPONSABLE' THEN 0 ELSE 1 END, gb.group_id
LIMIT 1
ON CONFLICT (group_id, basket_id) DO UPDATE
SET list_display = EXCLUDED.list_display,
    list_event = EXCLUDED.list_event,
    list_event_data = EXCLUDED.list_event_data;

-- Recreate external basket actions for HOURIA_EXTERNE from EenvBasket model
INSERT INTO actions_groupbaskets (
    id_action, where_clause, group_id, basket_id, used_in_basketlist, used_in_action_page, default_action_list
)
SELECT
    agb.id_action,
    agb.where_clause,
    'HOURIA_EXTERNE',
    'DepartExterneBasket',
    agb.used_in_basketlist,
    agb.used_in_action_page,
    agb.default_action_list
FROM actions_groupbaskets agb
WHERE agb.basket_id = 'EenvBasket'
  AND agb.group_id = (
      SELECT gb.group_id
      FROM groupbasket gb
      WHERE gb.basket_id = 'EenvBasket'
      ORDER BY CASE WHEN gb.group_id = 'RESPONSABLE' THEN 0 ELSE 1 END, gb.group_id
      LIMIT 1
  )
ON CONFLICT (id_action, group_id, basket_id) DO NOTHING;

COMMIT;
