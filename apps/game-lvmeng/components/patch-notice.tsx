import { patchChecks, patchSource } from '@/lib/data';

export function PatchNotice() {
  return <section aria-labelledby="patch-notice-title">
    <h2 id="patch-notice-title">首发周修复与排障</h2>
    <p>官方公告已更新至10月17日，本站10月18日核验公告；以下不是本站客户端实测结论。</p>
    <div className="grid">{patchChecks.map((item) => <article className="card" key={item.title}><h3>{item.title}</h3><p>{item.detail}</p></article>)}</div>
    <p><a href={patchSource} rel="noreferrer">查看官方持续更新修复说明</a></p>
  </section>;
}
