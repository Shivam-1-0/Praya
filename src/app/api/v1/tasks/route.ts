import { withApiAuth } from "@/lib/automation/respond";
import { listTasks } from "@/lib/automation/queries";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  return withApiAuth(request, async (userId) => ({ tasks: await listTasks(userId, from, to) }));
}
