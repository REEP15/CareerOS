import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { escapeRegExp } from "@/lib/utils";

const generatedRoot = path.join(process.cwd(), "public", "generated");

export async function writeTextPdf({
  fileName,
  lines,
}: {
  fileName: string;
  lines: string[];
}) {
  await mkdir(generatedRoot, { recursive: true });

  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
  const filePath = path.join(generatedRoot, sanitizedFileName);
  const pdf = createSimplePdf(lines);

  await writeFile(filePath, pdf);

  return {
    filePath,
    pdfUrl: `/generated/${sanitizedFileName}`,
  };
}

function createSimplePdf(lines: string[]) {
  const pageLines = lines.flatMap((line) => wrapLine(line, 88)).slice(0, 48);
  const content = [
    "BT",
    "/F1 11 Tf",
    "50 760 Td",
    "14 TL",
    ...pageLines.map((line, index) => `${index === 0 ? "" : "T* "}${toPdfText(line)} Tj`),
    "ET",
  ].join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(content, "utf8")} >>\nstream\n${content}\nendstream`,
  ];
  const chunks = ["%PDF-1.4\n"];
  const offsets: number[] = [0];

  for (const [index, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(chunks.join(""), "utf8"));
    chunks.push(`${index + 1} 0 obj\n${object}\nendobj\n`);
  }

  const xrefOffset = Buffer.byteLength(chunks.join(""), "utf8");
  chunks.push(`xref\n0 ${objects.length + 1}\n`);
  chunks.push("0000000000 65535 f \n");

  for (const offset of offsets.slice(1)) {
    chunks.push(`${offset.toString().padStart(10, "0")} 00000 n \n`);
  }

  chunks.push(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);

  return Buffer.from(chunks.join(""), "utf8");
}

function wrapLine(line: string, maxLength: number) {
  if (line.length <= maxLength) {
    return [line];
  }

  const words = line.split(" ");
  const wrapped: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;

    if (next.length > maxLength) {
      wrapped.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) {
    wrapped.push(current);
  }

  return wrapped;
}

function toPdfText(value: string) {
  return `(${escapeRegExp(value)})`;
}
