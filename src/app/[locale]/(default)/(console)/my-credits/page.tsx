import Empty from "@/components/blocks/empty";
import TableSlot from "@/components/console/slots/table";
import { Table as TableSlotType } from "@/types/slots/table";
import { getCreditsByUserUuid } from "@/models/credit";
import { getTranslations } from "next-intl/server";
import { getUserCredits } from "@/services/credit";
import { getUserUuid } from "@/services/user";
import moment from "moment";
import ManageSubscriptionButton from "@/components/subscription/ManageSubscriptionButton";

export const dynamic = "force-dynamic";

export default async function () {
  const t = await getTranslations();

  const user_uuid = await getUserUuid();

  if (!user_uuid) {
    return <Empty message="no auth" />;
  }

  const data = await getCreditsByUserUuid(user_uuid, 1, 100);

  const userCredits = await getUserCredits(user_uuid);

  const subscriptionTip = userCredits.subscription?.is_active
    ? userCredits.subscription.status === "past_due"
      ? t("my_credits.subscription_past_due", {
          plan: userCredits.subscription.product_name || "Plus",
        })
      : userCredits.subscription.cancel_at_period_end
        ? t("my_credits.subscription_canceling", {
            plan: userCredits.subscription.product_name || "Plus",
            renewal: userCredits.subscription.renewal_label || "—",
          })
        : t("my_credits.subscription_active", {
            plan: userCredits.subscription.product_name || "Plus",
            renewal: userCredits.subscription.renewal_label || "—",
          })
    : null;

  const table: TableSlotType = {
    title: t("my_credits.title"),
    tip: {
      title: [
        t("my_credits.left_tip", {
          left_credits: userCredits?.left_credits || 0,
        }),
        subscriptionTip,
      ]
        .filter(Boolean)
        .join(" · "),
    },
    // TODO: 暂时隐藏 Recharge 按钮
    /* toolbar: {
      items: [
        {
          title: t("my_credits.recharge"),
          url: "/pricing",
          target: "_blank",
          icon: "RiBankCardLine",
        },
      ],
    }, */
    columns: [
      {
        title: t("my_credits.table.trans_no"),
        name: "trans_no",
      },
      {
        title: t("my_credits.table.trans_type"),
        name: "trans_type",
      },
      {
        title: t("my_credits.table.credits"),
        name: "credits",
      },
      {
        title: t("my_credits.table.updated_at"),
        name: "created_at",
        callback: (v: any) => {
          return moment(v.created_at).format("YYYY-MM-DD HH:mm:ss");
        },
      },
    ],
    data,
    empty_message: t("my_credits.no_credits"),
  };

  return (
    <>
      {userCredits.subscription?.provider === "stripe" ? (
        <ManageSubscriptionButton label={t("my_credits.manage_subscription")} />
      ) : null}
      <TableSlot {...table} />
    </>
  );
}
