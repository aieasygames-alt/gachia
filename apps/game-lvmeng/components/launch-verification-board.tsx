'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useVerificationProgress } from './use-verification-progress';

type Task = { id: string; status: string; title: string; summary: string; action: string; href: string };

export function LaunchVerificationBoard({ tasks }: { tasks: readonly Task[] }) {
  const storageKey = 'gachia-lvmeng-launch-verification-v1';
  const { complete, setComplete, storageUnavailable } = useVerificationProgress(storageKey);
  const [filter, setFilter] = useState('all');
  const statuses = useMemo(() => [...new Set(tasks.map((task) => task.status))], [tasks]);
  const visible = useMemo(() => tasks.filter((task) => filter === 'all' || task.status === filter), [filter, tasks]);
  const done = complete.filter((id) => tasks.some((task) => task.id === id)).length;
  const toggle = (id: string) => setComplete((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);

  return <section className="launch-board"><div className="launch-board__head"><div><span>本地进度</span><h2>核验清单</h2></div><strong aria-live="polite">{done} / {tasks.length}</strong></div><p>勾选只记录你在当前浏览器中的执行进度。资料是否可发布，仍以官方公告或当前客户端可复现结果为准。</p>{storageUnavailable && <p role="status">浏览器存储不可用，当前勾选仅在本页有效，关闭页面后可能丢失。</p>}<div className="launch-board__tools"><label>显示状态<select value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">全部</option>{statuses.map((status) => <option key={status}>{status}</option>)}</select></label>{complete.length > 0 && <button type="button" onClick={() => setComplete([])}>重置进度</button>}</div><div className="launch-board__list">{visible.map((task, index) => { const checked = complete.includes(task.id); return <article className={checked ? 'launch-board__item launch-board__item--done' : 'launch-board__item'} key={task.id}><label><input checked={checked} onChange={() => toggle(task.id)} type="checkbox" /><span>{index + 1}</span></label><div><em>{task.status}</em><h3>{task.title}</h3><p>{task.summary}</p><Link href={task.href}>{task.action}</Link></div></article>; })}</div></section>;
}
