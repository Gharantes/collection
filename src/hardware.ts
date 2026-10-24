// Comparação de processador e placa de vídeo com os requisitos da Steam.
// As notas vêm de src/hardware.json (gerado por scripts/build-hardware.ts): PassMark (CPU Mark e G3D Mark,
// pelo dataset do Kaggle, até 2022) e, para modelos mais novos, estimativas a partir do Blender Open Data.

// [nome, nota, 1 se estimada]
export type HardwareEntry = [string, number, 1?];
export type HardwareData = { cpu: HardwareEntry[]; gpu: HardwareEntry[] };
export type Model = { name: string; score: number; estimated: boolean };
export type HardwareIndex = Map<string, Model>;

// Nome reduzido ao modelo, para casar "Intel(R) Core(TM) i5-8500 CPU @ 3.00GHz" com "Core i5-8500"
// e "NVIDIA GeForce GTX 1060 (6 GB)" com "GTX 1060 6GB".
export const hardwareKey = (name: string) =>
  name
    .toLowerCase()
    .replace(/\(r\)|\(tm\)|®|™/g, " ")
    .replace(/@\s*[\d.]+\s*ghz/g, " ")
    .replace(/\b\d+-core processor\b|\b\d+th gen\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    // "Core2 Quad" e "FX-8350 Eight-Core", "HD7870", "RX 6600XT".
    .replace(/\bcore(\d)/g, "core $1")
    .replace(/\b(dual|triple|quad|six|eight|twelve|sixteen) core\b/g, " ")
    .replace(/\b(hd|gt|gts|gtx|rtx|rx)(\d)/g, "$1 $2")
    .replace(/(\d)(xtx|xt|ti|super|gre)\b/g, "$1 $2")
    .replace(/\b(nvidia|geforce|amd|radeon|intel|core|processor|cpu|graphics|gpu|with|series)\b/g, " ")
    .replace(/\b(\d+) gb\b/g, "$1gb")
    .replace(/\s+/g, " ")
    .trim();

// Chaves curtas ou sem letra e número ("750", "hd") casariam com qualquer coisa no texto.
const usableKey = (key: string) => key.length >= 4 && /[a-z]/.test(key) && /\d/.test(key);

// Outras formas de citar o modelo: "RX 470/570" vale para os dois; "2060 Super" e "1080 Ti" sem o "RTX"/"GTX".
const aliases = (key: string) => {
  const out = [key];
  const pair = key.match(/^(.* )(\d+) (\d+)$/);
  if (pair && pair[2].length === pair[3].length) out.push(pair[1] + pair[2], pair[1] + pair[3]);
  for (const k of [...out]) if (/^[gr]tx \d{4}/.test(k)) out.push(k.slice(4));
  return out.filter(usableKey);
};

export const buildIndex = (entries: HardwareEntry[]): HardwareIndex => {
  const index: HardwareIndex = new Map();
  // Nomes exatos primeiro, para um alias não tomar o lugar de um modelo com aquele nome.
  const all = entries.flatMap(([name, score, estimated]) =>
    aliases(hardwareKey(name)).map((key, i) => ({ key, i, model: { name, score, estimated: !!estimated } })),
  );
  for (const { key, model } of all.sort((a, b) => a.i - b.i)) if (!index.has(key)) index.set(key, model);
  return index;
};

// Modelos citados no texto; um modelo contido em outro mais específico ("gtx 1060" em "gtx 1060 6gb") sai.
export const findModels = (text: string, index: HardwareIndex): Model[] => {
  const padded = ` ${hardwareKey(text)} `;
  const keys = [...index.keys()].filter((k) => padded.includes(` ${k} `));
  const models = keys.filter((k) => !keys.some((o) => o !== k && ` ${o} `.includes(` ${k} `))).map((k) => index.get(k)!);
  return [...new Set(models)];
};

// O modelo do próprio PC: pelo nome inteiro, ou pelo modelo achado dentro dele.
export const identify = (name: string, index: HardwareIndex): Model | null =>
  index.get(hardwareKey(name)) ?? findModels(name, index).sort((a, b) => b.score - a.score)[0] ?? null;

export type Verdict = "ok" | "close" | "below";

export type Comparison = {
  required: Model[];
  // O mais fraco dos citados: "i7-6700 ou Ryzen 5 1600" são alternativas equivalentes.
  weakest: Model;
  mine: Model;
  ratio: number;
  verdict: Verdict;
};

// Até 15% abaixo conta como "por pouco".
export const compare = (required: Model[], mine: Model | null): Comparison | null => {
  if (required.length === 0 || !mine) return null;
  const weakest = required.reduce((a, b) => (b.score < a.score ? b : a));
  const ratio = mine.score / weakest.score;
  const verdict = ratio >= 1 ? "ok" : ratio >= 0.85 ? "close" : "below";
  return { required, weakest, mine, ratio, verdict };
};

export const isCpuLabel = (label: string) => /process/i.test(label);
export const isGpuLabel = (label: string) => /v[ií]deo|gr[aá]fic|graphics|\bgpu\b/i.test(label);
