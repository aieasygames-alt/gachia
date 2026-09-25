import { GameNav } from '@/components/game-nav';

export default function LvmengLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <><GameNav />{children}</>;
}
