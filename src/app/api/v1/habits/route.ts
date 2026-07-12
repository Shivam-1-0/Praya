import { withApiAuth } from "@/lib/automation/respond";
import { listHabits } from "@/lib/automation/queries";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const raw = url.searchParams.get("archived");
  const archived = raw === "true" ? true : raw === "false" ? false : null;
  return withApiAuth(request, async (userId) => ({ habits: await listHabits(userId, archived) }));
}
