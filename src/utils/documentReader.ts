import * as XLSX from 'xlsx';

export interface ReadResult {
  text: string;
  images: string[];
  kind: 'pdf' | 'excel' | 'word' | 'image' | 'text';
}

const readAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(new Error('Could not read the file'));
    fr.readAsDataURL(file);
  });

const downscaleImage = async (dataUrl: string, maxSide = 1800): Promise<string> => {
  const img = new Image();
  await new Promise((res, rej) => {
    img.onload = res;
    img.onerror = rej;
    img.src = dataUrl;
  });
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) return dataUrl;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.85);
};

async function readPdf(file: File): Promise<ReadResult> {
  const pdfjs = await import('pdfjs-dist');
  const workerSrc = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

  const buffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: buffer }).promise;
  const maxPages = Math.min(pdf.numPages, 8);

  let text = '';
  for (let p = 1; p <= maxPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((i: unknown) => (i as { str?: string }).str || '')
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (pageText) text += `\n--- Page ${p} ---\n${pageText}`;
  }

  const images: string[] = [];
  // Scanned or image-only PDFs give little text — render pages so the model can read them.
  if (text.replace(/\s/g, '').length < 200) {
    for (let p = 1; p <= Math.min(maxPages, 4); p++) {
      const page = await pdf.getPage(p);
      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport, canvas } as never).promise;
      images.push(await downscaleImage(canvas.toDataURL('image/jpeg', 0.85)));
    }
  }

  return { text: text.trim(), images, kind: 'pdf' };
}

async function readExcel(file: File): Promise<ReadResult> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { cellDates: true });
  let text = '';
  wb.SheetNames.slice(0, 6).forEach((name) => {
    const csv = XLSX.utils.sheet_to_csv(wb.Sheets[name], { blankrows: false, dateNF: 'yyyy-mm-dd' });
    if (csv.trim()) text += `\n--- Sheet: ${name} ---\n${csv}`;
  });
  return { text: text.trim(), images: [], kind: 'excel' };
}

async function readWord(file: File): Promise<ReadResult> {
  const mammoth = await import('mammoth');
  const buffer = await file.arrayBuffer();
  const result = await mammoth.convertToHtml({ arrayBuffer: buffer });
  const div = document.createElement('div');
  div.innerHTML = result.value;
  // Keep table structure readable as pipe-separated rows.
  div.querySelectorAll('td, th').forEach((cell) => cell.append(' | '));
  div.querySelectorAll('tr, p, br').forEach((el) => el.append('\n'));
  const text = (div.textContent || '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  return { text, images: [], kind: 'word' };
}

async function readImage(file: File): Promise<ReadResult> {
  const dataUrl = await readAsDataUrl(file);
  return { text: '', images: [await downscaleImage(dataUrl)], kind: 'image' };
}

export const SUPPORTED_EXTENSIONS = '.pdf,.xlsx,.xls,.csv,.doc,.docx,.png,.jpg,.jpeg,.webp,.txt';

export async function readDocument(file: File): Promise<ReadResult> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.pdf')) return readPdf(file);
  if (/\.(xlsx|xls|csv)$/.test(name)) return readExcel(file);
  if (/\.(docx|doc)$/.test(name)) return readWord(file);
  if (/\.(png|jpe?g|webp|gif|bmp|tiff?)$/.test(name)) return readImage(file);
  if (file.type.startsWith('image/')) return readImage(file);
  const text = await file.text();
  return { text: text.slice(0, 120000), images: [], kind: 'text' };
}
