update baskets
set basket_clause = $$
(
    dest_user = @user_id
    and coalesce(custom_fields -> '_anamWorkflow' ->> 'step', '') = 'service_processing'
    and status in ('NEW','COU','STDBY','ENVDONE')
)
or
(
    coalesce((custom_fields -> '_anamWorkflow' ->> 'managerUserId')::int, 0) = @user_id
    and coalesce(custom_fields -> '_anamWorkflow' ->> 'step', '') = 'user_processing'
    and status in ('NEW','COU','STDBY','ENVDONE')
)
$$
where basket_id = 'IT_FROM_PCD';

select basket_id, basket_clause from baskets where basket_id = 'IT_FROM_PCD';
