update res_letterbox
set custom_fields = jsonb_set(
    coalesce(custom_fields, '{}'::jsonb),
    '{_anamWorkflow}',
    coalesce(custom_fields -> '_anamWorkflow', '{}'::jsonb) || jsonb_build_object(
        'originUserId', 28,
        'originSetAt', to_char(now(), 'YYYY-MM-DD HH24:MI:SS'),
        'step', 'service_processing',
        'updatedAt', to_char(now(), 'YYYY-MM-DD HH24:MI:SS')
    ),
    true
)
where res_id = 2607;
