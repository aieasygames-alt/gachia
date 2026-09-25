import { contentStatus } from '@/lib/data';

export function ContentStatus({ label = contentStatus.official }: { label?: string }) {
  return <p className="content-status"><strong>{label}</strong><span>最后核验：{contentStatus.verifiedAt}</span><span>以官方公告和当前客户端为准</span></p>;
}
