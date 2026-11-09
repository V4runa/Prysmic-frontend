import { OgImage, ogAlt, ogContentType, ogSize } from "@/marketing/og";

export const alt = ogAlt;
export const size = ogSize;
export const contentType = ogContentType;

export default function TwitterImage() {
  return OgImage();
}
