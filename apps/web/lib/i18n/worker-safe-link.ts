'use client';

import { createElement, forwardRef } from 'react';
import type { ComponentProps } from 'react';
import { useLocale } from 'next-intl';
import { createNavigation } from 'next-intl/navigation';
import type { SupportedLocale } from '@gachia/core';
import { routing } from './routing';
import { requiresMainDocumentNavigation } from './main-link-policy';

const { Link: IntlLink, getPathname } = createNavigation(routing);
type LocalizedHref = Parameters<typeof getPathname>[0]['href'];
type Props = Omit<ComponentProps<typeof IntlLink>, 'as' | 'href'> & {
  href: string | (Exclude<LocalizedHref, string> & { hash?: string });
};

export const WorkerSafeLink = forwardRef<HTMLAnchorElement, Props>(function WorkerSafeLink(props, ref) {
  const currentLocale = useLocale() as SupportedLocale;
  const pathname = typeof props.href === 'string' ? props.href : props.href.pathname;
  if (!requiresMainDocumentNavigation(pathname)) return createElement(IntlLink, { ...props, ref });
  const hash = typeof props.href === 'object' ? props.href.hash : undefined;
  const localizedHref = getPathname({ href: props.href, locale: props.locale ?? currentLocale })
    + (hash ? (hash.startsWith('#') ? hash : `#${hash}`) : '');

  // Native anchors prevent cross-build RSC prefetch and preserve browser/no-JS behavior.
  const { href, locale, prefetch, replace, scroll, shallow, passHref, legacyBehavior, onNavigate, ...anchor } = props;
  return createElement('a', { ...anchor, ref, href: localizedHref, hrefLang: props.hrefLang ?? locale });
});
