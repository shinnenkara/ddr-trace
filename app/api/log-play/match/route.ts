import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSessionUserFromRequest } from "@/lib/api/get-session-user";
import { ddrCaptureSchema } from "@/lib/ddr-match/ddr-capture-schema";
import { matchAndLogPlay } from "@/lib/ddr-match/parse-results-screen";
import { formatActionError } from "@/lib/api/try-action";

export async function POST(request: Request) {
  const user = await getSessionUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const raw = Object.fromEntries(formData.entries());
    const capture = ddrCaptureSchema.parse({
      ...raw,
      user_id: user.id,
    });
    const data = await matchAndLogPlay(capture);
    revalidatePath("/log");

    return NextResponse.json({ data });
  } catch (err) {
    const { error, errorKind } = formatActionError(err);
    const status = errorKind === "content" ? 422 : 500;

    return NextResponse.json({ error, errorKind }, { status });
  }
}
