BEGIN;

INSERT INTO groupbasket (group_id, basket_id, list_display, list_event, list_event_data)
SELECT
    'SERVICE',
    'ANAMOutboxExt',
    gb.list_display,
    gb.list_event,
    gb.list_event_data
FROM groupbasket gb
WHERE gb.group_id = 'RESPONSABLE'
  AND gb.basket_id = 'ANAMOutboxExt'
ON CONFLICT (group_id, basket_id) DO UPDATE
SET list_display = EXCLUDED.list_display,
    list_event = EXCLUDED.list_event,
    list_event_data = EXCLUDED.list_event_data;

INSERT INTO actions_groupbaskets (
    id_action, where_clause, group_id, basket_id, used_in_basketlist, used_in_action_page, default_action_list
)
SELECT
    agb.id_action,
    agb.where_clause,
    'SERVICE',
    'ANAMOutboxExt',
    agb.used_in_basketlist,
    agb.used_in_action_page,
    agb.default_action_list
FROM actions_groupbaskets agb
WHERE agb.group_id = 'RESPONSABLE'
  AND agb.basket_id = 'ANAMOutboxExt'
ON CONFLICT (id_action, group_id, basket_id) DO NOTHING;

INSERT INTO users_baskets_preferences (id, user_serial_id, group_serial_id, basket_id, display, color)
SELECT
    nextval('users_baskets_preferences_id_seq'),
    ubp.user_serial_id,
    ubp.group_serial_id,
    'ANAMOutboxExt',
    ubp.display,
    ubp.color
FROM users_baskets_preferences ubp
JOIN usergroups ug
    ON ug.id = ubp.group_serial_id
WHERE ug.group_id = 'SERVICE'
  AND ubp.basket_id = 'SentMails'
  AND NOT EXISTS (
      SELECT 1
      FROM users_baskets_preferences existing
      WHERE existing.user_serial_id = ubp.user_serial_id
        AND existing.group_serial_id = ubp.group_serial_id
        AND existing.basket_id = 'ANAMOutboxExt'
  );

COMMIT;
