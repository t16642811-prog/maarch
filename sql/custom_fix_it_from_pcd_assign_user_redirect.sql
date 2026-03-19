BEGIN;
INSERT INTO groupbasket_redirect (group_id, basket_id, action_id, entity_id, keyword, redirect_mode)
SELECT 'RESPONSABLE', 'IT_FROM_PCD', 540, 'IT', '', 'USERS'
WHERE NOT EXISTS (
    SELECT 1 FROM groupbasket_redirect WHERE group_id = 'RESPONSABLE' AND basket_id = 'IT_FROM_PCD' AND action_id = 540 AND entity_id = 'IT' AND coalesce(keyword,'') = '' AND redirect_mode = 'USERS'
);
INSERT INTO groupbasket_redirect (group_id, basket_id, action_id, entity_id, keyword, redirect_mode)
SELECT 'SERVICE', 'IT_FROM_PCD', 540, 'IT', '', 'USERS'
WHERE NOT EXISTS (
    SELECT 1 FROM groupbasket_redirect WHERE group_id = 'SERVICE' AND basket_id = 'IT_FROM_PCD' AND action_id = 540 AND entity_id = 'IT' AND coalesce(keyword,'') = '' AND redirect_mode = 'USERS'
);
COMMIT;
