INSERT INTO actions_groupbaskets (id_action, where_clause, group_id, basket_id, used_in_basketlist, used_in_action_page, default_action_list)
SELECT 543, '', 'RESPONSABLE', 'DepartmentBasket', 'Y', 'Y', 'N'
WHERE NOT EXISTS (
    SELECT 1
    FROM actions_groupbaskets
    WHERE id_action = 543
      AND group_id = 'RESPONSABLE'
      AND basket_id = 'DepartmentBasket'
);

DELETE FROM actions_groupbaskets
WHERE group_id = 'RESPONSABLE'
  AND basket_id = 'DepartmentBasket'
  AND id_action IN (541, 542);
