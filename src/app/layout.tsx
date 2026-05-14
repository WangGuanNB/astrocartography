import "@/app/globals.css";

import { getLocale, setRequestLocale } from "next-intl/server";
import { cn } from "@/lib/utils";
import Script from "next/script";
import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

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
      </head>
      <body className={cn("min-h-screen overflow-x-hidden", inter.variable)} suppressHydrationWarning>
        {children}
        {googleAdsenseCode ? (
          <Script
            id="google-adsense"
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${googleAdsenseCode}`}
            strategy="lazyOnload"
            crossOrigin="anonymous"
          />
        ) : null}
        <Script
          id="code-market-widget"
          src="https://code.market/widget.min.js"
          strategy="lazyOnload"
        />
        <Script id="enforce-external-nofollow" strategy="afterInteractive">
          {`
            (function(){
              try{
                var allowNoFollowHosts = ['startupfa.me'];
                var anchors = document.querySelectorAll('a[href^="http"], a[target="_blank"]');
                anchors.forEach(function(a){
                  var isExternal = a.host && a.host !== window.location.host;
                  if(isExternal){
                    var rel = (a.getAttribute('rel') || '').split(/\s+/).filter(Boolean);
                    var host = a.hostname || '';
                    // always keep opener/noreferrer for security
                    ['noopener','noreferrer'].forEach(function(flag){
                      if(!rel.includes(flag)) rel.push(flag);
                    });
                    // skip adding nofollow for specific hosts
                    if(!allowNoFollowHosts.includes(host)){
                      if(!rel.includes('nofollow')) rel.push('nofollow');
                    }else{
                      // ensure no "nofollow" remains if previously set
                      rel = rel.filter(function(flag){ return flag !== 'nofollow'; });
                    }
                    a.setAttribute('rel', rel.join(' ').trim());
                  }
                });
              }catch(e){}
            })();
          `}
        </Script>
      </body>
    </html>
  );
}
