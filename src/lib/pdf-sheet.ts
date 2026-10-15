export type Paper = 'A4' | 'Letter';

const paperPoints: Record<Paper, [number, number]> = { A4: [595.28, 841.89], Letter: [612, 792] };
const mm = (value: number) => value / 25.4 * 72;

type PdfBytes = Uint8Array<ArrayBufferLike>;
function bytes(text: string): PdfBytes { return new TextEncoder().encode(text); }

export function buildPhotoSheetPdf(jpeg: Uint8Array, imageWidth: number, imageHeight: number, photoWidthMm: number, photoHeightMm: number, paper: Paper, copies: number) {
  if (!jpeg.length || ![imageWidth, imageHeight, photoWidthMm, photoHeightMm, copies].every(Number.isFinite) || imageWidth < 1 || imageHeight < 1 || photoWidthMm <= 0 || photoHeightMm <= 0 || copies < 1 || copies > 24) throw new Error('INVALID_PDF_INPUT');
  const [pageWidth, pageHeight] = paperPoints[paper]; const margin = mm(10); const gap = mm(5); const photoWidth = mm(photoWidthMm); const photoHeight = mm(photoHeightMm);
  const columns = Math.max(1, Math.floor((pageWidth - 2 * margin + gap) / (photoWidth + gap)));
  const rows = Math.max(1, Math.floor((pageHeight - 2 * margin - mm(14) + gap) / (photoHeight + gap)));
  if (columns * rows < copies) throw new Error('PHOTO_DOES_NOT_FIT');
  const content: string[] = ['q'];
  for (let index = 0; index < copies; index += 1) {
    const col = index % columns; const row = Math.floor(index / columns);
    const x = margin + col * (photoWidth + gap); const y = pageHeight - margin - mm(14) - (row + 1) * photoHeight - row * gap;
    content.push(`${photoWidth.toFixed(3)} 0 0 ${photoHeight.toFixed(3)} ${x.toFixed(3)} ${y.toFixed(3)} cm /Im0 Do`);
  }
  const rulerX = margin; const rulerY = margin / 2; const rulerLength = mm(20);
  content.push(`0 0 0 RG 0.5 w ${rulerX.toFixed(3)} ${rulerY.toFixed(3)} m ${(rulerX + rulerLength).toFixed(3)} ${rulerY.toFixed(3)} l S`);
  content.push(`/F1 7 Tf ${(rulerX + rulerLength + 4).toFixed(3)} ${(rulerY - 2).toFixed(3)} Td (20 mm calibration line) Tj`);
  content.push('Q');
  const stream = bytes(content.join('\n'));
  const objects: PdfBytes[] = [];
  objects.push(bytes('<< /Type /Catalog /Pages 2 0 R >>'));
  objects.push(bytes('<< /Type /Pages /Kids [3 0 R] /Count 1 >>'));
  objects.push(bytes(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth.toFixed(2)} ${pageHeight.toFixed(2)}] /Resources << /XObject << /Im0 5 0 R >> /Font << /F1 6 0 R >> >> /Contents 4 0 R >>`));
  objects.push(concat([bytes(`<< /Length ${stream.length} >>\nstream\n`), stream, bytes('\nendstream')]));
  objects.push(concat([bytes(`<< /Type /XObject /Subtype /Image /Width ${imageWidth} /Height ${imageHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`), jpeg, bytes('\nendstream')]));
  objects.push(bytes('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'));
  return buildPdf(objects);
}

function concat(parts: PdfBytes[]): PdfBytes { const result = new Uint8Array(parts.reduce((total, part) => total + part.length, 0)); let offset = 0; for (const part of parts) { result.set(part, offset); offset += part.length; } return result; }
function buildPdf(objects: PdfBytes[]) {
  const header: PdfBytes = new Uint8Array([37,80,68,70,45,49,46,52,10,37,226,227,207,211,10]); const chunks: PdfBytes[] = [header]; const offsets = [0]; let length = header.length;
  objects.forEach((object, index) => { offsets.push(length); const prefix = bytes(`${index + 1} 0 obj\n`); const suffix = bytes('\nendobj\n'); chunks.push(prefix, object, suffix); length += prefix.length + object.length + suffix.length; });
  const xrefOffset = length; const xref = [`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`, ...offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`), `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`];
  chunks.push(bytes(xref.join(''))); return concat(chunks);
}
