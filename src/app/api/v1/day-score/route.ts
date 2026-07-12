import { withApiAuth } from "@/lib/automation/respond";
import { getDayScore } from "@/lib/automation/queries";

export async function GET(request: Request) {
  return withApiAuth(request, (userId) => getDayScore(userId));
}
