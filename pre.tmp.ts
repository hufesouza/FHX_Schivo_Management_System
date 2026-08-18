(globalThis as any).localStorage = { getItem: () => null, setItem(){} };
(globalThis as any).document = { createElement: () => ({ click(){} }) };
