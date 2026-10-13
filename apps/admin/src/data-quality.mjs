const locales = ['', 'En', 'Ja'];
const expectedKinds = ['characters', 'weapons', 'materials', 'guides', 'astral-ops', 'stigma-sets'];
const references = { characterId: 'characters', characterIds: 'characters', weaponId: 'weapons', weaponIds: 'weapons',
  materialId: 'materials', materialIds: 'materials', guideId: 'guides', guideIds: 'guides',
  astralOpId: 'astral-ops', astralOpIds: 'astral-ops', stigmaSetId: 'stigma-sets', stigmaSetIds: 'stigma-sets' };
const validDate = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  Number.isFinite(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;

function fieldCoverage(kind, rows, checks, truncated) {
  const configured = ['description', 'summary', ...(kind === 'guides' ? ['content'] : []), ...(kind === 'materials' ? ['source'] : [])];
  const observed = new Map(); let observationTruncated = rows.length > 2000; let invalidRows = 0;
  for (const row of rows.slice(0, 2000)) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) { invalidRows++; continue; }
    for (const key of Object.keys(row)) {
      if (!observed.has(key) && observed.size >= 200) { observationTruncated = true; continue; }
      observed.set(key, (observed.get(key) ?? 0) + 1);
    }
  }
  const groupFields = configured.flatMap((field) => locales.map((suffix) => `${field}${suffix}`));
  const nestedGroups = ['skills', ...(kind === 'guides' ? ['faq'] : [])];
  const datasetChecks = checks.filter((check) => check.kind === kind);
  return { scope: 'top_level_keys_and_configured_groups_not_full_schema', observationTruncated,
    rowsObserved: Math.min(rows.length, 2000), invalidRowsObserved: invalidRows,
    fields: [...observed].sort(([a], [b]) => a.localeCompare(b)).map(([field, presentRecords]) => ({ field, presentRecords,
      coverage: groupFields.includes(field) ? 'text_presence_group_only' : Object.hasOwn(references, field) ? 'explicit_id_reference_only'
        : field === 'id' ? 'format_and_uniqueness_only' : nestedGroups.includes(field) ? 'configured_nested_structure_and_text_only' : /Ids?$/.test(field) && field !== 'id' ? 'unconfigured_reference_diagnostic_only' : 'not_checked_by_quality_rules' })),
    textGroups: configured.map((field) => {
      const groupChecks = datasetChecks.filter((check) => check.ruleId === 'translation.field_presence' && check.path === '$' && check.field === field);
      const present = rows.filter((row) => row && typeof row === 'object' && !Array.isArray(row) && locales.some((suffix) => Object.hasOwn(row, `${field}${suffix}`))).length;
      return { field, configuredFields: locales.map((suffix) => `${field}${suffix}`), eligibleRecords: present, checkedRecords: groupChecks.length,
        absentRecordsNotValidated: rows.filter((row) => row && typeof row === 'object' && !Array.isArray(row)).length - present,
        status: !present ? 'optional_group_absent_not_checked' : truncated || groupChecks.length < present ? 'partial' : 'presence_only_not_translation_verified' };
    }),
    nestedGroups: nestedGroups.map((field) => {
      const validRows = rows.filter((row) => row && typeof row === 'object' && !Array.isArray(row));
      const groups = validRows.filter((row) => Object.hasOwn(row, field));
      const arrays = groups.filter((row) => Array.isArray(row[field]));
      const budgetItems = arrays.reduce((sum, row) => sum + Math.min(row[field].length, 200), 0);
      const validItems = arrays.reduce((sum, row) => sum + row[field].slice(0, 200).filter((item) => item && typeof item === 'object' && !Array.isArray(item)).length, 0);
      const prefix = `$.${field}[`;
      const retainedChecks = datasetChecks.filter((check) => check.path.startsWith(prefix));
      return { field, presentRecords: groups.length, absentRecordsNotValidated: validRows.length - groups.length,
        invalidGroupRecords: groups.length - arrays.length, arrayItems: arrays.reduce((sum, row) => sum + row[field].length, 0),
        itemsWithinPerGroupBudget: budgetItems, validItemsWithinBudget: validItems,
        retainedTextChecks: retainedChecks.filter((check) => check.ruleId === 'translation.field_presence').length,
        expectedTextChecksWithinBudget: validItems * 2,
        retainedStructureProblems: datasetChecks.filter((check) => check.ruleId === 'structure.nested' && (check.path === `$.${field}` || check.path.startsWith(prefix))).length,
        truncated: truncated || arrays.some((row) => row[field].length > 200),
        absentGroupIsNotFailure: true, itemLimit: 200, semanticValidation: false };
    }),
    excludedRules: ['title/name localization validity', 'rarity/status/version/numeric values',
      'translation accuracy and gameplay semantics', 'unconfigured nested fields and body links'] };
}

