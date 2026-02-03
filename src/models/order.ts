import { orders } from "@/db/schema";
import { db } from "@/db";
import { asc, desc, eq, gte, lte, or } from "drizzle-orm";
import { and } from "drizzle-orm";

export enum OrderStatus {
  Created = "created",
  Paid = "paid",
  Deleted = "deleted",
}

export async function insertOrder(data: typeof orders.$inferInsert) {
  const [order] = await db().insert(orders).values(data).returning();

  return order;
}

export async function findOrderByOrderNo(
  order_no: string
): Promise<typeof orders.$inferSelect | undefined> {
  const [order] = await db()
    .select()
    .from(orders)
    .where(eq(orders.order_no, order_no))
    .limit(1);

  return order;
}

/**
 * 通过 session ID 查找订单（用于 PayPal/Stripe）
 * @param session_id PayPal Order ID 或 Stripe Session ID
 */
export async function findOrderBySessionId(
  session_id: string
): Promise<typeof orders.$inferSelect | undefined> {
  const [order] = await db()
    .select()
    .from(orders)
    .where(eq(orders.stripe_session_id, session_id))
    .limit(1);

  return order;
}

export async function getFirstPaidOrderByUserUuid(
  user_uuid: string
): Promise<typeof orders.$inferSelect | undefined> {
  const [order] = await db()
    .select()
    .from(orders)
    .where(
      and(eq(orders.user_uuid, user_uuid), eq(orders.status, OrderStatus.Paid))
    )
    .orderBy(asc(orders.created_at))
    .limit(1);

  return order;
}

export async function getFirstPaidOrderByUserEmail(
  user_email: string
): Promise<typeof orders.$inferSelect | undefined> {
  const [order] = await db()
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.user_email, user_email),
        eq(orders.status, OrderStatus.Paid)
      )
    )
    .orderBy(desc(orders.created_at))
    .limit(1);

  return order;
}

export async function updateOrderStatus(
  order_no: string,
  status: string,
  paid_at: string,
  paid_email: string,
  paid_detail: string
) {
  const [order] = await db()
    .update(orders)
    .set({ status, paid_at: new Date(paid_at), paid_detail, paid_email })
    .where(eq(orders.order_no, order_no))
    .returning();

  return order;
}

export async function updateOrderSession(
  order_no: string,
  stripe_session_id: string,
  order_detail: string
) {
  const [order] = await db()
    .update(orders)
    .set({ stripe_session_id, order_detail })
    .where(eq(orders.order_no, order_no))
    .returning();

  return order;
}

export async function updateOrderSubscription(
  order_no: string,
  sub_id: string,
  sub_interval_count: number,
  sub_cycle_anchor: number,
  sub_period_end: number,
  sub_period_start: number,
  status: string,
  paid_at: string,
  sub_times: number,
  paid_email: string,
  paid_detail: string
) {
  const [order] = await db()
    .update(orders)
    .set({
      sub_id,
      sub_interval_count,
      sub_cycle_anchor,
      sub_period_end,
      sub_period_start,
      status,
      paid_at: new Date(paid_at),
      sub_times,
      paid_email,
      paid_detail,
    })
    .where(eq(orders.order_no, order_no))
    .returning();

  return order;
}

export async function getOrdersByUserUuid(
  user_uuid: string
): Promise<(typeof orders.$inferSelect)[] | undefined> {
  const data = await db()
    .select()
    .from(orders)
    .where(
      and(eq(orders.user_uuid, user_uuid), eq(orders.status, OrderStatus.Paid))
    )
    .orderBy(desc(orders.created_at));

  return data;
}

/**
 * 获取用户的所有订单（包括未支付的，用于调试）
 */
export async function getAllOrdersByUserUuid(
  user_uuid: string
): Promise<(typeof orders.$inferSelect)[] | undefined> {
  const data = await db()
    .select()
    .from(orders)
    .where(eq(orders.user_uuid, user_uuid))
    .orderBy(desc(orders.created_at));

  return data;
}

export async function getOrdersByUserEmail(
  user_email: string
): Promise<(typeof orders.$inferSelect)[] | undefined> {
  const data = await db()
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.user_email, user_email),
        eq(orders.status, OrderStatus.Paid)
      )
    )
    .orderBy(desc(orders.created_at));

  return data;
}

