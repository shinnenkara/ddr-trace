import { beforeEach, describe, expect, it, vi } from "vitest";
import * as ExifReader from "exifreader";
import {
  extractCaptureDate,
  getCaptureMetadata,
  parseExifDateString,
} from "./get-capture-metadata";

vi.mock("exifreader", () => ({
  loadView: vi.fn(),
}));

describe("parseExifDateString", () => {
  it("parses standard EXIF datetime format as local time", () => {
    const date = parseExifDateString("2026:06:01 14:30:00");

    expect(date).toEqual(new Date(2026, 5, 1, 14, 30, 0));
  });

  it("parses ISO-like T-separated datetime", () => {
    const date = parseExifDateString("2026:06:01T09:15:30");

    expect(date).toEqual(new Date(2026, 5, 1, 9, 15, 30));
  });
});

describe("extractCaptureDate", () => {
  it("prefers DateTimeOriginal over other tags", () => {
    const tags = {
      DateTimeOriginal: { description: "2026:05:25 10:00:00" },
      DateTime: { description: "2026:06:08 12:00:00" },
    } as ExifReader.Tags;

    const date = extractCaptureDate(tags);

    expect(date).toEqual(new Date(2026, 4, 25, 10, 0, 0));
  });

  it("falls through tag priority when earlier tags are missing", () => {
    const tags = {
      CreateDate: { description: "2026:05:20 08:30:00" },
      ModifyDate: { description: "2026:06:08 12:00:00" },
    } as ExifReader.Tags;

    const date = extractCaptureDate(tags);

    expect(date).toEqual(new Date(2026, 4, 20, 8, 30, 0));
  });

  it("returns undefined when no date tags are present", () => {
    expect(extractCaptureDate({} as ExifReader.Tags)).toBeUndefined();
  });
});

describe("getCaptureMetadata", () => {
  beforeEach(() => {
    vi.mocked(ExifReader.loadView).mockReset();
  });

  it("reads EXIF from uploaded file blobs", async () => {
    vi.mocked(ExifReader.loadView).mockResolvedValue({
      DateTimeOriginal: { description: "2026:05:25 18:45:00" },
    } as ExifReader.Tags);

    const blob = new Blob([new Uint8Array([0xff, 0xd8])], {
      type: "image/jpeg",
    });
    const metadata = await getCaptureMetadata(blob);

    expect(ExifReader.loadView).toHaveBeenCalledOnce();
    expect(metadata.createdAt).toEqual(new Date(2026, 4, 25, 18, 45, 0));
  });

  it("returns empty metadata when EXIF has no date tags", async () => {
    vi.mocked(ExifReader.loadView).mockResolvedValue({} as ExifReader.Tags);

    const blob = new Blob([new Uint8Array([0xff, 0xd8])], {
      type: "image/jpeg",
    });
    const metadata = await getCaptureMetadata(blob);

    expect(metadata).toEqual({});
  });
});
