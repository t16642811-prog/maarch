BEGIN;

INSERT INTO baskets (
    coll_id, basket_id, basket_name, basket_desc, basket_clause,
    is_visible, enabled, basket_order, color, basket_res_order, flag_notif
)
SELECT
    source.coll_id,
    'ANAMOutboxInt',
    'Départs ANAM internes',
    'Courriers enregistrés avec le modèle de départ interne ANAM',
    '((custom_fields ->> ''_anamOutgoingModelId'') = ''12'' or model_id = 12)
     and initiator in (@all_entities)
     and status in (''NEW'',''COU'',''STDBY'',''ENVDONE'')',
    source.is_visible,
    source.enabled,
    COALESCE(source.basket_order + 1, 1),
    source.color,
    source.basket_res_order,
    source.flag_notif
FROM baskets source
WHERE source.basket_id = 'ANAMOutboxExt'
  AND NOT EXISTS (
      SELECT 1 FROM baskets existing WHERE existing.basket_id = 'ANAMOutboxInt'
  );

UPDATE baskets
SET basket_clause = '((custom_fields ->> ''_anamOutgoingModelId'') = ''13'' or model_id = 13)
and initiator in (@all_entities)
and status in (''NEW'',''COU'',''STDBY'',''ENVDONE'')'
WHERE basket_id = 'ANAMOutboxExt';

INSERT INTO groupbasket (group_id, basket_id, list_display, list_event, list_event_data)
SELECT
    gb.group_id,
    'ANAMOutboxInt',
    gb.list_display,
    gb.list_event,
    gb.list_event_data
FROM groupbasket gb
WHERE gb.basket_id = 'ANAMOutboxExt'
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
    agb.group_id,
    'ANAMOutboxInt',
    agb.used_in_basketlist,
    agb.used_in_action_page,
    agb.default_action_list
FROM actions_groupbaskets agb
WHERE agb.basket_id = 'ANAMOutboxExt'
ON CONFLICT (id_action, group_id, basket_id) DO NOTHING;

INSERT INTO users_baskets_preferences (id, user_serial_id, group_serial_id, basket_id, display, color)
SELECT
    nextval('users_baskets_preferences_id_seq'),
    ubp.user_serial_id,
    ubp.group_serial_id,
    'ANAMOutboxInt',
    ubp.display,
    ubp.color
FROM users_baskets_preferences ubp
WHERE ubp.basket_id = 'ANAMOutboxExt'
  AND NOT EXISTS (
      SELECT 1
      FROM users_baskets_preferences existing
      WHERE existing.user_serial_id = ubp.user_serial_id
        AND existing.group_serial_id = ubp.group_serial_id
        AND existing.basket_id = 'ANAMOutboxInt'
  );

COMMIT;
