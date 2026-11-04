import { inflateSync } from "node:zlib";
import { assert } from "../auth/security";

const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
function crc32(data: Buffer) {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++)
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/** Chỉ nhận PNG 8-bit RGB/RGBA do canvas xuất; kiểm CRC và stream, bỏ mọi metadata. */
export function sanitizeProofImage(input: unknown): string {
  assert(
    typeof input === "string" &&
      input.length <= 950000 &&
      /^[A-Za-z0-9+/]+={0,2}$/.test(input),
    400,
    "Ảnh không hợp lệ hoặc quá lớn.",
  );
  const file = Buffer.from(input, "base64");
  assert(file.subarray(0, 8).equals(signature), 400, "Cần ảnh PNG hợp lệ.");
  const kept: Buffer[] = [signature];
  const pixels: Buffer[] = [];
  let offset = 8;
  let width = 0;
  let height = 0;
  let channels = 0;
  let ended = false;
  let dataEnded = false;
  while (offset + 12 <= file.length) {
    const size = file.readUInt32BE(offset);
    assert(
      size <= file.length - offset - 12,
      400,
      "Ảnh bị cắt hoặc sai định dạng.",
    );
    const type = file.toString("ascii", offset + 4, offset + 8);
    const payload = file.subarray(offset + 8, offset + 8 + size);
    assert(
      crc32(file.subarray(offset + 4, offset + 8 + size)) ===
        file.readUInt32BE(offset + 8 + size),
      400,
      "Ảnh có checksum không hợp lệ.",
    );
    if (!width) {
      assert(type === "IHDR" && size === 13, 400, "Thiếu thông tin ảnh.");
      width = payload.readUInt32BE(0);
      height = payload.readUInt32BE(4);
      channels = payload[9] === 2 ? 3 : payload[9] === 6 ? 4 : 0;
      assert(
        width > 0 &&
          height > 0 &&
          width <= 1600 &&
          height <= 1600 &&
          channels > 0 &&
          payload[8] === 8 &&
          payload[10] === 0 &&
          payload[11] === 0 &&
          payload[12] === 0,
        400,
        "Ảnh cần RGB/RGBA tối đa 1600px.",
      );
    } else {
      assert(type !== "IHDR", 400, "Header ảnh bị lặp.");
    }
    if (type === "IDAT") {
      assert(!dataEnded, 400, "Dữ liệu ảnh không liên tục.");
      pixels.push(payload);
    } else if (pixels.length) dataEnded = true;
    if (["IHDR", "IDAT", "IEND"].includes(type))
      kept.push(file.subarray(offset, offset + 12 + size));
    else
      assert(
        type[0] === type[0].toLowerCase(),
        400,
        "Ảnh có định dạng không được hỗ trợ.",
      );
    offset += size + 12;
    if (type === "IEND") {
      assert(size === 0, 400, "Kết thúc ảnh không hợp lệ.");
      ended = true;
      break;
    }
  }
  assert(
    ended && offset === file.length && pixels.length > 0,
    400,
    "Ảnh không hoàn chỉnh.",
  );
  let decoded: Buffer;
  try {
    decoded = inflateSync(Buffer.concat(pixels), {
      maxOutputLength: (width * channels + 1) * height,
    });
  } catch {
    assert(false, 400, "Không đọc được dữ liệu ảnh.");
  }
  assert(
    decoded!.length === (width * channels + 1) * height,
    400,
    "Kích thước dữ liệu ảnh không khớp.",
  );
  for (let row = 0; row < height; row++)
    assert(
      decoded![row * (width * channels + 1)] <= 4,
      400,
      "Bộ lọc ảnh không hợp lệ.",
    );
  return Buffer.concat(kept).toString("base64");
}
