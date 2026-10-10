export interface ImageDimensions { width: number; height: number }

const at = (bytes: Uint8Array, offset: number) => bytes[offset] ?? 0;
const u16be = (bytes: Uint8Array, offset: number) => (at(bytes, offset) << 8) | at(bytes, offset + 1);
const u24le = (bytes: Uint8Array, offset: number) => at(bytes, offset) | (at(bytes, offset + 1) << 8) | (at(bytes, offset + 2) << 16);
const u32be = (bytes: Uint8Array, offset: number) => ((at(bytes, offset) << 24) | (at(bytes, offset + 1) << 16) | (at(bytes, offset + 2) << 8) | at(bytes, offset + 3)) >>> 0;

export function imageDimensions(bytes: Uint8Array, contentType: string): ImageDimensions | null {
  if (contentType === "image/png" && bytes.length >= 24) {
    const width = u32be(bytes, 16), height = u32be(bytes, 20);
    return width > 0 && height > 0 ? { width, height } : null;
  }
  if (contentType === "image/jpeg") {
    let offset = 2;
    while (offset + 8 < bytes.length) {
      if (bytes[offset] !== 0xff) { offset += 1; continue; }
      const marker = at(bytes, offset + 1);
      if ([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)) {
        const height = u16be(bytes, offset + 5), width = u16be(bytes, offset + 7);
        return width > 0 && height > 0 ? { width, height } : null;
      }
      const length = u16be(bytes, offset + 2);
      if (length < 2) break;
      offset += 2 + length;
    }
  }
  if (contentType === "image/webp" && bytes.length >= 30) {
    const chunk = String.fromCharCode(...bytes.slice(12, 16));
    if (chunk === "VP8X") return { width: 1 + u24le(bytes, 24), height: 1 + u24le(bytes, 27) };
    if (chunk === "VP8 " && bytes.length >= 30) return { width: (at(bytes, 26) | (at(bytes, 27) << 8)) & 0x3fff, height: (at(bytes, 28) | (at(bytes, 29) << 8)) & 0x3fff };
    if (chunk === "VP8L" && bytes.length >= 25) {
      const bits = at(bytes, 21) | (at(bytes, 22) << 8) | (at(bytes, 23) << 16) | (at(bytes, 24) << 24);
      return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
    }
  }
  return null;
}
