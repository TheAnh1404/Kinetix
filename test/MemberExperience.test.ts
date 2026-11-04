import { expect } from "chai";
import { deflateSync } from "node:zlib";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { sanitizeProofImage } from "../backend/src/services/proofImage";
import { decimalAmount } from "../backend/src/services/chainService";

function chunk(type: string, data = Buffer.alloc(0)) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const encoded = Buffer.concat([Buffer.from(type), data]);
  let crc = 0xffffffff;
  for (const byte of encoded) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
  return Buffer.concat([length, encoded, checksum]);
}
function image({
  width = 1,
  payload = Buffer.from([0, 20, 40, 60]),
  metadata = false,
} = {}) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width);
  ihdr.writeUInt32BE(1, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    ...(metadata
      ? [
          chunk("tEXt", Buffer.from("Private GPS metadata")),
          chunk("eXIf", Buffer.from("EXIF")),
        ]
      : []),
    chunk("IDAT", deflateSync(payload)),
    chunk("IEND"),
  ]);
}

describe("Private chore proof validation", () => {
  it("accepts decodable RGB PNG and strips EXIF/text rather than storing metadata", () => {
    const normalized = Buffer.from(
      sanitizeProofImage(image({ metadata: true }).toString("base64")),
      "base64",
    );
    expect(normalized.equals(image())).to.equal(true);
    expect(normalized.includes(Buffer.from("GPS"))).to.equal(false);
  });
  it("rejects renamed HTML/SVG, truncated streams, invalid CRC and oversized images", () => {
    for (const invalid of [
      Buffer.from("<svg onload='bad()'/ >"),
      image().subarray(0, 25),
      image({ width: 2000 }),
    ])
      expect(() => sanitizeProofImage(invalid.toString("base64"))).to.throw();
    const corrupt = image();
    corrupt[45] ^= 1;
    expect(() => sanitizeProofImage(corrupt.toString("base64"))).to.throw();
    expect(() => sanitizeProofImage("A".repeat(950001))).to.throw();
  });
  it("bounds decompression, rejects invalid filter bytes and appended payloads", () => {
    expect(() =>
      sanitizeProofImage(
        image({ payload: Buffer.alloc(100000) }).toString("base64"),
      ),
    ).to.throw();
    expect(() =>
      sanitizeProofImage(
        image({ payload: Buffer.from([5, 0, 0, 0]) }).toString("base64"),
      ),
    ).to.throw();
    expect(() =>
      sanitizeProofImage(
        Buffer.concat([image(), Buffer.from("<script>")]).toString("base64"),
      ),
    ).to.throw();
  });
});

describe("Member native amounts and payout labels", () => {
  const module = { exports: {} as any };
  const source = ts.transpileModule(
    readFileSync("frontend/src/lib/member.ts", "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;
  new Function("require", "module", "exports", source)(
    require,
    module,
    module.exports,
  );
  const member = module.exports;
  it("preserves a single wei and exact 18-decimal amounts across both tiers", () => {
    expect(member.parseAmount("0,000000000000000001")).to.equal(1n);
    expect(decimalAmount(100000000000000001n)).to.equal("0.100000000000000001");
    expect(member.amountLabel("0.100000000000000001")).to.equal(
      "0,100000000000000001",
    );
    expect(member.parseAmount("9007199254740993")).to.equal(
      9007199254740993n * 10n ** 18n,
    );
  });
  it("rejects invalid, negative, exponent, zero and overprecision inputs before signing", () => {
    for (const value of [
      "",
      "0",
      "-1",
      "1e-3",
      "NaN",
      "0.0000000000000000001",
      "1,2.3",
      "999999999999999999999",
    ])
      expect(() => member.parseAmount(value)).to.throw();
  });
  it("does not label an approved request paid and respects actual expiry/quorum", () => {
    const request = {
      status: "APPROVED",
      approvalsCount: 3,
      requiredApprovals: 3,
    };
    expect(member.requestStatus(request)).not.to.equal("Đã rút về ví");
    expect(
      member.requestStatus({
        ...request,
        status: "PENDING",
        deadline: "2000-01-01",
      }),
    ).to.equal("Đã hết hạn");
    expect(member.requestStatus({ ...request, status: "PENDING" })).to.include(
      "3/3",
    );
    expect(
      member.requestStatus({
        ...request,
        status: "EXECUTED",
        deadline: "2000-01-01",
      }),
    ).to.equal("Đã rút về ví");
  });
});
