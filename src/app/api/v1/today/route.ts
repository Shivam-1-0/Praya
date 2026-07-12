import { withApiAuth } from "@/lib/automation/respond";
import { getTodaySnapshot } from "@/lib/automation/queries";

export async function GET(request: Request) {
  return withApiAuth(request, (userId) => getTodaySnapshot(userId));
}
