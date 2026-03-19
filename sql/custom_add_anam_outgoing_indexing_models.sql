BEGIN;

INSERT INTO indexing_models (label, category, "default", owner, private, master, enabled, mandatory_file, lad_processing)
SELECT
    'Courrier Départ interne',
    source.category,
    false,
    source.owner,
    false,
    source.id,
    true,
    source.mandatory_file,
    source.lad_processing
FROM indexing_models source
WHERE source.id = 2
  AND NOT EXISTS (
      SELECT 1
      FROM indexing_models existing
      WHERE lower(existing.label) = lower('Courrier Départ interne')
  );

INSERT INTO indexing_models (label, category, "default", owner, private, master, enabled, mandatory_file, lad_processing)
SELECT
    'Courrier Départ externe',
    source.category,
    false,
    source.owner,
    false,
    source.id,
    true,
    source.mandatory_file,
    source.lad_processing
FROM indexing_models source
WHERE source.id = 2
  AND NOT EXISTS (
      SELECT 1
      FROM indexing_models existing
      WHERE lower(existing.label) = lower('Courrier Départ externe')
  );

INSERT INTO indexing_models_fields (model_id, identifier, mandatory, enabled, default_value, unit, allowed_values)
SELECT
    target.id,
    source_field.identifier,
    source_field.mandatory,
    source_field.enabled,
    source_field.default_value,
    source_field.unit,
    source_field.allowed_values
FROM indexing_models target
JOIN indexing_models_fields source_field
    ON source_field.model_id = 2
WHERE lower(target.label) IN (lower('Courrier Départ interne'), lower('Courrier Départ externe'))
  AND NOT EXISTS (
      SELECT 1
      FROM indexing_models_fields existing_field
      WHERE existing_field.model_id = target.id
  );

INSERT INTO indexing_models_entities (model_id, entity_id, keyword)
SELECT
    target.id,
    NULL,
    'ALL_ENTITIES'
FROM indexing_models target
WHERE lower(target.label) IN (lower('Courrier Départ interne'), lower('Courrier Départ externe'))
  AND NOT EXISTS (
      SELECT 1
      FROM indexing_models_entities existing_entity
      WHERE existing_entity.model_id = target.id
        AND existing_entity.keyword = 'ALL_ENTITIES'
  );

COMMIT;
