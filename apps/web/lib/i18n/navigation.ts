import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

export { WorkerSafeLink as Link } from './worker-safe-link';

export const { redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
