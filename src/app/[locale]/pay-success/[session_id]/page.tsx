import { handleOrderSession } from "@/services/order";
import { redirect } from "@/i18n/navigation";
import { getStripeClient } from "@/lib/stripe";

export default async function ({
  params,
}: {
  params: Promise<{ locale: string; session_id: string }>;
}) {
  let redirectLocale = "en";

  try {
    const { locale, session_id } = await params;
    if (locale) {
      redirectLocale = locale;
    }

    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.retrieve(session_id);

    await handleOrderSession(session);
  } catch (e) {
    redirect({
      href: process.env.NEXT_PUBLIC_PAY_FAIL_URL || "/",
      locale: redirectLocale,
    });
  }

  redirect({
    href: process.env.NEXT_PUBLIC_PAY_SUCCESS_URL || "/",
    locale: redirectLocale,
  });
}
