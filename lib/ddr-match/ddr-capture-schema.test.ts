import { describe, expect, it } from "vitest";
import { ddrCaptureSchema } from "./ddr-capture-schema";

describe("ddrCaptureSchema", () => {
  it("strips base64 prefix from capture", () => {
    const parsed = ddrCaptureSchema.parse({
      capture_base64: "data:image/webp;base64,abc123",
      name: "1.webp",
      mime: "image/webp",
      played_at: "2026-06-07T12:00:00.000Z",
      user_id: "user-1",
    });

    expect(parsed.capture_base64).toBe("abc123");
  });

  it("rejects invalid base64 format", () => {
    expect(() =>
      ddrCaptureSchema.parse({
        capture_base64: "not-valid",
        name: "1.webp",
        mime: "image/webp",
        played_at: "2026-06-07T12:00:00.000Z",
        user_id: "user-1",
      }),
    ).toThrow();
  });

  it("defaults chart_type to single", () => {
    const parsed = ddrCaptureSchema.parse({
      capture_base64: "data:image/webp;base64,abc123",
      name: "1.webp",
      mime: "image/webp",
      played_at: "2026-06-07T12:00:00.000Z",
      user_id: "user-1",
    });

    expect(parsed.chart_type).toBe("single");
  });

  it("accepts explicit chart_type double", () => {
    const parsed = ddrCaptureSchema.parse({
      capture_base64: "data:image/webp;base64,abc123",
      name: "1.webp",
      mime: "image/webp",
      chart_type: "double",
      played_at: "2026-06-07T12:00:00.000Z",
      user_id: "user-1",
    });

    expect(parsed.chart_type).toBe("double");
  });

  it("defaults player_side to auto", () => {
    const parsed = ddrCaptureSchema.parse({
      capture_base64: "data:image/webp;base64,abc123",
      name: "1.webp",
      mime: "image/webp",
      played_at: "2026-06-07T12:00:00.000Z",
      user_id: "user-1",
    });

    expect(parsed.player_side).toBe("auto");
  });

  it("accepts explicit player_side right", () => {
    const parsed = ddrCaptureSchema.parse({
      capture_base64: "data:image/webp;base64,abc123",
      name: "1.webp",
      mime: "image/webp",
      player_side: "right",
      played_at: "2026-06-07T12:00:00.000Z",
      user_id: "user-1",
    });

    expect(parsed.player_side).toBe("right");
  });
});
