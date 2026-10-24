import { test } from "node:test";
import assert from "node:assert/strict";
import { buildIndex, compare, findModels, hardwareKey, identify, type HardwareEntry } from "./hardware.ts";

const cpus = buildIndex([
  ["Intel Core i5-8500 @ 3.00GHz", 9576],
  ["Intel Core i7-6700 @ 3.40GHz", 8078],
  ["AMD Ryzen 5 1600", 12314],
  ["AMD Ryzen 7 7800X3D 8-Core Processor", 30221, 1],
  ["Intel Core i5-13400", 24879, 1],
  ["AMD FX-8350 Eight-Core", 5969],
  ["Intel Core2 Quad Q6600", 1778],
  ["AMD Phenom 9850 Quad-Core", 1680],
] satisfies HardwareEntry[]);

const gpus = buildIndex([
  ["GeForce RTX 3050", 12718],
  ["GeForce GTX 1060", 10070],
  ["GeForce GTX 1060 3GB", 9728],
  ["Radeon RX 580", 8907],
  ["GeForce RTX 2060 SUPER", 16514],
  ["GeForce RTX 2060", 13953],
  ["GeForce GTX 1080 Ti", 18284],
  ["Radeon RX 470/570", 8070],
  ["Radeon RX 6600 XT", 15853],
  ["Radeon HD 7870", 4661],
  ["Intel UHD Graphics 630", 1270],
] satisfies HardwareEntry[]);

const names = (text: string, index = gpus) =>
  findModels(text, index)
    .map((m) => m.name)
    .sort();

test("hardwareKey reduz ao modelo", () => {
  assert.equal(hardwareKey("Intel(R) Core(TM) i5-8500 CPU @ 3.00GHz"), "i5 8500");
  assert.equal(hardwareKey("13th Gen Intel(R) Core(TM) i5-13400"), "i5 13400");
  assert.equal(hardwareKey("NVIDIA GeForce GTX 1060 (6 GB)"), "gtx 1060 6gb");
  assert.equal(hardwareKey("AMD Radeon RX 6600XT"), "rx 6600 xt");
  assert.equal(hardwareKey("AMD HD7870"), "hd 7870");
});

test("identifica as peças do PC pelo nome do Windows", () => {
  assert.equal(identify("Intel(R) Core(TM) i5-8500 CPU @ 3.00GHz", cpus)?.score, 9576);
  assert.equal(identify("NVIDIA GeForce RTX 3050", gpus)?.score, 12718);
  assert.equal(identify("Intel(R) UHD Graphics 630", gpus)?.score, 1270);
});

test("acha os modelos em textos reais da Steam", () => {
  assert.deepEqual(names("Core i7-6700 or Ryzen 5 1600", cpus), ["AMD Ryzen 5 1600", "Intel Core i7-6700 @ 3.40GHz"]);
  assert.deepEqual(names("GeForce GTX 1060 6GB or Radeon RX 580 8GB or Arc A380"), ["GeForce GTX 1060", "Radeon RX 580"]);
  assert.deepEqual(names("NVIDIA GEFORCE GTX 1060 3 GB or AMD RADEON RX 580 4 GB"), ["GeForce GTX 1060 3GB", "Radeon RX 580"]);
  assert.deepEqual(names("Nvidia 2060 Super / RX 5700 XT"), ["GeForce RTX 2060 SUPER"]);
  assert.deepEqual(names("NVIDIA GeForce 1080 Ti or AMD Radeon RX 5700 XT"), ["GeForce GTX 1080 Ti"]);
  assert.deepEqual(names("NVIDIA GTX 1060 (6 GB) or AMD RX 570 (4 GB)"), ["GeForce GTX 1060", "Radeon RX 470/570"]);
  assert.deepEqual(names("AMD Radeon RX 6600XT, NVIDIA GeForce RTX 3060"), ["Radeon RX 6600 XT"]);
  assert.deepEqual(names("NVIDIA GTX 660 2 GB / AMD HD7870 2 GB"), ["Radeon HD 7870"]);
  assert.deepEqual(names("Intel I5 4690 / AMD FX 8350 / Snapdragon X Elite", cpus), ["AMD FX-8350 Eight-Core"]);
  assert.deepEqual(
    names("Intel Core 2 Quad CPU Q6600 @ 2.40 GHz (4 CPUs) / AMD Phenom 9850 Quad-Core (4 CPUs) @ 2.5GHz", cpus),
    ["AMD Phenom 9850 Quad-Core", "Intel Core2 Quad Q6600"],
  );
});

test("texto vago não vira chute", () => {
  assert.deepEqual(names("Dual Core 2.4 GHz", cpus), []);
  assert.deepEqual(names("256 mb video memory, shader model 3.0+"), []);
});

test("compara com o mais fraco dos citados", () => {
  const mine = identify("NVIDIA GeForce RTX 3050", gpus);
  const min = compare(findModels("GTX 1060 6GB or RX 580", gpus), mine)!;
  assert.equal(min.weakest.name, "Radeon RX 580");
  assert.equal(min.verdict, "ok");
  assert.equal(compare(findModels("RTX 2060 SUPER", gpus), mine)!.verdict, "below");
  assert.equal(compare(findModels("RTX 2060", gpus), mine)!.verdict, "close");
  assert.equal(compare([], mine), null);
  assert.equal(compare(findModels("RTX 2060", gpus), null), null);
});
