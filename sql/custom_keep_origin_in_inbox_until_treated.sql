UPDATE baskets
SET basket_clause = '(' ||
    'destination in (@my_entities, @subentities[@my_primary_entity]) ' ||
    'and initiator is null ' ||
    'and status in (''NEW'', ''COU'', ''STDBY'', ''ENVDONE'')' ||
    ') or (' ||
    'coalesce((custom_fields -> ''_anamWorkflow'' ->> ''originUserId'')::int, 0) = @user_id ' ||
    'and status in (''NEW'', ''COU'', ''STDBY'', ''ENVDONE'')' ||
    ')'
WHERE basket_id = 'InboxAntenne';

UPDATE baskets
SET basket_clause = '(' ||
    '(destination in (@my_entities, @subentities[@my_primary_entity]) or dest_user = @user_id) ' ||
    'and category_id = ''incoming'' ' ||
    'and status in (''NEW'', ''COU'', ''STDBY'', ''ENVDONE'')' ||
    ') or (' ||
    'category_id = ''incoming'' ' ||
    'and coalesce((custom_fields -> ''_anamWorkflow'' ->> ''originUserId'')::int, 0) = @user_id ' ||
    'and status in (''NEW'', ''COU'', ''STDBY'', ''ENVDONE'')' ||
    ')'
WHERE basket_id = 'ANAMInbox';