export async function getOrdersByPaidEmail(
  paid_email: string
): Promise<(typeof orders.$inferSelect)[] | undefined> {
  const data = await db()
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.paid_email, paid_email),
        eq(orders.status, OrderStatus.Paid)
      )
    )
    .orderBy(desc(orders.created_at));

  return data;
}

/**
 * 获取通过邮箱支付的所有订单（包括未支付的，用于调试）
 */
export async function getAllOrdersByPaidEmail(
  paid_email: string
): Promise<(typeof orders.$inferSelect)[] | undefined> {
  const data = await db()
    .select()
    .from(orders)
    .where(eq(orders.paid_email, paid_email))
    .orderBy(desc(orders.created_at));

  return data;
}

/**
 * 获取通过用户邮箱创建的所有订单（包括未支付的，用于调试）
 */
export async function getAllOrdersByUserEmail(
  user_email: string
): Promise<(typeof orders.$inferSelect)[] | undefined> {
  const data = await db()
    .select()
    .from(orders)
    .where(eq(orders.user_email, user_email))
    .orderBy(desc(orders.created_at));

  return data;
}

export async function getPaiedOrders(
  page: number,
  limit: number
): Promise<(typeof orders.$inferSelect)[] | undefined> {
  const data = await db()
    .select()
    .from(orders)
    .where(eq(orders.status, OrderStatus.Paid))
    .orderBy(desc(orders.created_at))
    .limit(limit)
    .offset((page - 1) * limit);

  return data;
}

export async function getPaidOrdersTotal(): Promise<number | undefined> {
  try {
    const total = await db()
      .select()
      .from(orders)
      .where(eq(orders.status, OrderStatus.Paid));
    
    return total.length;
  } catch (e) {
    console.log("getPaidOrdersTotal failed: ", e);
    return 0;
  }
}

export async function getOrderCountByDate(
  startTime: string,
  status?: string
): Promise<Map<string, number> | undefined> {
  try {
    const conditions = [gte(orders.created_at, new Date(startTime))];
    if (status) {
      conditions.push(eq(orders.status, status));
    }

    const data = await db()
      .select({ created_at: orders.created_at })
      .from(orders)
      .where(and(...conditions));

    data.sort((a, b) => a.created_at!.getTime() - b.created_at!.getTime());

    const dateCountMap = new Map<string, number>();
    data.forEach((item) => {
      const date = item.created_at!.toISOString().split("T")[0];
      dateCountMap.set(date, (dateCountMap.get(date) || 0) + 1);
    });

    return dateCountMap;
  } catch (e) {
    console.log("getOrderCountByDate failed: ", e);
    return undefined;
  }
}

/**
 * 通过邮箱和金额查找未支付的订单（用于 Creem 支付匹配）
 * @param user_email 用户邮箱（可能是 user_email 或 paid_email）
 * @param amount 订单金额（单位：分）
 */
export async function findOrderByEmailAndAmount(
  user_email: string,
  amount: number
): Promise<typeof orders.$inferSelect | undefined> {
  try {
    // 🔥 扩大时间窗口到 24 小时，因为用户可能不会立即支付
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    // 🔥 允许金额有 ±1 的容差（处理可能的舍入误差）
    const amountMin = amount - 1;
    const amountMax = amount + 1;
    
    // 🔥 尝试匹配 user_email 或 paid_email
    const [order] = await db()
      .select()
      .from(orders)
      .where(
        and(
          // 邮箱匹配：user_email 或 paid_email
          or(
            eq(orders.user_email, user_email),
            eq(orders.paid_email, user_email)
          ),
          // 金额匹配：允许 ±1 的容差
          and(
            gte(orders.amount, amountMin),
            lte(orders.amount, amountMax)
          ),
          // 状态必须是 Created（未支付）
          eq(orders.status, OrderStatus.Created),
          // 订单创建时间在 24 小时内
          gte(orders.created_at, twentyFourHoursAgo)
        )
      )
      .orderBy(desc(orders.created_at))
      .limit(1);

    return order;
  } catch (e) {
    console.log("findOrderByEmailAndAmount failed: ", e);
    return undefined;
  }
}