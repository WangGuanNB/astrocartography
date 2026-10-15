import { respData, respErr } from "@/lib/resp";
import { resetEmailPassword } from "@/services/email-auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await resetEmailPassword({
      token: body?.token,
      password: body?.password,
    });

    if (!result.ok) {
      return respErr(result.error);
    }

    return respData({ status: result.status });
  } catch (error) {
    console.log("email password reset failed", error);
    return respErr("generic");
  }
}
