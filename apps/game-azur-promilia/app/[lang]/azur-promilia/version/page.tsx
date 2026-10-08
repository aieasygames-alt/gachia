import { versionTimeline } from '@/lib/data';
import { asLocale, localize } from '@/lib/i18n';
import { metadata, url } from '@/lib/seo';
import { GameNav } from '@/components/game-nav';

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const locale = asLocale((await params).lang);
  return metadata(locale, localize(locale, { zh: '蓝色星原：旅谣版本与上线时间', en: 'Azur Promilia Version and Launch Status', ja: 'アズールプロミリア バージョン・配信状況' }), localize(locale, { zh: '追踪蓝色星原：旅谣官方测试、平台、地区与上线公告。', en: 'Track official Azur Promilia test, platform, region, and launch announcements.', ja: '公式テスト、対応機種、地域、配信告知を追跡します。' }), 'version');
}

export default async function Version({ params }: { params: Promise<{ lang: string }> }) {
  const locale = asLocale((await params).lang);
  const title = localize(locale, { zh: '版本与上线状态', en: 'Version and launch status', ja: 'バージョン・配信状況' });
  const feedback = locale === 'zh'
    ? ['性能与切场：玩家集中提到掉帧、黑屏和加载切换问题；这些是测试反馈线索，不代表官方已承诺修复。', '养成与抽取：保底、常驻自选、资源产出和装备打造随机性是高频讨论；正式规则与福利仍待官方公测公告。', '操作与界面：转向手感、键位自定义、奇波分类与家园界面效率被多次提及；后续仅以补丁公告或正式客户端可复现结果更新。']
    : locale === 'ja'
      ? ['パフォーマンスと画面遷移：フレーム低下、ブラックスクリーン、ロードはテストのフィードバックであり、公式の修正約束ではありません。', '育成とガチャ：天井、恒常選択、資源産出、製作乱数は頻出話題ですが、正式版の規則は公式告知待ちです。', '操作とUI：旋回感、キー設定、キボ分類、拠点導線が繰り返し話題になっています。更新はパッチノートまたは正式版で再現できる結果のみ反映します。']
      : ['Performance and transitions: players frequently mentioned frame drops, black screens, and loading; these are test-feedback leads, not promised fixes.', 'Progression and pulls: pity, standard selection, resource income, and crafting RNG are recurring discussion points; release rules remain pending official notice.', 'Controls and UI: turning feel, key remapping, Kibo sorting, and homestead navigation were repeatedly discussed; updates require patch notes or reproducible release behavior.'];

  return <><GameNav locale={locale} current="version"/><main id="main-content" tabIndex={-1} className="content">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'CollectionPage', name: title, url: url(locale, 'version') }) }} />
    <h1>{title}</h1>
    <p className="lead">{localize(locale, { zh: '只记录可由官方来源核验的公告；未确认项目保持观察状态。', en: 'Only announcements verifiable through official sources are published; unconfirmed items remain under watch.', ja: '公式情報で確認できる告知のみ掲載し、未確認項目は監視状態にします。' })}</p>
    <p className="notice">{localize(locale, { zh: '「旅迹测试」已于 2026 年 10 月 7 日 16:00（UTC+8）结束，服务器已关闭，测试数据不保留。计费删档测试的充值返还以正式公测后的官方规则为准；公测日期尚未由官方公布。', en: 'The Travel Trace Test ended at 16:00 UTC+8 on October 7, 2026. Servers are closed and test data is not retained. Paid wipe-test rebates follow official release rules; no public release date has been announced.', ja: '「旅跡テスト」は2026年10月7日16:00（UTC+8）に終了し、サーバーは閉鎖、テストデータは保持されません。課金削除テストの返還は正式配信後の公式規則に従い、配信日は未発表です。' })}</p>
    <section className="grid">{versionTimeline.map((entry) => <article className="card" key={entry.id}><div className="card__title">{entry.label[locale]}</div><div className="card__badge">{entry.status === 'confirmed' ? 'Confirmed' : localize(locale, { zh: '待官方确认', en: 'Awaiting official confirmation', ja: '公式確認待ち' })}</div><p className="card__meta">{entry.platform.join(', ') || localize(locale, { zh: '平台待确认', en: 'Platforms pending', ja: '対応機種確認待ち' })} · {entry.region.join(', ') || localize(locale, { zh: '地区待确认', en: 'Regions pending', ja: '地域確認待ち' })}</p><p>{entry.eligibility[locale]}</p><p className="card__meta">{entry.changeSummary[locale]}</p>{entry.source && <p className="source-line"><a href={entry.source.url} target="_blank" rel="noreferrer">{entry.source.name}</a> ({entry.source.checkedAt})</p>}</article>)}</section>
    <section><h2>{localize(locale, { zh: '测试反馈观察', en: 'Test feedback watch', ja: 'テストフィードバック観測' })}</h2><p className="lead">{localize(locale, { zh: '以下为公开社媒讨论的归纳，用于后续核验，不是官方修复清单或正式版承诺。', en: 'The following is a synthesis of public social discussion for later verification, not an official fix list or release promise.', ja: '以下は後続検証のための公開SNS議論の要約であり、公式の修正リストや正式版の約束ではありません。' })}</p><div className="grid">{feedback.map((item) => <article className="card" key={item}><p>{item}</p></article>)}</div></section>
  </main></>;
}
