-- 1. Chef de service: bannette initiale apres attribution par Houria
UPDATE baskets
SET basket_clause = 'dest_user = @user_id
and coalesce(custom_fields -> ''_anamWorkflow'' ->> ''step'', '''') = ''service_processing''
and status in (''NEW'',''COU'',''STDBY'',''ENVDONE'')'
WHERE basket_id = 'IT_FROM_PCD';

-- 2. Utilisateur du service: nouvelle bannette dediee
INSERT INTO baskets (
    id, coll_id, basket_id, basket_name, basket_desc, basket_clause,
    is_visible, enabled, basket_order, color, basket_res_order, flag_notif
)
SELECT
    47,
    'letterbox_coll',
    'ServiceIncomingBasket',
    'Courrier arrivee service',
    'Courriers attribues a un utilisateur du service',
    'dest_user = @user_id
and coalesce(custom_fields -> ''_anamWorkflow'' ->> ''step'', '''') = ''user_processing''
and status in (''NEW'',''COU'',''STDBY'',''ENVDONE'')',
    'Y',
    'Y',
    null,
    null,
    'res_id desc',
    null
WHERE NOT EXISTS (
    SELECT 1 FROM baskets WHERE basket_id = 'ServiceIncomingBasket'
);

-- 3. Chef de service: bannette de validation
UPDATE baskets
SET basket_clause = '(status = ''VAL'')
or (
    dest_user = @user_id
    and coalesce(custom_fields -> ''_anamWorkflow'' ->> ''step'', '''') = ''manager_validation''
    and status in (''NEW'',''COU'',''STDBY'',''ENVDONE'')
)'
WHERE basket_id = 'ValidationBasket';

-- 4. Affichage des nouvelles bannettes
INSERT INTO groupbasket (id, group_id, basket_id, list_display, list_event, list_event_data)
SELECT
    69,
    'RESPONSABLE',
    'IT_FROM_PCD',
    gb.list_display,
    gb.list_event,
    gb.list_event_data
FROM groupbasket gb
WHERE gb.group_id = 'SERVICE'
  AND gb.basket_id = 'IT_FROM_PCD'
  AND NOT EXISTS (
      SELECT 1 FROM groupbasket existing
      WHERE existing.group_id = 'RESPONSABLE'
        AND existing.basket_id = 'IT_FROM_PCD'
  );

INSERT INTO groupbasket (id, group_id, basket_id, list_display, list_event, list_event_data)
SELECT
    70,
    'SERVICE',
    'ServiceIncomingBasket',
    gb.list_display,
    gb.list_event,
    gb.list_event_data
FROM groupbasket gb
WHERE gb.group_id = 'SERVICE'
  AND gb.basket_id = 'IT_FROM_PCD'
  AND NOT EXISTS (
      SELECT 1 FROM groupbasket existing
      WHERE existing.group_id = 'SERVICE'
        AND existing.basket_id = 'ServiceIncomingBasket'
  );

INSERT INTO groupbasket (id, group_id, basket_id, list_display, list_event, list_event_data)
SELECT
    71,
    'RESPONSABLE',
    'ValidationBasket',
    gb.list_display,
    'processDocument',
    '{"defaultTab": "dashboard", "canUpdateData": false, "canGoToNextRes": false, "canUpdateModel": false}'
FROM groupbasket gb
WHERE gb.group_id = 'SERVICE'
  AND gb.basket_id = 'IT_FROM_PCD'
  AND NOT EXISTS (
      SELECT 1 FROM groupbasket existing
      WHERE existing.group_id = 'RESPONSABLE'
        AND existing.basket_id = 'ValidationBasket'
  );

-- 5. Actions chef de service sur la bannette initiale
DELETE FROM actions_groupbaskets
WHERE basket_id = 'IT_FROM_PCD'
  AND group_id = 'SERVICE';

INSERT INTO actions_groupbaskets (id_action, where_clause, group_id, basket_id, used_in_basketlist, used_in_action_page, default_action_list)
SELECT v.id_action, v.where_clause, v.group_id, v.basket_id, v.used_in_basketlist, v.used_in_action_page, v.default_action_list
FROM (
    VALUES
        (19,  '', 'RESPONSABLE', 'IT_FROM_PCD', 'N', 'Y', 'Y'),
        (114, '', 'RESPONSABLE', 'IT_FROM_PCD', 'N', 'N', 'N'),
        (540, '', 'RESPONSABLE', 'IT_FROM_PCD', 'Y', 'Y', 'N'),
        (544, '', 'RESPONSABLE', 'IT_FROM_PCD', 'Y', 'Y', 'N')
) AS v(id_action, where_clause, group_id, basket_id, used_in_basketlist, used_in_action_page, default_action_list)
WHERE NOT EXISTS (
    SELECT 1
    FROM actions_groupbaskets agb
    WHERE agb.id_action = v.id_action
      AND agb.group_id = v.group_id
      AND agb.basket_id = v.basket_id
);

INSERT INTO actions_groupbaskets (id_action, where_clause, group_id, basket_id, used_in_basketlist, used_in_action_page, default_action_list)
SELECT v.id_action, v.where_clause, v.group_id, v.basket_id, v.used_in_basketlist, v.used_in_action_page, v.default_action_list
FROM (
    VALUES
        (19,  '', 'SERVICE', 'IT_FROM_PCD', 'N', 'Y', 'Y'),
        (114, '', 'SERVICE', 'IT_FROM_PCD', 'N', 'N', 'N'),
        (540, '', 'SERVICE', 'IT_FROM_PCD', 'Y', 'Y', 'N'),
        (544, '', 'SERVICE', 'IT_FROM_PCD', 'Y', 'Y', 'N')
) AS v(id_action, where_clause, group_id, basket_id, used_in_basketlist, used_in_action_page, default_action_list)
WHERE NOT EXISTS (
    SELECT 1
    FROM actions_groupbaskets agb
    WHERE agb.id_action = v.id_action
      AND agb.group_id = v.group_id
      AND agb.basket_id = v.basket_id
);

-- 6. Actions utilisateur du service
INSERT INTO actions_groupbaskets (id_action, where_clause, group_id, basket_id, used_in_basketlist, used_in_action_page, default_action_list)
SELECT v.id_action, v.where_clause, v.group_id, v.basket_id, v.used_in_basketlist, v.used_in_action_page, v.default_action_list
FROM (
    VALUES
        (19,  '', 'SERVICE', 'ServiceIncomingBasket', 'N', 'Y', 'Y'),
        (114, '', 'SERVICE', 'ServiceIncomingBasket', 'N', 'N', 'N'),
        (543, '', 'SERVICE', 'ServiceIncomingBasket', 'Y', 'Y', 'N')
) AS v(id_action, where_clause, group_id, basket_id, used_in_basketlist, used_in_action_page, default_action_list)
WHERE NOT EXISTS (
    SELECT 1
    FROM actions_groupbaskets agb
    WHERE agb.id_action = v.id_action
      AND agb.group_id = v.group_id
      AND agb.basket_id = v.basket_id
);

-- 7. Actions chef de service sur la bannette de validation
INSERT INTO actions_groupbaskets (id_action, where_clause, group_id, basket_id, used_in_basketlist, used_in_action_page, default_action_list)
SELECT v.id_action, v.where_clause, v.group_id, v.basket_id, v.used_in_basketlist, v.used_in_action_page, v.default_action_list
FROM (
    VALUES
        (114, '', 'RESPONSABLE', 'ValidationBasket', 'N', 'N', 'N'),
        (544, '', 'RESPONSABLE', 'ValidationBasket', 'Y', 'Y', 'Y'),
        (545, '', 'RESPONSABLE', 'ValidationBasket', 'Y', 'Y', 'N')
) AS v(id_action, where_clause, group_id, basket_id, used_in_basketlist, used_in_action_page, default_action_list)
WHERE NOT EXISTS (
    SELECT 1
    FROM actions_groupbaskets agb
    WHERE agb.id_action = v.id_action
      AND agb.group_id = v.group_id
      AND agb.basket_id = v.basket_id
);

-- 8. Preferences d'affichage: chef IT (RESPONSABLE)
INSERT INTO users_baskets_preferences (user_serial_id, group_serial_id, basket_id, display, color)
SELECT 32, 4, 'IT_FROM_PCD', true, null
WHERE NOT EXISTS (
    SELECT 1 FROM users_baskets_preferences
    WHERE user_serial_id = 32
      AND group_serial_id = 4
      AND basket_id = 'IT_FROM_PCD'
);

INSERT INTO users_baskets_preferences (user_serial_id, group_serial_id, basket_id, display, color)
SELECT 32, 4, 'ValidationBasket', true, null
WHERE NOT EXISTS (
    SELECT 1 FROM users_baskets_preferences
    WHERE user_serial_id = 32
      AND group_serial_id = 4
      AND basket_id = 'ValidationBasket'
);

-- 9. Preferences d'affichage: utilisateurs IT (SERVICE)
INSERT INTO users_baskets_preferences (user_serial_id, group_serial_id, basket_id, display, color)
SELECT DISTINCT u.id, 12, 'ServiceIncomingBasket', true, null
FROM users u
JOIN users_entities ue ON ue.user_id = u.id AND ue.entity_id = 'IT' AND ue.primary_entity = 'Y'
JOIN usergroup_content ugc ON ugc.user_id = u.id AND ugc.group_id = 12
WHERE NOT EXISTS (
    SELECT 1 FROM users_baskets_preferences ubp
    WHERE ubp.user_serial_id = u.id
      AND ubp.group_serial_id = 12
      AND ubp.basket_id = 'ServiceIncomingBasket'
);
