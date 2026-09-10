import "@/app/globals.css";

import type { Metadata } from "next";
import { getLocale, setRequestLocale } from "next-intl/server";
import Script from "next/script";

export const metadata: Metadata = {
  metadataBase: new URL((process.env.NEXT_PUBLIC_WEB_URL || "https://astrocarto.org").replace(/\/$/, "")),
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  setRequestLocale(locale);

  const googleAdsenseCode = process.env.NEXT_PUBLIC_GOOGLE_ADCODE || "";

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        {googleAdsenseCode && (
          <meta name="google-adsense-account" content={googleAdsenseCode} />
        )}

        <link rel="icon" href="/logo.ico" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen overflow-x-hidden" suppressHydrationWarning>
        {children}
        {googleAdsenseCode ? (
          <Script
            id="google-adsense"
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${googleAdsenseCode}`}
            strategy="lazyOnload"
            crossOrigin="anonymous"
          />
        ) : null}
        <Script id="enforce-external-nofollow" strategy="lazyOnload">
          {`
            (function(){
              try{
                var allowNoFollowHosts = ['startupfa.me'];
                var anchors = document.querySelectorAll('a[href^="http"], a[target="_blank"]');
                anchors.forEach(function(a){
                  var isExternal = a.host && a.host !== window.location.host;
                  if(!isExternal) return;

                  var rel = (a.getAttribute('rel') || '').split(/\\s+/).filter(Boolean);
                  ['noopener','noreferrer'].forEach(function(flag){
                    if(!rel.includes(flag)) rel.push(flag);
                  });

                  // Footer partner badges: default keep nofollow; data-dofollow opts out.
                  // Must run before host whitelist so badges are not stripped accidentally.
                  if(a.hasAttribute('data-footer-badge')){
                    if(a.hasAttribute('data-dofollow')){
                      rel = rel.filter(function(flag){ return flag !== 'nofollow'; });
                    }else if(!rel.includes('nofollow')){
                      rel.push('nofollow');
                    }
                  }else{
                    var host = a.hostname || '';
                    if(!allowNoFollowHosts.includes(host)){
                      if(!rel.includes('nofollow')) rel.push('nofollow');
                    }else{
                      rel = rel.filter(function(flag){ return flag !== 'nofollow'; });
                    }
                  }

                  a.setAttribute('rel', rel.join(' ').trim());
                });
              }catch(e){}
            })();
          `}
        </Script>
      </body>
    </html>
  );
}
