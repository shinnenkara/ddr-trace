import { describe, expect, it } from "vitest";
import { buildDdrCaptureFormData } from "./build-ddr-capture-form-data";
import type { CapturedImage } from "@/components/capture/use-capture-image";

describe("buildDdrCaptureFormData", () => {
  const capture: CapturedImage = {
    image: "data:image/webp;base64,abc",
    name: "1.webp",
    mime: "image/webp",
    date: new Date(2026, 4, 25, 18, 45, 0),
  };

  it("uses capture EXIF date for played_at", () => {
    const formData = buildDdrCaptureFormData(capture);

    expect(formData.get("played_at")).toBe(capture.date!.toISOString());
  });

  it("falls back to current time when capture date is missing", () => {
    const before = Date.now();
    const formData = buildDdrCaptureFormData({
      ...capture,
      date: undefined,
    });
    const after = Date.now();
    const playedAt = new Date(String(formData.get("played_at"))).getTime();

    expect(playedAt).toBeGreaterThanOrEqual(before);
    expect(playedAt).toBeLessThanOrEqual(after);
  });
});
