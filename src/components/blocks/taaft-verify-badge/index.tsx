/**
 * TAAFT ownership verification badge.
 * Must appear only on https://astrocarto.org/ (EN homepage) — not in shared header/footer.
 * Keep markup close to TAAFT's embed snippet so their crawler can match it.
 */
export default function TaaftVerifyBadge() {
  return (
    <section
      id="taaft-verify"
      className="pb-10 pt-2"
      aria-label="Featured on There's An AI For That"
    >
      <div className="container flex justify-center px-8">
        <a
          href="https://theresanaiforthat.com/ai/free-astrocartography-calculator-with-ai/?ref=featured&v=4854509"
          target="_blank"
          rel="nofollow"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- TAAFT crawler expects this remote badge URL */}
          <img
            width={300}
            height={62}
            src="https://media.theresanaiforthat.com/featured-on-taaft.png?width=600"
            alt="Featured on There's An AI For That"
            className="h-auto w-[300px] max-w-full opacity-80 transition-opacity hover:opacity-100"
          />
        </a>
      </div>
    </section>
  );
}
