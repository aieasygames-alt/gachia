const fragment = new URLSearchParams(location.hash.slice(1));
if (fragment.has('token')) {
  sessionStorage.setItem('workbenchToken', fragment.get('token'));
  history.replaceState(null, '', location.pathname);
}
const token = sessionStorage.getItem('workbenchToken') ?? '';
const $ = (selector) => document.querySelector(selector);
const notice = (message, error = false) => {
  $('#notice').textContent = message;
  $('#notice').className = error ? 'error' : '';
};
const element = (tag, text, className) => {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
};
async function api(path, payload) {
  const response = await fetch(`/api/${path}`, { method: payload ? 'POST' : 'GET',
    headers: { Authorization: `Bearer ${token}`, ...(payload ? { 'Content-Type': 'application/json' } : {}) },
    ...(payload ? { body: JSON.stringify(payload) } : {}) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? '本地服务请求失败');
  return data;
}
const empty = (target, text) => target.append(element('p', text, 'empty'));
function downloadJson(data, filename) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  const link = element('a'); link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const reviewIdentityLabel = (review) => ({ human: '人工（自报）', agent: '代理（自报）' }[review.reviewerType] ?? '身份未注明（历史/兼容记录）');
function reviewIdentityControls(form) {
  const label = element('label', '审核身份类型（自报，不是身份认证）');
  const type = element('select'); type.name = 'reviewerType';
  for (const [value, title] of [['human', '人工审核'], ['agent', '代理审核']]) {
    const option = element('option', title); option.value = value; type.append(option);
  }
  label.append(type);
  const basisLabel = element('label', '授权依据（代理必填；不授予发布权限）');
  const basis = element('input'); basis.name = 'authorizationBasis'; basis.maxLength = 2000;
  type.addEventListener('change', () => { basis.required = type.value === 'agent'; });
  basisLabel.append(basis); form.append(label, basisLabel);
  return { type, basis };
}
function draftReviewForm(packet, expectedLatest) {
  const form = element('form', undefined, 'draft-review-form');
  const material = element('details'); material.open = true;
  material.append(element('summary', '精确审核材料：差异、变更文件正文、事实及覆盖范围'), element('pre', JSON.stringify(packet, null, 2)));
  form.append(material);
  const identity = reviewIdentityControls(form);
  const controls = {};
  for (const [name, title] of [['reviewer', '草案审核人（自报身份）'], ['note', '草案审核理由']]) {
    const label = element('label', title); const input = element('input');
    input.required = true; input.maxLength = name === 'reviewer' ? 80 : 2000; label.append(input); form.append(label); controls[name] = input;
  }
  const label = element('label', '草案审核决定'); const decision = element('select');
  for (const [value, title] of [['rejected', '驳回草案'], ['accepted', '接受草案（非发布批准）']]) {
    const option = element('option', title); option.value = value; decision.append(option);
  }
  label.append(decision); form.append(label);
  const boxes = [];
  const uncovered = [...new Set(packet.validation.checks.filter((check) => check.status === 'not_covered').map((check) => check.ruleId))].sort();
  const requirements = [['diffChecked', '已检查实际差异及所有变更文件正文（含新增与删除）'],
    ['factsChecked', '已核对选定事实、服务器及适用条件'], ['noPublishUnderstood', '理解接受草案不授予提交或发布权限'],
    ...uncovered.map((rule) => [`rule:${rule}`, `知悉未覆盖：${rule}`])];
  for (const [key, title] of requirements) {
    const label = element('label', undefined, 'checkbox-label'); const box = element('input'); box.type = 'checkbox'; box.required = true;
    label.append(box, document.createTextNode(title)); form.append(label); boxes.push({ key, box });
  }
  const submit = element('button', '记录草案审核', 'secondary'); form.append(submit);
  let pending;
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    action(submit, async () => {
      const payload = { workspaceId: packet.workspaceId, validationId: packet.validation.id, packetDigest: packet.digest,
        expectedLatest, decision: decision.value, reviewer: controls.reviewer.value, note: controls.note.value,
        reviewerType: identity.type.value, authorizationBasis: identity.basis.value,
        acknowledgedRules: boxes.filter(({ key, box }) => key.startsWith('rule:') && box.checked).map(({ key }) => key.slice(5)),
        ...Object.fromEntries(boxes.filter(({ key }) => !key.startsWith('rule:')).map(({ key, box }) => [key, box.checked])) };
      const signature = JSON.stringify(payload);
      if (!pending || pending.signature !== signature) pending = { signature, requestId: crypto.randomUUID() };
      const data = await api('draft-reviews', { ...payload, requestId: pending.requestId });
      await refresh(); notice(data.review.assessment.status === 'stale' ? '已返回历史审核，但对象已变化，审核过期。' : '草案审核已记录。提交与发布仍禁用。');
    });
  });
  return form;
}
function renderRevisions(card, batch, state) {
  if (batch.lifecycle?.status === 'closed_no_update') return;
  const records = state.revisions.filter((revision) => revision.batchId === batch.id);
  const latest = Math.max(0, ...records.map((revision) => revision.number));
  const candidates = state.facts.filter((fact) => fact.evidenceId === batch.evidenceId && fact.status === 'confirmed');
  const details = element('details', undefined, 'revision-builder');
  details.append(element('summary', '选择已确认事实，创建任务修订'));
  const form = element('form');
  const selectedFacts = [];
  for (const fact of candidates) {
    const label = element('label', undefined, 'checkbox-label');
    const checkbox = element('input'); checkbox.type = 'checkbox';
    selectedFacts.push({ checkbox, id: fact.id, revision: fact.revision });
    label.append(checkbox, document.createTextNode(`${fact.entity} / ${fact.field} = ${fact.value}（审核 REV ${fact.revision}）`));
    form.append(label);
  }
  if (!candidates.length) empty(form, '此任务没有已确认事实。请先完成字段审核。');
  const label = element('label', '修订理由');
  const note = element('textarea'); note.required = true; note.maxLength = 2000; note.rows = 2; label.append(note); form.append(label);
  const button = element('button', '创建任务修订', 'secondary'); button.disabled = !candidates.length; form.append(button);
  // Keep a request key until the result is known, so a lost response can be retried safely.
  let pending;
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    action(button, async () => {
      const payload = { batchId: batch.id, expectedLatest: latest, note: note.value,
        selectedFacts: selectedFacts.filter((item) => item.checkbox.checked).map(({ id, revision }) => ({ id, revision })) };
      const signature = JSON.stringify(payload);
      if (!pending || pending.signature !== signature) pending = { signature, requestId: crypto.randomUUID() };
      const result = await api('revisions', { ...payload, requestId: pending.requestId });
      await refresh(); notice(result.duplicate ? '已返回同一任务修订，不重复创建。' : '任务修订已保存。事实选择已绑定，编辑与发布仍禁用。');
    });
  });
  details.append(form); card.append(details);
  for (const revision of records) {
    const item = element('article', undefined, 'revision-card');
    item.append(element('h3', `任务修订 #${revision.number} · ${revision.assessment.status === 'current' ? '上下文匹配（非批准）' : '已失效'}`),
      element('p', revision.note), element('p', `选择 ${revision.snapshot.confirmedFacts.length} 条事实 · ${new Date(revision.createdAt).toLocaleString()}`, 'muted'));
    for (const reason of revision.assessment.reasons) item.append(element('p', reason, 'error'));
    const info = element('details'); info.append(element('summary', '查看不可变快照与摘要'), element('pre', JSON.stringify(revision, null, 2))); item.append(info);
    const download = element('button', '导出修订 JSON（重新核验）', 'secondary');
    download.addEventListener('click', () => action(download, async () => {
      const data = await api(`revisions/${revision.id}`);
      downloadJson(data, `hi3-revision-${revision.id}.json`);
      notice(data.revision.assessment.status === 'invalid' ? '已导出历史修订；文件明确标记失效，不可作为当前批准输入。' : '已导出修订与当前核验结果，不代表编辑或发布批准。');
    }));
    item.append(download); card.append(item);
    const workspace = state.workspaces.find((entry) => entry.revisionId === revision.id);
    const create = element('button', workspace ? '重试 / 核对隔离工作区' : '创建隔离草案工作区', 'secondary');
    create.disabled = revision.assessment.status !== 'current';
    create.addEventListener('click', () => {
      if (!confirm('将从此修订绑定的 Git 提交创建独立工作区，不复制当前未提交内容。不安装依赖、不执行代码、不提交或发布。继续？')) return;
      action(create, async () => {
        const data = await api('workspaces', { revisionId: revision.id, confirmCreate: true });
        await refresh(); notice(data.workspace.inspection.status === 'blocked' ? '工作区已记录，但检查未通过。请查看暂停原因。' : '隔离工作区已就绪。可在显示路径手工准备草案，随后重新扫描差异。');
      });
    });
    item.append(create);
    if (workspace) {
      const panel = element('div', undefined, 'workspace-report');
      panel.append(element('h3', workspace.inspection.status === 'blocked' ? '草案暂停' : '可手工准备草案（未验证）'),
        element('pre', workspace.path), element('p', workspace.inspection.note, 'muted'));
      for (const reason of workspace.inspection.reasons) panel.append(element('p', reason, 'error'));
      const details = element('details'); details.append(element('summary', '检查文件范围与实际差异'),
        element('pre', JSON.stringify(workspace.inspection.changes, null, 2)), element('pre', workspace.inspection.diff || '尚无已跟踪文件差异。'));
      panel.append(details); item.append(panel);
      const validate = element('button', '运行草案结构化验证', 'secondary');
      validate.disabled = workspace.inspection.status === 'blocked';
      validate.addEventListener('click', () => action(validate, async () => {
        const data = await api('draft-validations', { workspaceId: workspace.id });
        await refresh(); notice(data.report.summary.failed ? '草案验证有失败项，请查看报告。' : '已完成部分结构验证；未覆盖项目不代表通过，不能发布。');
      }));
      panel.append(validate);
      for (const report of state.validations.filter((entry) => entry.workspaceId === workspace.id)) {
        const details = element('details', undefined, 'validation-report');
        details.append(element('summary', `草案验证 · ${report.assessment.status === 'stale' ? '已过期' : '当前'} · ${report.summary.failed ? '失败' : '部分检查通过'} · ${report.createdAt}`));
        details.append(element('p', `通过 ${report.summary.passed} / 失败 ${report.summary.failed} / 未覆盖 ${report.summary.notCovered}`, 'muted'));
        for (const reason of report.assessment.reasons) details.append(element('p', reason, 'error'));
        details.append(element('pre', JSON.stringify(report, null, 2)));
        const exportReport = element('button', '导出验证报告（重新核验）', 'secondary');
        exportReport.addEventListener('click', () => action(exportReport, async () => {
          const data = await api(`draft-validations/${report.id}`);
          downloadJson(data, `hi3-draft-validation-${report.id}.json`);
          notice(data.report.assessment.status === 'stale' ? '已导出历史过期报告，不可作为当前结果使用。' : '已导出当前部分验证报告，不是发布批准。');
        }));
        details.append(exportReport); panel.append(details);
        const reviewHost = element('div'); const load = element('button', '加载草案审核材料', 'secondary');
        load.disabled = report.assessment.status === 'stale';
        load.addEventListener('click', () => action(load, async () => {
          const { packet } = await api('draft-review-packet', { workspaceId: workspace.id, validationId: report.id });
          const expectedLatest = Math.max(0, ...state.draftReviews.filter((entry) => entry.workspaceId === workspace.id).map((entry) => entry.number));
          reviewHost.replaceChildren(draftReviewForm(packet, expectedLatest));
          notice('已加载精确材料，请逐项审核；提交时会重新核验对象。');
        }));
        details.append(load, reviewHost);
      }
      for (const review of state.draftReviews.filter((entry) => entry.workspaceId === workspace.id)) {
        const history = element('details', undefined, 'draft-review-history');
        history.append(element('summary', `${reviewIdentityLabel(review)}草案审核 #${review.number} · ${review.decision === 'accepted' ? '接受（非发布批准）' : '驳回'} · ${review.assessment.status === 'stale' ? '已过期' : '当前'}`),
          element('pre', JSON.stringify(review, null, 2)));
        const download = element('button', '导出草案审核（重新核验）', 'secondary');
        download.addEventListener('click', () => action(download, async () => {
          const data = await api(`draft-reviews/${review.id}`); downloadJson(data, `hi3-draft-review-${review.id}.json`);
          notice(data.review.assessment.status === 'stale' ? '已导出过期审核，仅供历史追溯。' : '已导出草案审核，不授予提交或发布权限。');
        }));
        history.append(download); panel.append(history);
        const previewButton = element('button', '生成数据级预览（不运行应用）', 'secondary');
        previewButton.disabled = review.decision !== 'accepted' || review.assessment.status !== 'current';
        previewButton.addEventListener('click', () => action(previewButton, async () => {
          await api('data-previews', { reviewId: review.id, confirmDataOnly: true });
          await refresh(); notice('已生成固定模板数据预览；真实站点路由、交互和资源尚未验证。');
        }));
        history.append(previewButton);
        const freeze = element('button', '冻结源材料副本（不执行）', 'secondary');
        freeze.disabled = previewButton.disabled;
        freeze.addEventListener('click', () => action(freeze, async () => {
          const data = await api('execution-materials', { reviewId: review.id, confirmSourceOnly: true });
          await refresh(); notice(`源材料冻结：${data.material.status}；不含依赖镜像，不授予执行权限。`);
        }));
        history.append(freeze);
        const excludeTemplate = element('button', '检查环境模板排除清单后冻结（不执行）', 'secondary');
        excludeTemplate.disabled = freeze.disabled;
        excludeTemplate.addEventListener('click', () => action(excludeTemplate, async () => {
          const { proposal } = await api('execution-materials/exclusions', { reviewId: review.id });
          const report = element('pre', JSON.stringify(proposal, null, 2)); history.append(report);
          const entries = proposal.exclusions.map((item) => `${item.path}\nSHA-256: ${item.sha256}\n${item.reason}`).join('\n\n');
          if (!confirm(`${entries || '当前没有可排除的固定环境模板。'}\n\n确认按本清单冻结？排除文件不会复制；不授予执行权限。`)) return;
          const { material } = await api('execution-materials', { reviewId: review.id, confirmSourceOnly: true, confirmExclusions: true, exclusionDigest: proposal.digest });
          await refresh(); notice(material.status === 'frozen_source_only' && material.assessment.status === 'current'
            ? '已按确认清单冻结源材料；未安装依赖或执行代码。'
            : `冻结未通过复验：${material.status} / ${material.assessment.status}；保留记录供对账，不允许执行。`);
        }));
        history.append(excludeTemplate);
        for (const material of state.executionMaterials.filter((item) => item.reviewId === review.id)) {
          const entry = element('details'); entry.append(element('summary', `冻结源材料 · ${material.status} · ${material.assessment.status} · 输入范围 ${material.inputScope?.status ?? '未检查'} · 依赖范围 ${material.dependencyScope?.status ?? '未检查'}`), element('pre', JSON.stringify(material, null, 2))); history.append(entry);
          const form = element('form', undefined, 'dependency-plan-form');
          form.append(element('h4', 'Linux依赖身份计划（仅记录，不下载）'), element('p', '字段校验不代表镜像可信、存在或已验证；不授予准备、执行或发布权限。'));
          for (const [name, title, placeholder] of [
            ['image', '完整镜像摘要', 'registry.example.com/team/image@sha256:...'],
            ['platform', 'Linux目标平台', 'linux/arm64 或 linux/amd64'],
            ['nodeVersion', '精确Node版本', '22.18.0'], ['pnpmVersion', '精确pnpm版本', '与冻结packageManager一致'],
            ['sourceUrl', '镜像来源说明链接', 'https://...'], ['note', '身份计划说明', '来源依据及仍待核验事项，不要填写凭据'],
          ]) {
            const label = element('label', title); const input = element('input'); input.name = name;
            input.required = true; input.placeholder = placeholder; input.maxLength = ['note', 'sourceUrl'].includes(name) ? 1000 : 300;
            label.append(input); form.append(label);
          }
          const label = element('label', '确认仅记录未验证计划，不下载镜像或执行代码');
          const confirmation = element('input'); confirmation.type = 'checkbox'; confirmation.required = true;
          label.prepend(confirmation); form.append(label);
          const save = element('button', '记录未验证依赖计划');
          save.disabled = material.assessment.status !== 'current'; form.append(save);
          form.addEventListener('submit', (event) => {
            event.preventDefault(); action(save, async () => {
              await api('execution-materials/dependency-plans', { ...Object.fromEntries(new FormData(form)), materialId: material.id, confirmPlanOnly: confirmation.checked });
              await refresh(); notice('已记录未验证依赖计划；未下载镜像，未验证制品或开放执行权限。');
            });
          });
          entry.append(form);
          for (const plan of material.dependencyPlans ?? []) {
            const box = element('section', undefined, 'preparation-readiness');
            box.append(element('h4', `准备就绪度 · ${plan.readiness?.status ?? '未检查'}`),
              element('p', '此报告只列缺项，导出契约不代表允许准备或执行。'),
              element('pre', JSON.stringify(plan.readiness, null, 2)));
            const download = element('button', '导出准备器契约（不执行）', 'secondary');
            download.disabled = !plan.readiness?.capabilities.exportContract;
            download.addEventListener('click', () => action(download, async () => {
              const { contract } = await api('execution-materials/preparation-contract', { materialId: material.id, planId: plan.id });
              downloadJson(contract, `dependency-preparation-contract-${plan.id}.json`);
              notice('已导出准备器规范；缺项仍阻塞，未下载镜像或执行准备。');
            }));
            const staging = element('button', '导出staging挂载契约（不复制）', 'secondary');
            staging.disabled = download.disabled;
            staging.addEventListener('click', () => action(staging, async () => {
              const { contract } = await api('execution-materials/staging-contract', { materialId: material.id, planId: plan.id });
              downloadJson(contract, `staging-mount-contract-${plan.id}.json`);
              notice('已导出staging规范；未验证或复制Linux制品、未创建挂载目录。');
            }));
            box.append(download, staging); entry.append(box);
          }
        }
        const run = element('button', '运行真实 Next.js 预览（执行代码）', 'secondary');
        run.disabled = review.decision !== 'accepted' || review.assessment.status !== 'current' || state.applicationPreviews.some((preview) => preview.occupancy?.blocksStart);
        run.addEventListener('click', () => {
          if (!confirm('将执行独立工作区的 Next.js 和依赖代码。这不是安全沙箱：代码可访问本机文件和网络。不会传递工作台令牌或生产环境变量；限时 10 分钟。依赖必须事先独立准备。确认运行？')) return;
          action(run, async () => {
            const data = await api('application-previews', { reviewId: review.id, executionMode: 'legacy_trusted_local', confirmExecuteCode: true, confirmNotSandboxed: true });
            await refresh(); notice(`真实应用预览：${data.preview.status}。启动不等于页面验收通过。`);
          });
        });
        history.append(run);
        for (const preview of state.applicationPreviews.filter((entry) => entry.reviewId === review.id)) {
          const box = element('div', undefined, 'application-preview');
          box.append(element('h3', `真实应用预览 · ${preview.status} · ${preview.assessment.status === 'stale' ? '审核过期' : '上下文匹配'}`),
            element('p', preview.origin ?? '未分配本机端口'), element('p', preview.message ?? '应用输出不记录，避免泄露凭据。', 'muted'),
            element('p', preview.occupancy?.message ?? '占用信息不可用，不推定已退出。'),
            element('pre', JSON.stringify({ result: preview.result, checks: preview.checks, notCovered: preview.notCovered, limits: preview.limits }, null, 2)));
          const check = element('button', '检查页面、sitemap、搜索索引与搜索交互抽样', 'secondary');
          check.disabled = preview.occupancy?.actions.check !== true;
          check.addEventListener('click', () => action(check, async () => {
            await api('application-previews/check', { id: preview.id }); await refresh(); notice('页面检查已记录；请查看失败及未覆盖项目。');
          }));
          const stop = element('button', '停止应用预览', 'secondary');
          stop.disabled = preview.occupancy?.actions.stop !== true;
          stop.addEventListener('click', () => action(stop, async () => {
            await api('application-previews/stop', { id: preview.id }); await refresh(); notice('已请求停止应用预览，稍后刷新核对状态。');
          }));
          box.append(check, stop);
          if (preview.status === 'needs_reconciliation') {
            const reconcile = element('button', '确认旧进程和端口已停止', 'secondary');
            reconcile.disabled = preview.occupancy?.actions.reconcile !== true;
            reconcile.addEventListener('click', () => {
              if (!confirm(`请先人工核对 ${preview.workspacePath} 的进程及 ${preview.origin ?? '旧端口'} 已停止。工具不会按历史 PID 杀进程。确认已停止？`)) return;
              action(reconcile, async () => { await api('application-previews/reconcile', { id: preview.id, confirmProcessStopped: true }); await refresh(); });
            }); box.append(reconcile);
          }
          history.append(box);
        }
        for (const preview of state.dataPreviews.filter((entry) => entry.reviewId === review.id)) {
          const view = element('details', undefined, 'data-preview');
          view.append(element('summary', `数据级预览 · ${preview.assessment.status === 'stale' ? '已过期' : '当前'} · ${preview.pages.length} 页（非真实站点）`),
            element('p', '固定模板只渲染纯文本；不执行草案代码。显示预览不等于已完成浏览器验收。', 'muted'),
            element('pre', JSON.stringify({ checks: preview.checks, exclusions: preview.exclusions, summary: preview.summary, assessment: preview.assessment }, null, 2)));
          const label = element('label', '预览语言与实体'); const select = element('select');
          for (const page of preview.pages) { const option = element('option', `${page.locale} / ${page.title}`); option.value = page.id; select.append(option); }
          label.append(select); view.append(label);
          const frame = element('iframe'); frame.title = '隔离数据级预览'; frame.setAttribute('sandbox', ''); frame.referrerPolicy = 'no-referrer';
          const open = element('button', '查看所选数据页', 'secondary'); open.disabled = preview.assessment.status === 'stale' || !preview.pages.length;
          open.addEventListener('click', () => action(open, async () => {
            const { preview: fresh } = await api(`data-previews/${preview.id}`);
            if (fresh.assessment.status !== 'current') throw new Error('预览已过期，请重新审核草案。');
            const page = fresh.pages.find((item) => item.id === select.value);
            if (!page) throw new Error('预览页面不存在');
            frame.srcdoc = page.html; notice('显示固定模板数据页，不代表真实站点验收通过。');
          }));
          const exportPreview = element('button', '导出数据预览报告', 'secondary');
          exportPreview.addEventListener('click', () => action(exportPreview, async () => {
            const data = await api(`data-previews/${preview.id}`); downloadJson(data, `hi3-data-preview-${preview.id}.json`);
          }));
          view.append(open, exportPreview, frame); history.append(view);
        }
      }
    }
  }
}
let currentState;
function selectFactEvidence() {
  const evidence = currentState.evidence.find((item) => item.id === $('#fact-evidence').value);
  $('#fact-server').value = evidence?.server ?? '';
  $('#fact-source').textContent = evidence ? `${evidence.sourceType === 'discussion' ? '玩家讨论' : '官方声明待核验'} · ${evidence.url}\n\n${evidence.body}` : '请先导入证据。';
}
function reviewForm(fact) {
  const form = element('form'); form.className = 'review-form';
  reviewIdentityControls(form);
  function field(labelText, name, options) {
    const label = element('label', labelText);
    const control = element(options ? 'select' : 'input'); control.name = name;
    if (options) for (const [value, title] of options) { const option = element('option', title); option.value = value; control.append(option); }
    else { control.required = true; control.maxLength = name === 'reviewer' ? 80 : 2000; }
    label.append(control); form.append(label); return control;
  }
  field('审核决定', 'decision', [['needs_review', '保持 / 撤回为待审核'], ['confirmed', '确认该字段'], ['rejected', '驳回该字段']]);
  field('审核人（自报身份）', 'reviewer'); field('审核理由与核验依据', 'note');
  for (const [name, title] of [['sourceChecked', '已核实官方来源身份'], ['scopeChecked', '已核对服务器、生效时间与内容状态'], ['valueChecked', '已核对实体、字段值、条件与重要数值']]) {
    const label = element('label', undefined, 'checkbox-label');
    const input = element('input'); input.type = 'checkbox'; input.name = name;
    label.append(input, document.createTextNode(title)); form.append(label);
  }
  const submit = element('button', '记录字段审核', 'secondary'); form.append(submit);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    action(submit, async () => {
      const values = Object.fromEntries(new FormData(form));
      for (const name of ['sourceChecked', 'scopeChecked', 'valueChecked']) values[name] = values[name] === 'on';
      await api('fact-reviews', { ...values, factId: fact.id, expectedRevision: fact.revision });
      await refresh(); notice('字段审核已记录。原任务快照未改写，编辑与发布仍禁用。');
    });
  });
  return form;
}
function renderFacts(state) {
  const select = $('#fact-evidence'); const selected = select.value;
  select.replaceChildren(...state.evidence.map((evidence) => { const option = element('option', `${evidence.title} / ${evidence.server}`); option.value = evidence.id; return option; }));
  if (state.evidence.some((evidence) => evidence.id === selected)) select.value = selected;
  $('#fact-intake button').disabled = !state.evidence.length;
  selectFactEvidence();
  const list = $('#fact-list'); list.replaceChildren();
  if (!state.facts.length) empty(list, '暂无字段记录。请从所选证据中摘录一个需要核验的事实。');
  for (const fact of state.facts) {
    const card = element('article', undefined, 'card');
    card.id = `fact-${fact.id}`;
    const status = { confirmed: '已确认（身份见审核历史）', rejected: '已驳回', needs_review: '待审核' }[fact.status];
    card.append(element('span', `${status} / REV ${fact.revision} / ${fact.sourceType === 'discussion' ? '讨论不可确认为事实' : '官方声明'}`, 'tag'),
      element('h3', `${fact.entity} · ${fact.field}`), element('p', fact.value), element('pre', fact.quote),
      element('p', `${fact.server} · ${fact.lifecycle} · ${fact.validFrom ?? '生效未知'} → ${fact.validUntil ?? '结束未知'}`, 'muted'));
    const source = element('details'); source.append(element('summary', '字段证据绑定'), element('pre', `${fact.sourceUrl}\n证据 ID: ${fact.evidenceId}\n证据指纹: ${fact.evidenceFingerprint}`)); card.append(source);
    const history = element('details'); history.append(element('summary', '审核历史（追加记录）'));
    for (const review of state.reviews.filter((item) => item.factId === fact.id)) history.append(element('p', `REV ${review.revision} · ${review.decision} · ${reviewIdentityLabel(review)} · ${review.reviewer} · ${new Date(review.createdAt).toLocaleString()}\n${review.note}\n授权依据：${review.authorizationBasis || '未注明'}`, 'index-row'));
    card.append(history);
    const review = element('details'); review.append(element('summary', '审核 / 撤回 / 驳回该字段'), reviewForm(fact)); card.append(review); list.append(card);
  }
}
function render(state) {
  currentState = state;
  renderFacts(state);
  $('#entity-count').textContent = state.index.entries.length;
  $('#evidence-count').textContent = state.evidence.length;
  $('#batch-count').textContent = state.batches.length;
  $('#baseline').textContent = `Worker: ${state.index.deployment.worker} · 基线: ${state.baseline.commit?.slice(0, 12) ?? '不可读取'} · 工作目录: ${state.baseline.dirty === null ? '未知' : state.baseline.dirty ? '有未提交内容（仅作扫描上下文）' : '干净'} · 扫描: ${new Date(state.index.scannedAt).toLocaleString()}`;
  const evidenceList = $('#evidence-list'); evidenceList.replaceChildren();
  if (!state.evidence.length) empty(evidenceList, '尚无证据。先导入一段官方原文或讨论，建立第一条可追溯记录。');
  for (const evidence of state.evidence) {
    const card = element('article', undefined, 'card');
    card.append(element('span', `${evidence.sourceType === 'discussion' ? '讨论选题' : '官方声明'} / 待核验`, 'tag'), element('h3', evidence.title));
    card.append(element('p', `${evidence.server} · ${evidence.language} · 发布日期 ${evidence.publishedAt ?? '待确认'}`, 'muted'));
    // Untrusted source text is always rendered as text, never HTML or executable instructions.
    const details = element('details'); details.append(element('summary', '查看证据片段与来源'));
    details.append(element('p', evidence.url, 'source-url'), element('pre', evidence.body));
    if (evidence.sourceSnapshot) details.append(element('p', '经审阅的官方快照片段；不是事实确认', 'muted'), element('pre', JSON.stringify(evidence.sourceSnapshot, null, 2)));
    const preparation = state.reviewPreparations?.find((item) => item.evidenceId === evidence.id);
    if (preparation) {
      const panel = element('section', undefined, 'review-preparation');
      panel.append(element('h4', '审核准备 · 公告上下文与候选字段'), element('p', preparation.meaning, 'muted'));
      if (preparation.context) {
        const context = element('details');
        context.append(element('summary', '查看绑定历史快照的完整公告（原始HTML按文本显示）'),
          element('p', `${preparation.context.server} · 发布 ${preparation.context.publishedAt} · 获取 ${preparation.context.fetchedAt}`),
          element('p', preparation.context.url), element('pre', preparation.context.rawHtml));
        panel.append(context);
      } else panel.append(element('p', preparation.contextDiagnostic?.status === 'budget_exceeded'
        ? '历史上下文查找超过2000条或4 MiB读取预算；未完成查找，不代表快照不存在。不会自动清理或替换旧快照。'
        : '绑定公告上下文不可读取，请重新核对证据；不会以当前公告替代旧快照。', 'error'));
      for (const text of preparation.checklist) panel.append(element('p', `待核对：${text}`, 'muted'));
      const add = element('button', '从此证据准备待审核字段', 'secondary');
      add.addEventListener('click', () => {
        $('#fact-evidence').value = evidence.id; selectFactEvidence();
        $('#fact-intake').scrollIntoView({ block: 'start' });
        $('#fact-intake [name=entity]').focus();
        notice('已选择证据。请填写字段与逐字出处，不会自动推定内容状态或日期。');
      });
      panel.append(add);
      if (!preparation.candidates.length) panel.append(element('p', '尚无候选字段，未生成任何批准记录。'));
      for (const fact of preparation.candidates) {
        panel.append(element('h4', `${fact.entity} · ${fact.field} · ${fact.status} / REV ${fact.revision}`), element('p', fact.value), element('pre', fact.quote),
          element('p', `状态 ${fact.lifecycle} · 生效 ${fact.validFrom ?? '未知'} · 结束 ${fact.validUntil ?? '未知'}`));
        const jump = element('button', '前往该字段审核', 'secondary');
        jump.addEventListener('click', () => {
          const target = document.getElementById(`fact-${fact.id}`);
          const review = target?.querySelector('form')?.closest('details'); if (review) review.open = true;
          target?.scrollIntoView({ block: 'start' });
          target?.querySelector('select[name=decision]')?.focus();
        });
        panel.append(jump);
      }
      details.append(panel);
    }
    card.append(details);
    const button = element('button', '生成待审核任务', 'secondary');
    button.addEventListener('click', () => action(button, async () => {
      const result = await api('batches', { evidenceId: evidence.id });
      await refresh(); notice(result.duplicate ? '该证据已有任务，返回原始任务快照。' : '任务已保存，事实仍待核验。');
    }));
    card.append(button); evidenceList.append(card);
  }
  const batches = $('#batch-list'); batches.replaceChildren();
  if (!state.batches.length) empty(batches, '还没有任务包。所有任务都需要事实审核，当前版本不提供发布操作。');
  for (const batch of state.batches) {
    const card = element('article', undefined, 'card');
    const lifecycle = state.batchLifecycles?.[batch.id];
    card.append(element('span', lifecycle?.status === 'closed_no_update' ? 'CLOSED / 无需更新，已结束' : 'AWAITING FACT REVIEW / 待事实审核', 'tag'), element('h3', batch.title));
    card.append(element('p', `${batch.server} · ${batch.deployment.worker} · 基线 ${batch.baseline.commit?.slice(0, 12) ?? '未知'}`, 'muted'));
    const liveFacts = state.facts.filter((fact) => fact.evidenceId === batch.evidenceId);
    const captured = batch.factSnapshot ?? [];
    if (liveFacts.length !== captured.length || liveFacts.some((fact) => !captured.some((item) => item.id === fact.id && item.revision === fact.revision))) {
      card.append(element('p', '字段审核已变化：此任务保留原始事实快照，不能作为最新已批准内容使用。', 'error'));
    }
    card.append(element('p', batch.suggestedPages.length ? `字面匹配建议：${batch.suggestedPages.map((page) => page.title).join('、')}` : '没有实体字面匹配；请人工确定页面。不会自动新建攻略。'));
    if (batch.contentFingerprint !== state.index.fingerprint) card.append(element('p', '内容扫描已变化：此任务仍保留原始快照，不能视为当前验证结果。', 'error'));
    const details = element('details'); details.append(element('summary', '完整任务范围、检查与预算'), element('pre', JSON.stringify(batch, null, 2))); card.append(details);
    const button = element('button', '导出任务 JSON', 'secondary');
    button.addEventListener('click', () => {
      const url = URL.createObjectURL(new Blob([JSON.stringify(batch, null, 2)], { type: 'application/json' }));
      const link = element('a'); link.href = url; link.download = `hi3-batch-${batch.id}.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
    card.append(button);
    if (lifecycle?.status === 'closed_no_update') {
      const closure = lifecycle.closure;
      card.append(element('p', `${closure.reason}\n内容核对：${closure.contentCheck}`),
        element('p', `${reviewIdentityLabel(closure)} · ${closure.reviewer} · ${closure.createdAt}`),
        element('p', lifecycle.contextCurrent ? '结束时上下文仍一致；不代表发布批准。' : '结束时上下文已变化：保留历史结论，不代表当前内容再次通过，且不会自动重开。'));
    } else if (lifecycle) {
      const section = element('details'); section.append(element('summary', '核对后无需更新：结束任务'));
      section.append(element('p', lifecycle.coverage?.status === 'ready'
        ? '门禁覆盖HI3角色、武器、材料、攻略源数据及公共镜像；不覆盖其他数据集、页面代码、翻译语义或线上状态。'
        : '源数据/公共镜像读取或一致性检查未通过，暂不能结束。请先处理扫描失败项；未覆盖不等于通过。'));
      const form = element('form');
      const fields = {};
      for (const [key, title] of [['reason', '结束理由'], ['contentCheck', '已核对的现有资料路径、实体及覆盖情况'], ['reviewer', '记录者']]) {
        const label = element('label', title); const input = element('textarea');
        input.required = true; input.maxLength = 2000; input.rows = 2;
        fields[key] = input; label.append(input); form.append(label);
      }
      const identity = reviewIdentityControls(form);
      const label = element('label', undefined, 'checkbox-label'); const confirm = element('input');
      confirm.type = 'checkbox'; confirm.required = true;
      label.append(confirm, document.createTextNode('全部已记录事实已确认，现有内容已覆盖；无需草案，不授予发布权限。'));
      const close = element('button', '记录无需更新并结束', 'secondary');
      close.disabled = lifecycle.coverage?.status !== 'ready' || !liveFacts.length || liveFacts.some((fact) => fact.status !== 'confirmed') || state.revisions.some((item) => item.batchId === batch.id);
      form.append(label, close); let pending;
      form.addEventListener('submit', (event) => {
        event.preventDefault(); action(close, async () => {
          const payload = { batchId: batch.id, contextDigest: lifecycle.contextDigest,
            ...Object.fromEntries(Object.entries(fields).map(([key, node]) => [key, node.value])),
            reviewerType: identity.type.value, authorizationBasis: identity.basis.value, confirmNoUpdate: confirm.checked };
          const signature = JSON.stringify(payload);
          if (!pending || pending.signature !== signature) pending = { signature, requestId: crypto.randomUUID() };
          await api('batches/close-no-update', { ...payload, requestId: pending.requestId });
          await refresh(); notice('任务已按无需更新结束；没有创建草案或发布。');
        });
      });
      section.append(form); card.append(section);
    }
    renderRevisions(card, batch, state); batches.append(card);
  }
  $('#entry-list').replaceChildren(...state.index.entries.map((entry) => element('p', `${entry.kind} / ${entry.title} · ${entry.routes.length} 个预期语言路径`, 'index-row')));
  $('#check-list').replaceChildren(...state.index.findings.map((check) => {
    const row = element('p', undefined, 'check-row');
    row.append(element('span', { passed: '通过', failed: '失败', not_covered: '未覆盖' }[check.status], `badge ${check.status}`), element('span', `${check.ruleId} · ${check.message}`));
    return row;
  }));
  $('#event-list').replaceChildren(...state.events.map((event) => element('p', `${new Date(event.createdAt).toLocaleString()} · ${event.kind} · ${event.objectId}`, 'index-row')));
  if (state.index.quality) {
    const quality = element('details', undefined, 'data-quality');
    quality.append(element('summary', `只读数据质量诊断 · ${state.index.quality.summary.needsReview} 项待检查 · ID异常 ${state.index.quality.summary.idIssues ?? 0} 项 · 额外镜像 ${state.index.quality.summary.additionalMirrorNeedsReview ?? 0} 项待检查`),
      element('p', '仅检查三语字段完整性、已配置嵌套结构/显式引用与已确认事实的日期边界；不是翻译语义、事实核验或发布批准。'),
      element('pre', JSON.stringify(state.index.quality, null, 2)));
    quality.append(element('p', 'ID格式与唯一性只验证记录标识，不证明实体、名称或数值正确。规则汇总只统计保留的诊断，截断不当作通过。'));
    quality.append(element('p', `输入预算：最多32个数据集、每集10000条、事实10000条；${state.index.quality.inputCoverage?.assessment === 'within_configured_input_budget' ? '本次输入在预算内，仍非全量语义审核' : '输入不完整或无效，请查看异常'}。文件读取与耗时没有硬上限。`));
    for (const traversal of state.index.quality.coverage.referenceTraversal?.datasets ?? []) quality.append(element('p', `${traversal.kind} 引用遍历：完整 ${traversal.fullyTraversedRecords} 条 / 部分 ${traversal.partiallyTraversedRecords} 条 / 未开始 ${traversal.unstartedRecords} 条 / 无效跳过 ${traversal.invalidRecordsSkipped} 条；显式引用检查 ${traversal.configuredReferenceChecks} 条。按全局预算和输入顺序扫描，完整遍历不代表语义通过。`));
    for (const dataset of state.index.quality.coverage.datasets) {
      const matrix = dataset.fieldMatrix;
      if (!matrix) continue;
      quality.append(element('p', `${dataset.kind}：${dataset.records} 条记录；顶层字段观察 ${matrix.rowsObserved} 条${matrix.observationTruncated ? '（截断）' : ''}。未检查字段：${matrix.fields.filter((field) => field.coverage === 'not_checked_by_quality_rules').map((field) => field.field).join('、') || '未观察到（不代表全覆盖）'}`));
      for (const group of matrix.textGroups) quality.append(element('p', `${group.field} 三语存在性：符合检查条件 ${group.eligibleRecords} 条 / 已检查 ${group.checkedRecords} 条 / 整组缺失未验证 ${group.absentRecordsNotValidated} 条。不验证翻译准确性。`));
      for (const group of matrix.nestedGroups) quality.append(element('p', `${group.field} 嵌套检查：数组元素 ${group.arrayItems} 项 / 每组预算内 ${group.itemsWithinPerGroupBudget} 项 / 文本诊断 ${group.retainedTextChecks} 条（预算内预期 ${group.expectedTextChecksWithinBudget} 条）${group.truncated ? '，检查截断' : ''}。整组缺失 ${group.absentRecordsNotValidated} 条未验证，不核验语义。`));
    }
    for (const mirror of state.index.quality.coverage.additionalMirrors ?? []) quality.append(element('p', `${mirror.kind} 公共镜像：${{ passed: '解析内容一致（非事实核验）', needs_review: '内容不同，待检查', unavailable: '缺失或无效', not_checked: '源不可用，未比较' }[mirror.status]}。不改变旧修订指纹。`));
    $('#check-list').append(quality);
  }
  if (!state.events.length) empty($('#event-list'), '导入证据和创建任务后，事件将保存在本机 SQLite。');
}
let refreshRequest = 0;
async function refresh() {
  const request = ++refreshRequest;
  let state;
  try { state = await api('state'); }
  catch (error) {
    if (request !== refreshRequest) return;
    throw error;
  }
  if (request !== refreshRequest) return;
  render(state);
  const source = state.sourceHealth;
  const policyBox = $('#execution-policy'); policyBox.replaceChildren();
  policyBox.append(element('h2', '执行隔离能力 · 默认禁止代码执行'),
    element('p', '隔离Linux模式不可用：冻结材料、执行适配器及隔离实测未完成。现有真实应用预览只能显式选择可信本机非沙箱模式。', 'muted'),
    element('p', '以下仅为只读文件探测：不启动运行时、不安装软件、不检查后台服务。'));
  policyBox.append(element('pre', JSON.stringify(state.executionPolicy, null, 2)));
  const integration = state.executionPolicy.integration;
  const integrationBox = element('details', undefined, 'isolation-integration');
  integrationBox.append(element('summary', '隔离接入缺口与Mac运行时暂缓方案'),
    element('p', '当前按项目策略暂缓接入。Docker Desktop仅为未来候选，不代表已安装、获授权或安全验收。'));
  for (const stage of integration.stages) integrationBox.append(element('p', `${stage.id}：${stage.remaining.join('；')}`));
  integrationBox.append(element('pre', JSON.stringify(integration.orderedNextSteps, null, 2)));
  const integrationDownload = element('button', '导出隔离接入缺口报告', 'secondary');
  integrationDownload.addEventListener('click', () => {
    downloadJson(integration, 'isolation-integration.json'); notice('已导出集成缺口；不会安装、连接运行时或执行容器。');
  });
  integrationBox.append(integrationDownload); policyBox.append(integrationBox);
  const discover = element('button', '只读检查Mac运行时候选（不连接）', 'secondary');
  discover.addEventListener('click', () => {
    if (!confirm('只检查固定Docker安装路径及最多32份context meta.json，不读取config.json或TLS凭据，不执行CLI、不启动或连接daemon。确认？')) return;
    action(discover, async () => {
      const { report } = await api('mac-runtime-discovery', { confirmReadOnly: true });
      integrationBox.append(element('pre', JSON.stringify(report, null, 2)));
      notice(`只读发现：${report.status}；不代表安装可信或隔离可用。`);
    });
  });
  integrationBox.append(discover);
  const protocolDownload = element('button', '导出执行预算与启动协议（不执行）', 'secondary');
  protocolDownload.addEventListener('click', () => action(protocolDownload, async () => {
    const { protocol } = await api('execution-launch-protocol');
    downloadJson(protocol, 'isolated-launch-protocol.json');
    notice('已导出目标预算和离线探测参数模板；不是可执行命令，限制尚未实测生效。');
  }));
  policyBox.append(protocolDownload);
  const intents = element('details', undefined, 'execution-intents'); intents.append(element('summary', '隔离准备控制面意图（未接入运行时）'),
    element('p', '启动意图/实例身份仅为控制面记录，不代表已创建或验证运行时。过期或结果不明保持占位待对账；尚未保护可信本机预览或计划追加。'),
    element('pre', JSON.stringify(state.executionIntents ?? [], null, 2)));
  policyBox.append(intents);
  for (const intent of state.executionIntents ?? []) {
    const download = element('button', `导出停止前核验规范 · ${intent.id}`, 'secondary');
    download.addEventListener('click', () => action(download, async () => {
      const { contract } = await api('execution-intents/inspection-contract', { id: intent.id });
      downloadJson(contract, `runtime-inspection-contract-${intent.id}.json`);
      notice('已导出只读核验规范；未查询运行时、未停止实例或释放执行槽。');
    }));
    intents.append(download);
  }
  const labels = { never_checked: '尚未采集', collecting: '正在采集 · 结果尚未确认', needs_reconciliation: '上次采集中断 · 结果待核实', success_changed: '采集成功 · 首屏有变化', success_unchanged: '采集成功 · 首屏无变化', parse_failed: '正文解析失败', access_failed: '访问失败' };
  $('#source-status').textContent = labels[source.status] ?? source.status;
  const box = $('#official-source'); box.replaceChildren();
  box.append(element('p', `${labels[source.status] ?? source.status} · ${source.stale ? '超过7天未成功检查' : '长期失联判断按最后成功时间计算'} · 最后成功：${source.lastSuccess ?? '从未成功'}`), element('p', source.coverage, 'muted'));
  if (['collecting', 'needs_reconciliation', 'parse_failed', 'access_failed'].includes(source.status) && source.articles?.length) box.append(element('p', '下方保留的是上次成功采集的历史快照，不代表本次结果或当前活动状态。', 'error'));
  for (const article of source.articles ?? []) {
    const item = element('details');
    item.append(element('summary', `${article.title} · ${article.publishedAt} · 待核验`), element('p', article.url), element('pre', article.rawHtml));
    const label = element('label', '复制上方原始正文中的连续片段（不改写、不翻译，最多30000字符）');
    const excerpt = element('textarea'); excerpt.maxLength = 30000; excerpt.rows = 6;
    label.append(excerpt);
    const confirmation = element('label', '我已审阅所选原文，理解导入后仍需字段事实审核');
    const checkbox = element('input'); checkbox.type = 'checkbox'; confirmation.prepend(checkbox);
    const submit = element('button', '导入选定片段为待核验证据', 'secondary');
    submit.addEventListener('click', () => action(submit, async () => {
      if (!checkbox.checked) throw new Error('请先确认已审阅所选原文。');
      const result = await api('official-source/import-excerpt', { articleId: article.id, snapshotDigest: source.digest, excerpt: excerpt.value, confirmExcerpt: true });
      await refresh(); notice(result.duplicate ? '同一快照片段已导入，返回已有证据。' : '片段已导入为待核验证据；请继续字段事实审核。');
    }));
    item.append(label, confirmation, submit);
    box.append(item);
  }
}
const pendingActions = new WeakSet();
async function action(button, callback) {
  if (pendingActions.has(button)) return;
  pendingActions.add(button);
  button.disabled = true;
  try { await callback(); } catch (error) { notice(error.message, true); }
  finally { pendingActions.delete(button); button.disabled = false; }
}
$('#refresh').addEventListener('click', (event) => action(event.currentTarget, async () => { await refresh(); notice('已重新扫描。未覆盖检查仍保持未覆盖。'); }));
const storagePanel = element('details', undefined, 'storage-health');
storagePanel.append(element('summary', '本机记录与容量 · 只读统计'),
  element('p', '统计SQLite逻辑页、记录数量与工作台目录文件表观大小；有界扫描不跟随链接，不代表实际分配磁盘块或磁盘余量，不清理、不压缩、不恢复。'));
const storageButton = element('button', '读取只读容量统计', 'secondary');
const storageResult = element('div');
storageButton.addEventListener('click', () => action(storageButton, async () => {
  storageResult.replaceChildren();
  try {
    const report = await api('storage-health');
    if (report.comparison.status === 'two_observations_not_trend') {
      storageResult.append(element('p', `两次会话观测：逻辑分配变化 ${report.comparison.allocatedBytesDelta} 字节；不是长期趋势或清理建议。`));
    }
    storageResult.append(element('p', `数据库逻辑分配 ${report.database.allocatedBytes} 字节 · 可复用 ${report.database.reusableBytes} 字节`),
      element('p', `工作台文件表观大小 ${report.files.totalApparentBytes} 字节 · ${report.files.result === 'partial' ? '扫描不完整，请查看跳过项/上限' : '元数据扫描完成（非冻结快照）'}`),
      element('pre', JSON.stringify(report, null, 2)));
  } catch (error) { storageResult.append(element('p', '统计读取失败，请重试。', 'error')); throw error; }
}));
storagePanel.append(storageButton, storageResult); $('#event-list').parentElement.append(storagePanel);
const cleanupPanel = element('details', undefined, 'cleanup-plan');
cleanupPanel.append(element('summary', '清理候选与引用保护 · 只读、不删除'));
const cleanupButton = element('button', '检查只读清理候选', 'secondary');
const cleanupResult = element('div');
cleanupButton.addEventListener('click', () => action(cleanupButton, async () => {
  cleanupResult.replaceChildren();
  const report = await api('cleanup-plan');
  cleanupResult.replaceChildren(element('p', `观察 ${report.summary.observed} 条 · 保护 ${report.summary.protected} 条 · 待政策审核候选 ${report.summary.candidates} 条。不是删除许可。`),
    element('p', report.complete ? '已观察配置字段；不是全量引用、文件或进程审计。0条候选不表示全部通过。' : '检查不完整：全部候选已保守取消。请查看预算及缺失引用原因，不代表没有清理对象。'),
    element('p', '扫描预算：每类2000条记录、10000条引用、嵌套遍历每条1 MiB；没有硬性耗时/CPU上限。'),
    element('p', report.warning), element('pre', JSON.stringify(report, null, 2)));
  const titles = { record_budget_exceeded: '记录数量超出预算', reference_budget_exceeded: '引用数量超出预算',
    payload_byte_budget_exceeded: '记录正文过大，跳过嵌套遍历', unresolved_reference: '直接引用目标未观察到',
    unresolved_nested_reference: '快照引用目标未观察到', source_snapshot_digest_not_observed: '绑定来源快照未观察到',
    invalid_or_duplicate_id: '记录ID无效或重复' };
  for (const diagnostic of report.diagnostics) cleanupResult.append(element('p', `${titles[diagnostic.issue] ?? diagnostic.issue} · ${diagnostic.kind} · ${diagnostic.id ?? ''}`));
}));
cleanupPanel.append(cleanupButton, cleanupResult); $('#event-list').parentElement.append(cleanupPanel);
const releasePanel = element('details', undefined, 'release-plan'); releasePanel.append(element('summary', '发布前只读计划 · 不执行发布'));
const releaseButton = element('button', '读取发布前计划', 'secondary');
const releaseResult = element('div');
releaseButton.addEventListener('click', () => action(releaseButton, async () => {
  releaseResult.replaceChildren();
  try {
    const report = await api('release-plan'); const summary = report.gateSummary;
    releaseResult.append(element('p', `当前验收已核验 ${summary.counts.verified} 项 · 尚未核验 ${summary.counts.notVerified} 项。未核验不等于失败，也不是通过。`),
      element('p', summary.warning), element('p', summary.next.action));
    const list = element('ol');
    for (const gate of summary.items) {
      const item = element('li');
      item.append(element('h4', `${gate.title} · 尚未核验`), element('p', gate.requirement));
      if (gate.acceptanceChecks) {
        for (const check of gate.acceptanceChecks) item.append(element('p', `${check.title} · 尚未核验：${check.requirement}`));
      }
      if (gate.dependsOn.length) item.append(element('p', `前置门禁：${gate.dependsOn.map((id) => summary.items.find((entry) => entry.id === id).title).join('、')}`));
      list.append(item);
    }
    releaseResult.append(list, element('p', `配置已读取 ${summary.observations.configuration.read} 项 · 不可用 ${summary.observations.configuration.unavailable} 项 · 无效 ${summary.observations.configuration.invalid} 项。读取不等于部署核验。`),
      element('p', `恢复覆盖声明涉及 ${summary.observations.recovery.tableCount} 张表；不是本次测试运行结果，也不是完整灾备。`),
      element('p', '未读取真实草案、历史报告或线上状态；不安装、不提交、不恢复、不发布。'), element('pre', JSON.stringify(report, null, 2)));
    const diagnostics = report.configurationDiagnostics;
    releaseResult.append(element('h4', 'Worker / Router固定字段诊断'), element('p', diagnostics.warning));
    const labels = { consistent: '本地字段一致', mismatch: '本地字段不一致', not_checked: '未检查' };
    for (const check of diagnostics.checks) releaseResult.append(element('p', `${check.environment === 'production' ? '生产配置' : '预发布配置'} · ${check.title} · ${labels[check.status]}`));
  }
  catch (error) { releaseResult.append(element('p', '计划读取失败，请重试。', 'error')); throw error; }
}));
releasePanel.append(releaseButton, releaseResult); $('#event-list').parentElement.append(releasePanel);
const sourceHistory = element('details', undefined, 'source-history');
sourceHistory.append(element('summary', '已保存的官方采集历史'), element('p', '仅查询本机已保存记录，不访问官网。失败记录可能保留上次成功快照；正文不代表本次采集成功，也不代表事实已确认。'));
const historyForm = element('form');
const queryLabel = element('label', '历史公告标题或ID'); const historyQuery = element('input'); historyQuery.maxLength = 100; queryLabel.append(historyQuery);
const statusLabel = element('label', '历史采集状态'); const historyStatus = element('select');
for (const [value, text] of [['', '全部'], ['success_changed', '成功·有变化'], ['success_unchanged', '成功·无变化'],
  ['failed', '全部失败'], ['access_failed', '访问失败'], ['parse_failed', '解析失败'], ['collecting', '采集中意图'], ['needs_reconciliation', '待对账']]) {
  const option = element('option', text); option.value = value; historyStatus.append(option);
}
statusLabel.append(historyStatus); const historySearch = element('button', '查询本机历史');
const fromLabel = element('label', '采集开始日期（UTC）'); const historyFrom = element('input'); historyFrom.type = 'date'; fromLabel.append(historyFrom);
const untilLabel = element('label', '采集结束日期（UTC）'); const historyUntil = element('input'); historyUntil.type = 'date'; untilLabel.append(historyUntil);
historyForm.append(queryLabel, statusLabel, fromLabel, untilLabel, element('p', '日期按采集尝试时间的UTC日期筛选，含首尾日期；不是公告发布日期。无尝试时间的旧记录仅在不限制日期时显示。'), historySearch);
const failedHistory = element('button', '只看失败记录', 'secondary'); failedHistory.type = 'button';
const resetHistory = element('button', '重置历史筛选', 'secondary'); resetHistory.type = 'button';
historyForm.append(failedHistory, resetHistory);
const historyResults = element('div'); const historyDetail = element('div');
const olderHistory = element('button', '下一页历史记录', 'secondary'); olderHistory.disabled = true;
const newerHistory = element('button', '上一页历史记录', 'secondary'); newerHistory.disabled = true;
const historyPage = element('p', '尚未查询历史'); historyPage.setAttribute('aria-live', 'polite');
let historyCursor = null; let historyFilters = null; let historyRequest = 0; let detailRequest = 0;
let historyPages = []; let historyPageIndex = -1; let historyLoading = false;
function syncHistoryButtons() {
  olderHistory.disabled = historyLoading || historyCursor === null;
  newerHistory.disabled = historyLoading || historyPageIndex < 1;
}
async function loadSourceHistory(before, targetPage = 0) {
  const request = ++historyRequest; ++detailRequest;
  const navigating = arguments.length > 1;
  const filters = navigating ? historyFilters : { query: historyQuery.value.trim(), status: historyStatus.value, from: historyFrom.value, until: historyUntil.value };
  historyLoading = true; syncHistoryButtons();
  const params = new URLSearchParams(filters); if (before !== undefined) params.set('before', before);
  let page;
  try { page = await api(`official-source/history?${params}`); }
  catch (error) { if (request === historyRequest) { historyLoading = false; historyCursor = null; historyPageIndex = -1; historyPages = []; syncHistoryButtons(); historyPage.textContent = '查询失败，请重新查询'; historyResults.replaceChildren(element('p', '查询失败，请调整筛选后重新查询。', 'error')); historyDetail.replaceChildren(); } throw error; }
  if (request !== historyRequest) return;
  historyFilters = filters; historyCursor = page.nextCursor; historyLoading = false;
  // Store request cursors, not result rows: previous pages remain read-only server queries.
  historyPages = navigating ? historyPages.slice(0, targetPage) : [];
  historyPages.push(before); historyPageIndex = targetPage; syncHistoryButtons();
  historyPage.textContent = `第 ${targetPage + 1} 页 · 本页 ${page.items.length} 条（本机记录）`;
  historyResults.replaceChildren(); historyDetail.replaceChildren();
  if (!page.items.length) historyResults.append(element('p', '没有匹配的本机历史记录。'));
  for (const item of page.items) {
    const row = element('article', undefined, 'card');
    row.append(element('h4', `记录 #${item.runId} · ${item.status}`), element('p', `尝试 ${item.lastAttempt ?? '未知'} · 最近成功 ${item.lastSuccess ?? '无'}`));
    for (const article of item.articles) row.append(element('p', `${article.id} · ${article.title} · ${article.publishedAt}`));
    const view = element('button', '查看该历史快照（只读）', 'secondary');
    view.addEventListener('click', () => action(view, async () => {
      const detailSequence = ++detailRequest;
      const detail = await api(`official-source/history/${item.runId}`);
      if (request !== historyRequest || detailSequence !== detailRequest) return;
      historyDetail.replaceChildren(element('h4', `历史记录 #${item.runId} · 只读原始材料`), element('pre', JSON.stringify(detail, null, 2)));
    })); row.append(view); historyResults.append(row);
  }
}
historyForm.addEventListener('submit', (event) => { event.preventDefault(); action(historySearch, () => loadSourceHistory()); });
failedHistory.addEventListener('click', () => { historyStatus.value = 'failed'; action(failedHistory, () => loadSourceHistory()); });
resetHistory.addEventListener('click', () => { historyQuery.value = ''; historyStatus.value = ''; historyFrom.value = ''; historyUntil.value = ''; action(resetHistory, () => loadSourceHistory()); });
olderHistory.addEventListener('click', () => { if (!historyLoading && historyCursor !== null) action(olderHistory, () => loadSourceHistory(historyCursor, historyPageIndex + 1)).finally(syncHistoryButtons); });
newerHistory.addEventListener('click', () => { if (!historyLoading && historyPageIndex > 0) action(newerHistory, () => loadSourceHistory(historyPages[historyPageIndex - 1], historyPageIndex - 1)).finally(syncHistoryButtons); });
sourceHistory.append(historyForm, historyPage, historyResults, newerHistory, olderHistory, historyDetail);
$('#official-source').parentElement.append(sourceHistory);
$('#collect-official').addEventListener('click', (event) => action(event.currentTarget, async () => {
  const result = await api('official-source/collect', { confirmPublicFetch: true });
  await refresh(); notice(`来源检查已记录：${result.source.status}。采集正文仍待核验，不自动进入事实或发布。`);
}));
$('#fact-evidence').addEventListener('change', selectFactEvidence);
$('#fact-intake').addEventListener('submit', (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  action(form.querySelector('button'), async () => {
    const result = await api('facts', Object.fromEntries(new FormData(form)));
    form.reset(); await refresh(); notice(result.duplicate ? '该字段已有记录，保留原记录。' : '字段已保存，等待审核。');
  });
});
$('#intake').addEventListener('submit', (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  action(form.querySelector('button'), async () => {
    const result = await api('evidence', Object.fromEntries(new FormData(form)));
    form.reset(); await refresh(); notice(result.duplicate ? '检测到重复导入，保留已有证据。' : '证据已保存。来源身份和事实仍待核验。');
  });
});
refresh().then(() => notice('本机已连接。官方采集需显式点击，不定时执行；此工作台没有发布权限。')).catch((error) => notice(error.message, true));
