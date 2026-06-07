import type { z } from "zod";
import { getSessionUser } from "@/lib/api/get-session-user";

export class Validator<T extends { user_id: string }> {
  constructor(private schema: z.ZodType<T>) {}

  async validateAuth(formData: FormData): Promise<T> {
    const user = await getSessionUser();

    if (!user) {
      throw new Error("Unauthorized");
    }

    const raw = Object.fromEntries(formData.entries());
    return this.schema.parse({ ...raw, user_id: user.id });
  }

  async requireUserId(): Promise<string> {
    const user = await getSessionUser();

    if (!user) {
      throw new Error("Unauthorized");
    }

    return user.id;
  }
}
