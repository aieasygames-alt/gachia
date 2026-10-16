'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';
import { allowProductionIntegrations } from '@/lib/production-integrations';

export function ProductionIntegrations() {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    setEnabled(allowProductionIntegrations(process.env.NODE_ENV, window.location.origin));
  }, []);
  if (!enabled) return null;
  return <>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-4L1VKXGY2Y"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-4L1VKXGY2Y');
          `}
        </Script>
        <Script id="microsoft-clarity" strategy="afterInteractive">
          {`
            (function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "yho16e4xxp");
          `}
        </Script>
        <Script
          id="google-adsense"
          strategy="afterInteractive"
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8569630257520732"
          crossOrigin="anonymous"
        />
  </>;
}
