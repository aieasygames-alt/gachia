// Project only list metadata across the SQLite/Node boundary, never raw article bodies.
export const sourceHistoryQuery = `SELECT id,
  json_extract(payload,'$.status') AS status,
  json_extract(payload,'$.lastAttempt') AS lastAttempt,
  json_extract(payload,'$.lastSuccess') AS lastSuccess,
  json_extract(payload,'$.digest') AS digest,
  (SELECT json_group_array(json_object('id',json_extract(a.value,'$.id'),
    'title',json_extract(a.value,'$.title'),'publishedAt',json_extract(a.value,'$.publishedAt')))
    FROM json_each(payload,'$.articles') a) AS articles
  FROM official_source_runs WHERE source_id=? AND id<?
  AND (?='' OR json_extract(payload,'$.status')=? OR (?='failed' AND json_extract(payload,'$.status') IN ('access_failed','parse_failed')))
  AND (?='' OR substr(json_extract(payload,'$.lastAttempt'),1,10)>=?)
  AND (?='' OR substr(json_extract(payload,'$.lastAttempt'),1,10)<=?)
  AND (?='' OR EXISTS (SELECT 1 FROM json_each(payload,'$.articles') a
    WHERE instr(lower(json_extract(a.value,'$.title')),lower(?))>0 OR instr(json_extract(a.value,'$.id'),?)>0))
  ORDER BY id DESC LIMIT ?`;
