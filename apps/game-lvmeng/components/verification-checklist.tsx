'use client';

import { useMemo } from 'react';
import { useVerificationProgress } from './use-verification-progress';

type Check = { id: string; title: string; description: string };

const checks: Check[] = [
  { id: 'version', title: '记录当前版本号', description: '资料需要关联当前客户端版本，避免版本更新覆盖历史结论。' },
  { id: 'character', title: '核对角色图鉴', description: '确认角色名称、等级上限、技能说明与获取方式。' },
  { id: 'equipment', title: '核对装备系统', description: '确认装备类别、属性入口与实际生效规则。' },
  { id: 'materials', title: '核对材料来源', description: '确认掉落、用途、周期或前置条件，并记录可复现路径。' },
  { id: 'rewards', title: '核对活动有效期', description: '确认奖励、兑换或限时活动的领取入口与结束时间。' },
];

export function VerificationChecklist() {
  const storageKey = 'gachia-lvmeng-progression-verification-v1';
  const { complete, setComplete, storageUnavailable } = useVerificationProgress(storageKey);
  const done = useMemo(() => checks.filter((check) => complete.includes(check.id)).length, [complete]);
  const toggle = (id: string) => setComplete((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);

  return <section className="verification-checklist">
    <div className="verification-checklist__head"><div><span>发布前核验</span><h2>资料录入检查表</h2></div><strong aria-live="polite">{done} / {checks.length}</strong></div>
    <p>该清单仅保存在当前浏览器，用于追踪已完成的资料核验；它不会把未确认内容变成正式数据。</p>
    {storageUnavailable && <p role="status">浏览器存储不可用，当前勾选仅在本页有效，关闭页面后可能丢失。</p>}
    <div className="verification-checklist__list">{checks.map((check) => {
      const checked = complete.includes(check.id);
      return <label className={checked ? 'verification-checklist__item verification-checklist__item--done' : 'verification-checklist__item'} key={check.id}>
        <input checked={checked} onChange={() => toggle(check.id)} type="checkbox" />
        <span><strong>{check.title}</strong><small>{check.description}</small></span>
      </label>;
    })}</div>
  </section>;
}
