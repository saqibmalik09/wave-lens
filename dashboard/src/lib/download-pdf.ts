/**
 * Minimal multi-page text PDF writer (no external deps).
 */
function escapePdfText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function wrapLine(text: string, maxChars: number): string[] {
  const raw = text.replace(/\r/g, '');
  if (!raw) return [''];
  const out: string[] = [];
  for (const paragraph of raw.split('\n')) {
    if (!paragraph) {
      out.push('');
      continue;
    }
    let remaining = paragraph;
    while (remaining.length > maxChars) {
      let breakAt = remaining.lastIndexOf(' ', maxChars);
      if (breakAt < maxChars * 0.5) breakAt = maxChars;
      out.push(remaining.slice(0, breakAt));
      remaining = remaining.slice(breakAt).trimStart();
    }
    out.push(remaining);
  }
  return out;
}

function byteLength(s: string): number {
  return new TextEncoder().encode(s).length;
}

export function downloadTextPdf(filename: string, title: string, body: string): void {
  const pageWidth = 612;
  const pageHeight = 792;
  const margin = 50;
  const fontSize = 10;
  const lineHeight = 14;
  const maxChars = 88;
  const lines = [
    ...wrapLine(title, maxChars),
    '',
    ...body.split('\n').flatMap((l) => wrapLine(l, maxChars)),
  ];

  const linesPerPage = Math.floor((pageHeight - margin * 2) / lineHeight);
  const pages: string[][] = [];
  for (let i = 0; i < lines.length; i += linesPerPage) {
    pages.push(lines.slice(i, i + linesPerPage));
  }
  if (pages.length === 0) pages.push(['']);

  // Object layout:
  // 1 = Catalog, 2 = Pages, 3 = Font, then pairs of (Page, Content) per page
  const fontObjNum = 3;
  const pageObjNums: number[] = [];
  const contentObjNums: number[] = [];
  let next = 4;
  pages.forEach(() => {
    pageObjNums.push(next++);
    contentObjNums.push(next++);
  });

  const objects = new Map<number, string>();

  objects.set(
    1,
    '<< /Type /Catalog /Pages 2 0 R >>',
  );
  objects.set(
    2,
    `<< /Type /Pages /Kids [${pageObjNums.map((n) => `${n} 0 R`).join(' ')}] /Count ${pages.length} >>`,
  );
  objects.set(3, '<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>');

  pages.forEach((pageLines, i) => {
    const ops = ['BT', `/F1 ${fontSize} Tf`, `${lineHeight} TL`, `${margin} ${pageHeight - margin} Td`];
    pageLines.forEach((line, idx) => {
      const safe = escapePdfText(line);
      if (idx === 0) ops.push(`(${safe}) Tj`);
      else ops.push('T*', `(${safe}) Tj`);
    });
    ops.push('ET');
    const stream = ops.join('\n');
    objects.set(
      contentObjNums[i],
      `<< /Length ${byteLength(stream)} >>\nstream\n${stream}\nendstream`,
    );
    objects.set(
      pageObjNums[i],
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Contents ${contentObjNums[i]} 0 R /Resources << /Font << /F1 ${fontObjNum} 0 R >> >> >>`,
    );
  });

  const maxObj = next - 1;
  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];

  for (let i = 1; i <= maxObj; i++) {
    offsets[i] = byteLength(pdf);
    const bodyObj = objects.get(i);
    if (!bodyObj) throw new Error(`Missing PDF object ${i}`);
    pdf += `${i} 0 obj\n${bodyObj}\nendobj\n`;
  }

  const xrefStart = byteLength(pdf);
  pdf += `xref\n0 ${maxObj + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i <= maxObj; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${maxObj + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefStart}\n%%EOF`;

  const blob = new Blob([pdf], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
