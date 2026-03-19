update res_letterbox
set custom_fields = jsonb_set(coalesce(custom_fields, '{}'::jsonb), '{_anamWorkflow,step}', '"service_processing"'::jsonb, true)
where res_id = 2607;

select res_id, alt_identifier, destination, dest_user, custom_fields -> '_anamWorkflow' ->> 'step' as step
from res_letterbox
where res_id = 2607;
