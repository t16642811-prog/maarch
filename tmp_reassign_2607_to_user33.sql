update res_letterbox
set dest_user = 33,
    custom_fields = jsonb_set(
        jsonb_set(coalesce(custom_fields, '{}'::jsonb), '{_anamWorkflow,assignedUserId}', '33'::jsonb, true),
        '{_anamWorkflow,managerUserId}', '32'::jsonb, true
    )
where res_id = 2607;

update listinstance
set item_id = 33
where res_id = 2607
  and difflist_type = 'entity_id'
  and item_mode = 'dest'
  and item_type = 'user_id';

select res_id, alt_identifier, dest_user,
       custom_fields -> '_anamWorkflow' ->> 'assignedUserId' as assigned_user_id,
       custom_fields -> '_anamWorkflow' ->> 'managerUserId' as manager_user_id
from res_letterbox where res_id = 2607;
