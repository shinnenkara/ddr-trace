import * as ExifReader from "exifreader";

export type ImageMetadata = {
  createdAt?: Date;
};

export async function getCaptureMetadata(
  capture: Blob,
): Promise<ImageMetadata> {
  const buffer = await capture.arrayBuffer();
  const dataView = new DataView(buffer);
  const tags = await ExifReader.loadView(dataView, { async: true });
  const captureDate = extractCaptureDate(tags);

  return {
    createdAt: captureDate,
  };
}

const dateTags: string[] = [
  "DateTimeOriginal",
  "DateTime",
  "CreateDate",
  "ModifyDate",
  "DateTimeDigitized",
];

export function extractCaptureDate(tags: ExifReader.Tags): Date | undefined {
  for (const tagName of dateTags) {
    if (!tags[tagName]?.description && tags[tagName]?.value) {
      continue;
    }

    const dateValue = tags[tagName]?.description || tags[tagName]?.value;
    if (typeof dateValue !== "string") {
      continue;
    }

    try {
      return parseExifDateString(dateValue);
    } catch (parseError) {
      console.warn(`Failed to parse date from ${tagName}:`, parseError);
    }
  }

  return;
}

export function parseExifDateString(s: string): Date | undefined {
  const potentialDate = s.trim();

  let split = potentialDate.split(" ");
  if (split.length < 2) {
    split = potentialDate.split("T");
  }
  const [date, time] = split;
  const [year, month, day] = date.split(":");

  try {
    const [hours, minutes, other] = time.split(":");
    const seconds = other[0] + other[1];

    return new Date(+year, +month - 1, +day, +hours, +minutes, +seconds);
  } catch {
    return new Date(+year, +month, +day);
  }
}
