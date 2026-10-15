import { respData, respErr } from "@/lib/resp";
import { registerWithEmail } from "@/services/email-auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await registerWithEmail({
      email: body?.email,
      password: body?.password,
      locale: body?.locale,
    });

    if (!result.ok) {
      return respErr(result.error);
    }

    return respData({ status: result.status });
  } catch (error) {
    console.log("email register failed", error);
    return respErr("generic");
  }
}
