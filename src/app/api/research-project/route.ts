import { respData, respErr } from "@/lib/resp";
import { researchProjectInputSchema } from "@/lib/research-project";
import {
  findResearchProjectForUser,
  upsertResearchProjectForUser,
} from "@/models/research-project";
import { getUserUuid } from "@/services/user";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const userUuid = await getUserUuid();
    if (!userUuid) return respErr("no auth");

    const project = await findResearchProjectForUser(userUuid);
    return respData({ project });
  } catch (error) {
    console.error("research project get:", error);
    return respErr("Unable to load research project");
  }
}

export async function PUT(request: Request) {
  try {
    const userUuid = await getUserUuid();
    if (!userUuid) return respErr("no auth");

    const parsed = researchProjectInputSchema.safeParse(await request.json());
    if (!parsed.success) {
      return respErr("Invalid research project");
    }

    const project = await upsertResearchProjectForUser(
      userUuid,
      parsed.data
    );
    return respData({ project });
  } catch (error) {
    console.error("research project save:", error);
    return respErr("Unable to save research project");
  }
}
