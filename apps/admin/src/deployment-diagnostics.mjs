import { parseConfigObject } from './config-input.mjs';

export function deploymentDiagnostics(configTexts, deployment) {
  const inputs = []; const configs = {};
  for (const role of ['web', 'router']) {
    const text = configTexts[role];
    if (typeof text !== 'string') { inputs.push({ role, status: 'unavailable' }); continue; }
    const parsed = parseConfigObject(text, { jsonc: true });
    if (parsed.status !== 'parsed') {
      inputs.push({ role, status: 'invalid_jsonc', reason: parsed.reason }); continue;
    }
    inputs.push({ role, status: 'parsed' }); configs[role] = parsed.value;
  }
  const checks = [];
  const add = (environment, id, title, status) => checks.push({ environment, id, title, status });
  for (const environment of ['production', 'staging']) {
    const effective = (role) => {
      const base = configs[role];
      if (!base) return null;
      if (environment === 'production') return base;
      const override = base.env?.staging;
      if (!override || typeof override !== 'object' || Array.isArray(override)) return null;
      // Only project fields used below; service bindings do not inherit across environments.
      return { name: override.name, services: override.services,
        main: override.main ?? base.main, assets: override.assets ?? base.assets };
    };
    const web = effective('web'); const router = effective('router');
    const matchingService = (config, binding, service) => {
      if (!Array.isArray(config.services)) return false;
      const rows = config.services.filter((row) => row && row.binding === binding);
      return rows.length === 1 && rows[0].service === service;
    };
    add(environment, 'worker_name', '主Worker名称符合HI3主站归属', !web ? 'not_checked' :
      typeof deployment.worker !== 'string' || deployment.deployment !== 'main' ? 'not_checked' :
        web.name === (environment === 'production' ? deployment.worker : `${deployment.worker}-staging`) ? 'consistent' : 'mismatch');
    add(environment, 'router_main', 'Router唯一MAIN_SITE绑定指向同环境主Worker', !web || !router ? 'not_checked' :
      typeof web.name !== 'string' || !web.name || !matchingService(router, 'MAIN_SITE', web.name) ? 'mismatch' : 'consistent');
    add(environment, 'self_reference', '主Worker唯一自引用绑定指向自身', !web ? 'not_checked' :
      typeof web.name !== 'string' || !web.name || !matchingService(web, 'WORKER_SELF_REFERENCE', web.name) ? 'mismatch' : 'consistent');
    add(environment, 'worker_entry', '主Worker声明OpenNext入口', !web ? 'not_checked' : web.main === '.open-next/worker.js' ? 'consistent' : 'mismatch');
    add(environment, 'assets', '主Worker声明共享ASSETS目录和绑定', !web ? 'not_checked' :
      web.assets?.directory === '.open-next/assets' && web.assets?.binding === 'ASSETS' ? 'consistent' : 'mismatch');
  }
  const counts = Object.fromEntries(['consistent', 'mismatch', 'not_checked'].map((status) => [status, checks.filter((item) => item.status === status).length]));
  return { version: 1, result: counts.mismatch ? 'configuration_mismatch' : counts.not_checked ? 'incomplete_configuration_observation' : 'fixed_configuration_consistent',
    scope: 'HI3_main_worker_fixed_production_and_staging_fields_only', inputs, checks, counts,
    deploymentBasis: 'loaded_core_deployment_or_explicit_main_fallback_not_source_reparsed',
    warning: '一致仅表示所列本地字段匹配，不代表产物存在、Router实际分流正确或线上绑定生效。',
    notCovered: ['完整Wrangler schema与所有环境继承规则', 'Router源码分流及生成配置闭包', '产物/公共资源存在性和摘要', '其他游戏绑定、D1/R2、域名与权限', '实时部署/预发布验收'],
    permissions: { execute: false, publish: false, upload: false } };
}
