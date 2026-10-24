// Gera src/hardware.json com as notas de processadores e placas de vídeo.
//
// Uso (os dados não ficam no repositório):
//   unzip -p opendata-latest.zip "*.jsonl" | node --experimental-strip-types scripts/build-hardware.ts \
//     CPU_benchmark_v4.csv GPU_benchmarks_v7.csv > src/hardware.json
//
// - CPU_benchmark_v4.csv e GPU_benchmarks_v7.csv: kaggle.com/datasets/alanjo/cpu-benchmarks e gpu-benchmarks
//   (PassMark CPU Mark e G3D Mark, até 2022). São a base.
// - Blender Open Data (opendata.blender.org, CC0): estima os modelos que faltam no PassMark. A nota do Blender
//   de cada backend (CPU, OptiX, HIP, oneAPI) é convertida para a escala do PassMark por uma reta em log-log
//   ajustada nos modelos que estão nas duas bases.
import { readFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { hardwareKey, type HardwareEntry } from "../src/hardware.ts";

const [cpuCsv, gpuCsv] = process.argv.slice(2);
if (!cpuCsv || !gpuCsv) throw new Error("Uso: build-hardware.ts <cpu.csv> <gpu.csv> < opendata.jsonl");

const SCENES = ["monster", "junkshop", "classroom"];
// Backends do Blender usados nas estimativas e quais chaves cada um pode estimar.
// O OptiX também roda em GTX (sem núcleos RT), fora da reta das RTX. Intel Arc (oneAPI) fica de fora:
// não há nenhuma no PassMark de 2022 para ajustar a reta.
// since: a reta usa só os modelos testados a partir desse ano. Nos processadores, com todos, os novos saíam
// ~30% abaixo; nas placas, cortar deixa poucos modelos em comum e piora.
const BACKENDS: Record<string, { kind: "cpu" | "gpu"; since: number; accepts: (key: string) => boolean }> = {
  CPU: { kind: "cpu", since: 2021, accepts: () => true },
  OPTIX: { kind: "gpu", since: 0, accepts: (k) => k.startsWith("rtx ") },
  HIP: { kind: "gpu", since: 0, accepts: (k) => k.startsWith("rx ") },
};
const MIN_RUNS = 3;
const MIN_OVERLAP = 8;

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

const csvRows = (path: string) =>
  readFileSync(path, "utf8")
    .replace(/^﻿/, "")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => [...line.matchAll(/("([^"]*)"|[^,]*)(,|$)/g)].map((m) => m[2] ?? m[1]));

// Nome para mostrar: sem (R)/(TM), "@ 3.00GHz" e "CPU".
const displayName = (name: string) =>
  name
    .replace(/\((R|TM)\)|®|™/gi, "")
    .replace(/@.*$/, "")
    .replace(/\bCPU\b|\b\d+-Core Processor\b|\b\d+th Gen\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

const passmark = (path: string, nameCol: string, scoreCol: string) => {
  const [head, ...rows] = csvRows(path);
  const n = head.indexOf(nameCol);
  const s = head.indexOf(scoreCol);
  const d = head.indexOf("testDate");
  const out = new Map<string, HardwareEntry>();
  const years = new Map<string, number>();
  for (const row of rows) {
    const score = Number(row[s]);
    const key = hardwareKey(row[n] ?? "");
    if (!key || score <= 0 || out.has(key)) continue;
    out.set(key, [displayName(row[n]), score]);
    years.set(key, Number(row[d]) || 0);
  }
  return Object.assign(out, { years });
};

const pm = { cpu: passmark(cpuCsv, "cpuName", "cpuMark"), gpu: passmark(gpuCsv, "gpuName", "G3Dmark") };

// backend -> versão do Blender -> chave -> somas de samples/min de cada envio; e o nome mais visto por chave.
const runs = new Map<string, Map<string, Map<string, number[]>>>();
const names = new Map<string, Map<string, number>>();

type Result = {
  blender_version?: { version?: string };
  device_info?: { device_type?: string; compute_devices?: { name?: string; type?: string }[] };
  scene?: { label?: string };
  stats?: { samples_per_minute?: number };
};

for await (const line of createInterface({ input: process.stdin, crlfDelay: Infinity })) {
  let doc: { data?: Result[] | Result };
  try {
    doc = JSON.parse(line);
  } catch {
    continue;
  }
  const results = Array.isArray(doc.data) ? doc.data : doc.data ? [doc.data] : [];
  // Um envio = as três cenas no mesmo aparelho; só conta completo.
  const perDevice = new Map<string, { backend: string; version: string; name: string; scenes: Map<string, number> }>();
  for (const r of results) {
    const backend = r.device_info?.device_type ?? "";
    const spm = r.stats?.samples_per_minute;
    const scene = r.scene?.label ?? "";
    if (!(backend in BACKENDS) || !spm || !SCENES.includes(scene)) continue;
    const devices = (r.device_info?.compute_devices ?? []).map((d) => d.name ?? "");
    // Só um aparelho (sem duas placas, sem CPU junto com a placa).
    if (new Set(devices).size !== 1 || (backend !== "CPU" && devices.length !== 1)) continue;
    const version = (r.blender_version?.version ?? "").split(".").slice(0, 2).join(".");
    const id = `${backend}|${version}|${devices[0]}`;
    const entry = perDevice.get(id) ?? { backend, version, name: devices[0], scenes: new Map() };
    entry.scenes.set(scene, spm);
    perDevice.set(id, entry);
  }
  for (const { backend, version, name, scenes } of perDevice.values()) {
    if (scenes.size !== SCENES.length) continue;
    const key = hardwareKey(name);
    if (!key) continue;
    const sum = [...scenes.values()].reduce((a, b) => a + b, 0);
    const byVersion = runs.get(backend) ?? new Map();
    runs.set(backend, byVersion);
    const byKey = byVersion.get(version) ?? new Map();
    byVersion.set(version, byKey);
    byKey.set(key, [...(byKey.get(key) ?? []), sum]);
    const seen = names.get(key) ?? new Map();
    names.set(key, seen);
    seen.set(name, (seen.get(name) ?? 0) + 1);
  }
}

const commonName = (key: string) => {
  const seen = [...(names.get(key) ?? new Map()).entries()].sort((a, b) => b[1] - a[1]);
  return displayName(seen[0][0]);
};

// Nota do Blender por chave, com as versões levadas à escala da versão com mais modelos.
const blenderScores = (byVersion: Map<string, Map<string, number[]>>) => {
  const medians = new Map<string, Map<string, number>>();
  for (const [version, byKey] of byVersion) {
    const m = new Map<string, number>();
    for (const [key, sums] of byKey) if (sums.length >= MIN_RUNS) m.set(key, median(sums));
    medians.set(version, m);
  }
  const [refVersion, ref] = [...medians.entries()].sort((a, b) => b[1].size - a[1].size)[0];
  const scaled = new Map<string, number[]>();
  for (const [version, m] of medians) {
    const common = [...m.keys()].filter((k) => ref.has(k));
    if (version !== refVersion && common.length < MIN_OVERLAP) continue;
    const factor = version === refVersion ? 1 : median(common.map((k) => ref.get(k)! / m.get(k)!));
    for (const [key, score] of m) scaled.set(key, [...(scaled.get(key) ?? []), score * factor]);
  }
  return new Map([...scaled].map(([k, xs]) => [k, median(xs)]));
};

// Reta ln(passmark) = a + b·ln(blender) nos modelos das duas bases.
const fit = (pairs: [number, number][]) => {
  const xs = pairs.map(([x]) => Math.log(x));
  const ys = pairs.map(([, y]) => Math.log(y));
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
  const my = ys.reduce((a, b) => a + b, 0) / ys.length;
  const b = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0) / xs.reduce((s, x) => s + (x - mx) ** 2, 0);
  return { a: my - b * mx, b };
};

const out = { cpu: new Map(pm.cpu), gpu: new Map(pm.gpu) };
for (const [backend, { kind, since, accepts }] of Object.entries(BACKENDS)) {
  const byVersion = runs.get(backend);
  if (!byVersion) continue;
  const scores = blenderScores(byVersion);
  const pairs = [...scores]
    .filter(([k]) => accepts(k) && pm[kind].has(k) && pm[kind].years.get(k)! >= since)
    .map(([k, s]) => [s, pm[kind].get(k)![1]]);
  if (pairs.length < MIN_OVERLAP) {
    console.error(`${backend}: só ${pairs.length} modelos em comum, sem estimativas`);
    continue;
  }
  const { a, b } = fit(pairs as [number, number][]);
  let added = 0;
  for (const [key, score] of scores) {
    if (!accepts(key) || out[kind].has(key)) continue;
    out[kind].set(key, [commonName(key), Math.round(Math.exp(a + b * Math.log(score))), 1]);
    added++;
  }
  console.error(`${backend}: ${pairs.length} em comum, b=${b.toFixed(3)}, ${added} estimados`);
}

const sorted = (m: Map<string, HardwareEntry>) => [...m.values()].sort((x, y) => y[1] - x[1]);
const cpu = sorted(out.cpu);
const gpu = sorted(out.gpu);
process.stdout.write(
  `{"cpu":[\n${cpu.map((e) => JSON.stringify(e)).join(",\n")}\n],"gpu":[\n${gpu.map((e) => JSON.stringify(e)).join(",\n")}\n]}\n`,
);
