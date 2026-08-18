import { writeFileSync } from 'fs';
(globalThis as any).localStorage = { getItem: () => null, setItem(){} };
(globalThis as any).__blob = null;
(globalThis as any).document = { createElement: () => ({ click(){} }) };
const OB = globalThis.Blob;
(globalThis as any).Blob = class extends OB { constructor(parts:any, o:any){ super(parts,o); (globalThis as any).__blobParts = parts; } };
(globalThis as any).URL.createObjectURL = (b:any) => { writeFileSync('/tmp/out.pdf', Buffer.from((globalThis as any).__blobParts[0])); return 'blob:x'; };
