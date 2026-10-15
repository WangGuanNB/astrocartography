import { respData, respErr } from "@/lib/resp";
import { requestPasswordReset } from "@/services/email-auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await requestPasswordReset({
      email: body?.email,
      locale: body?.locale,
    });

    if (!result.ok) {
      return respErr(result.error);
    }

    return respData({ status: result.status });
  } catch (error) {
    console.log("email reset request failed", error);
    return respErr("generic");
  }
}