// Diagnostics only: date boundaries never revoke reviews or assert live game state.
export function assessDataQuality(datasets, facts = [], { now = new Date() } = {}) {
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) throw new Error('Invalid quality evaluation date');
  const inputIssues = []; const inputCoverage = []; const unreliableKinds = new Set();
  const normalized = []; const seenKinds = new Set();
  const inputArray = Array.isArray(datasets) ? datasets : [];
  if (!Array.isArray(datasets)) inputIssues.push({ reason: 'datasets_not_array' });
  if (inputArray.length > 32) inputIssues.push({ reason: 'dataset_count_budget', supplied: inputArray.length, observed: 32 });
  // Reject duplicate kind ownership before indexing targets; do not silently merge.
  for (const input of inputArray.slice(0, 32)) if (typeof input?.kind === 'string' && input.kind.length <= 80) {
    if (seenKinds.has(input.kind)) unreliableKinds.add(input.kind);
    seenKinds.add(input.kind);
  }
  for (const [index, input] of inputArray.slice(0, 32).entries()) {
    if (!input || typeof input.kind !== 'string' || !input.kind || input.kind.length > 80 || !Array.isArray(input.rows)) {
      inputIssues.push({ index, reason: 'invalid_dataset_shape' });
      if (typeof input?.kind === 'string') unreliableKinds.add(input.kind);
      continue;
    }
    if (normalized.some((item) => item.kind === input.kind)) {
      inputIssues.push({ kind: input.kind, reason: 'duplicate_dataset_kind' }); continue;
    }
    const truncatedRows = input.rows.length > 10000;
    if (truncatedRows) { unreliableKinds.add(input.kind); inputIssues.push({ kind: input.kind, reason: 'row_budget', supplied: input.rows.length, observed: 10000 }); }
    if (unreliableKinds.has(input.kind) && !truncatedRows) inputIssues.push({ kind: input.kind, reason: 'unreliable_dataset_kind' });
    normalized.push({ kind: input.kind, rows: input.rows.slice(0, 10000) });
    inputCoverage.push({ kind: input.kind, suppliedRecords: input.rows.length, observedRecords: Math.min(input.rows.length, 10000), truncated: truncatedRows });
  }
  datasets = normalized;
  const suppliedFacts = Array.isArray(facts) ? facts.length : null;
  if (!Array.isArray(facts)) inputIssues.push({ reason: 'facts_not_array' });
  if (suppliedFacts > 10000) inputIssues.push({ reason: 'fact_count_budget', supplied: suppliedFacts, observed: 10000 });
  const invalidFacts = Array.isArray(facts) ? facts.slice(0, 10000).filter((fact) => !fact || typeof fact !== 'object' || Array.isArray(fact)).length : 0;
  if (invalidFacts) inputIssues.push({ reason: 'invalid_fact_records', count: invalidFacts });
  facts = Array.isArray(facts) ? facts.slice(0, 10000).filter((fact) => fact && typeof fact === 'object' && !Array.isArray(fact)) : [];
  const today = now.toISOString().slice(0, 10); const checks = [];
  const ids = new Map(); const idIntegrity = []; let idIssueCount = 0;
  const idSummary = [];
  for (const { kind, rows } of datasets) {
    const counts = ids.get(kind) ?? new Map(); ids.set(kind, counts);
    let invalid = 0; let duplicates = 0;
    for (const [rowIndex, row] of rows.entries()) {
      const valid = row && typeof row === 'object' && !Array.isArray(row) && typeof row.id === 'string' && /^[a-z0-9-]+$/.test(row.id);
      if (!valid) {
        invalid++; idIssueCount++;
        if (idIntegrity.length < 2000) idIntegrity.push({ kind, rowIndex, reason: 'invalid_record_or_id', status: 'needs_review' });
        continue;
      }
      const count = (counts.get(row.id) ?? 0) + 1; counts.set(row.id, count);
      if (count > 1) {
        duplicates++; idIssueCount++;
        if (idIntegrity.length < 2000) idIntegrity.push({ kind, rowIndex, entityId: row.id, reason: 'duplicate_id', status: 'needs_review' });
      }
    }
    idSummary.push({ kind, observedRecords: rows.length, invalidRecords: invalid, duplicateOccurrences: duplicates });
  }
  let truncated = inputIssues.length > 0; let visited = 0;
  const referenceTraversal = [];
  const add = (check) => { if (checks.length < 2000) checks.push(check); else truncated = true; };
  function fields(value, names, suffixes, identity, path, required = false) {
    for (const field of names) {
      if (!required && !suffixes.some((suffix) => Object.hasOwn(value, `${field}${suffix}`))) continue;
      const missing = suffixes.filter((suffix) => typeof value[`${field}${suffix}`] !== 'string' || !value[`${field}${suffix}`].trim());
      add({ ...identity, ruleId: 'translation.field_presence', path, field, status: missing.length ? 'needs_review' : 'passed',
        message: missing.length ? `缺少或无效字段：${missing.map((suffix) => `${field}${suffix}`).join(', ')}` : '该字段三语均有文本；不代表翻译准确' });
    }
  }
  function walk(value, identity, path, traversal, depth = 0) {
    if (!value || typeof value !== 'object') return true;
    const stop = (reason) => {
      truncated = true; traversal.stopReasons[reason] = (traversal.stopReasons[reason] ?? 0) + 1; return false;
    };
    if (depth > 16) return stop('depth_budget');
    if (visited >= 5000) return stop('object_budget');
    if (checks.length >= 2000) return stop('diagnostic_budget');
    visited++; traversal.visitedObjects++;
    let complete = true;
    for (const [key, child] of Object.entries(value)) {
      if (checks.length >= 2000) return stop('diagnostic_budget');
      if (Object.hasOwn(references, key)) {
        const target = references[key]; const values = key.endsWith('Ids') ? child : [child];
        const valid = Array.isArray(values) && values.every((id) => typeof id === 'string' && /^[a-z0-9-]+$/.test(id));
        const available = ids.has(target);
        const reason = !valid ? 'invalid_type_or_id' : !available ? 'target_dataset_unavailable'
          : unreliableKinds.has(target) || inputArray.length > 32 ? 'target_dataset_unreliable'
          : values.some((id) => !ids.get(target).has(id)) ? 'missing_target'
          : values.some((id) => ids.get(target).get(id) > 1) ? 'ambiguous_duplicate_target' : 'resolved';
        add({ ...identity, ruleId: 'entity.reference', path: `${path}.${key}`, target,
          status: reason === 'resolved' ? 'passed' : 'needs_review', reason,
          message: '仅检查显式ID引用；不核验关联语义或正文链接' });
        traversal.configuredReferenceChecks++;
      } else if (/Ids?$/.test(key) && key !== 'id') {
        add({ ...identity, ruleId: 'entity.reference.unknown', path: `${path}.${key}`,
          status: 'needs_review', reason: 'unconfigured_reference', message: '未配置引用类型，不推断目标数据集' });
        traversal.unconfiguredReferenceChecks++;
      }
      if (child && typeof child === 'object' && !walk(child, identity, `${path}.${key}`, traversal, depth + 1)) complete = false;
    }
    return complete;
  }
  for (const { kind, rows } of datasets) {
    const traversal = { kind, inputRecords: rows.length, eligibleRecords: 0, invalidRecordsSkipped: 0,
      attemptedRecords: 0, fullyTraversedRecords: 0, partiallyTraversedRecords: 0, unstartedRecords: 0,
      visitedObjects: 0, configuredReferenceChecks: 0, unconfiguredReferenceChecks: 0, stopReasons: {} };
    referenceTraversal.push(traversal);
    for (const row of rows) {
      if (!row || typeof row !== 'object' || Array.isArray(row)) { traversal.invalidRecordsSkipped++; continue; }
      traversal.eligibleRecords++;
      const identity = { kind, entityId: row.id };
      fields(row, ['description', 'summary', ...(kind === 'guides' ? ['content'] : []), ...(kind === 'materials' ? ['source'] : [])], locales, identity, '$');
      for (const group of ['skills', ...(kind === 'guides' ? ['faq'] : [])]) {
        if (!Object.hasOwn(row, group)) continue;
        if (!Array.isArray(row[group])) {
          add({ ...identity, ruleId: 'structure.nested', path: `$.${group}`, status: 'needs_review', message: '字段必须为数组' }); continue;
        }
        for (const [i, item] of row[group].slice(0, 200).entries()) {
          const path = `$.${group}[${i}]`;
          if (!item || typeof item !== 'object' || Array.isArray(item)) {
            add({ ...identity, ruleId: 'structure.nested', path, status: 'needs_review', message: '嵌套记录必须为对象' }); continue;
          }
          fields(item, group === 'faq' ? ['question', 'answer'] : ['name', 'description'], group === 'faq' ? ['', 'Zh', 'Ja'] : locales, identity, path, true);
        }
        if (row[group].length > 200) truncated = true;
      }
      const before = traversal.visitedObjects;
      traversal.attemptedRecords++;
      if (walk(row, identity, '$', traversal)) traversal.fullyTraversedRecords++;
      else if (traversal.visitedObjects === before) traversal.unstartedRecords++;
      else traversal.partiallyTraversedRecords++;
    }
    traversal.status = traversal.partiallyTraversedRecords || traversal.unstartedRecords ? 'partial'
      : traversal.eligibleRecords ? 'configured_key_traversal_complete_not_semantics' : 'no_eligible_records';
  }
  for (const fact of facts.filter((item) => item.status === 'confirmed')) {
    let reason;
    if ([fact.validFrom, fact.validUntil].some((value) => value !== null && value !== undefined && !validDate(value))) reason = 'invalid_date';
    else if (fact.validFrom && fact.validUntil && fact.validFrom > fact.validUntil) reason = 'reversed_dates';
    else if (fact.validFrom && fact.validFrom > today) reason = 'future_start';
    else if (fact.validUntil && fact.validUntil < today) reason = 'past_end';
    else if (!fact.validFrom && !fact.validUntil) reason = 'unknown_window';
    add({ ruleId: 'fact.date_window', factId: fact.id, revision: fact.revision, status: reason ? 'needs_review' : 'passed',
      reason: reason ?? 'within_recorded_window', message: '仅比较人工记录日期（UTC含首尾）；不证明当前服务器状态，也不更改审核' });
  }
  const byRule = {};
  for (const check of checks) {
    byRule[check.ruleId] ??= { passed: 0, needsReview: 0 };
    byRule[check.ruleId][check.status === 'passed' ? 'passed' : 'needsReview']++;
  }
  return { version: 3, evaluatedDate: today, result: 'diagnostics_only', checks, truncated,
    inputCoverage: { datasets: inputCoverage, issues: inputIssues, suppliedFacts, observedFacts: facts.length,
      assessment: inputIssues.length ? 'partial_or_invalid_input' : 'within_configured_input_budget',
      omittedInputIsNotPassed: true },
    idIntegrity: { checks: idIntegrity, issueCount: idIssueCount, truncated: idIssueCount > idIntegrity.length,
      datasets: idSummary, semanticsVerified: false },
    coverage: { rulesVersion: 'hi3-quality-v3', complete: false,
      datasets: datasets.map(({ kind, rows }) => ({ kind, records: rows.length,
        configured: expectedKinds.includes(kind),
        genericRulesApplied: true, configuredMeaning: 'expected_dataset_presence_not_full_schema_policy',
        checks: checks.filter((item) => item.kind === kind).length,
        status: truncated ? 'partial_truncated' : 'configured_rules_only_not_full_schema',
        fieldMatrix: fieldCoverage(kind, rows, checks, truncated) })),
      expectedMissingDatasets: expectedKinds.filter((kind) => !ids.has(kind)),
      rules: ['record_id_format_and_uniqueness', 'existing_description_summary', 'guide_content', 'material_source', 'skill_name_description', 'guide_faq', 'explicit_six_kind_id_references', 'confirmed_fact_UTC_window'],
      referenceFields: { ...references },
      referenceTraversal: { datasets: referenceTraversal, visitedObjects: visited,
        scope: 'normalized_input_configured_keys_only', orderDependentGlobalBudget: true,
        stopReasonCountsAreEventsNotOmittedReferenceCounts: true },
      facts: { eligible: facts.filter((item) => item.status === 'confirmed').length,
        checked: checks.filter((item) => item.ruleId === 'fact.date_window').length },
      interpretation: '没有诊断或全部配置规则通过不代表全字段/语义/事实通过' },
    limits: { maxChecks: 2000, maxReferenceObjects: 5000, maxReferenceDepth: 16, maxNestedItems: 200,
      maxFieldObservationRows: 2000, maxObservedTopLevelKeys: 200, maxIdDiagnostics: 2000,
      maxDatasets: 32, maxRecordsPerDataset: 10000, maxFactRecords: 10000,
      idRecordScan: 'bounded_input_rows_no_hard_time_budget', hardTimeLimit: false },
    summary: { passed: checks.filter((item) => item.status === 'passed').length, needsReview: checks.filter((item) => item.status === 'needs_review').length,
      idIssues: idIssueCount, byRule, byRuleScope: 'retained_diagnostics_only_not_all_checks' },
    notCovered: ['翻译语义准确性与数值一致性', '客户端当前版本与事实实际时效', '字段与证据的语义一致性', '备用名词库与模糊搜索', '未配置数据集/嵌套字段及正文链接', '可选字段组全部缺失', '构建、Worker包体及生产验收'],
    permissions: { autoConfirm: false, edit: false, execute: false, publish: false } };
}
