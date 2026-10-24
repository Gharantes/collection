import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  buildIndex,
  compare,
  findModels,
  identify,
  isCpuLabel,
  isGpuLabel,
  type HardwareData,
  type HardwareIndex,
  type Model,
} from "../hardware";
import { fetchRequirements, type RequirementRow, type SteamRequirements } from "../steam";

// Requisitos de sistema da Steam, buscados ao abrir a página e nunca salvos.
// Sem internet, se falhar ou se o jogo não tiver, não aparece.
export function RequirementsPanel({ appId }: { appId: number }) {
  const [reqs, setReqs] = useState<SteamRequirements | null>(null);
  // null = não comparado; "loading" = lendo o PC; string = erro.
  const [pc, setPc] = useState<Pc | "loading" | string | null>(null);

  useEffect(() => {
    let stale = false;
    setReqs(null);
    fetchRequirements(appId)
      .then((r) => !stale && setReqs(r))
      .catch(() => {});
    return () => {
      stale = true;
    };
  }, [appId]);

  if (!reqs) return null;

  const check = () => {
    setPc("loading");
    loadPc()
      .then(setPc)
      .catch(() => setPc("Não foi possível ler as peças deste PC."));
  };

  return (
    <div className="detail-history">
      <h3>Requisitos de sistema</h3>
      <div className="requirements">
        <RequirementList title="Mínimos" rows={reqs.minimum} />
        <RequirementList title="Recomendados" rows={reqs.recommended} />
      </div>
      <div className="requirements-check">
        <button className="ghost" onClick={check} disabled={pc === "loading"}>
          {pc === "loading" ? "Comparando…" : "Comparar com meu PC"}
        </button>
        {typeof pc === "string" && pc !== "loading" && <span className="muted">{pc}</span>}
        {typeof pc === "object" && pc && (
          <span className="muted">
            Seu PC: {pc.cpuName ?? "processador desconhecido"} · {pc.gpuNames.join(", ") || "placa desconhecida"}
          </span>
        )}
      </div>
      {typeof pc === "object" && pc && (
        <>
          <div className="requirements">
            <CheckList title="Mínimos" rows={reqs.minimum} pc={pc} />
            <CheckList title="Recomendados" rows={reqs.recommended} pc={pc} />
          </div>
          <p className="requirements-note muted">
            Notas do PassMark (até 2022) e, nos modelos mais novos, estimadas pelo Blender Open Data (≈). É uma
            comparação aproximada.
          </p>
        </>
      )}
    </div>
  );
}

function RequirementList({ title, rows }: { title: string; rows: RequirementRow[] }) {
  if (rows.length === 0) return null;
  return (
    <div>
      <h4>{title}</h4>
      <ul>
        {rows.map((r, i) => (
          <li key={i}>
            {r.label && <span className="muted">{r.label}: </span>}
            {r.value}
          </li>
        ))}
      </ul>
    </div>
  );
}

type Specs = { cpu: string | null; gpus: string[] };

type Pc = {
  cpuName: string | null;
  gpuNames: string[];
  cpus: HardwareIndex;
  gpus: HardwareIndex;
  cpu: Model | null;
  // Com mais de uma placa (integrada + dedicada), vale a mais forte.
  gpu: Model | null;
};

// Lido uma vez por sessão; a tabela de notas só carrega quando alguém compara.
let pcPromise: Promise<Pc> | null = null;
const loadPc = () =>
  (pcPromise ??= (async () => {
    const [{ default: data }, specs] = await Promise.all([import("../hardware.json"), invoke<Specs>("system_specs")]);
    const { cpu, gpu } = data as unknown as HardwareData;
    const cpus = buildIndex(cpu);
    const gpus = buildIndex(gpu);
    const found = specs.gpus.map((n) => identify(n, gpus)).filter((m): m is Model => !!m);
    return {
      cpuName: specs.cpu,
      gpuNames: specs.gpus,
      cpus,
      gpus,
      cpu: specs.cpu ? identify(specs.cpu, cpus) : null,
      gpu: found.sort((a, b) => b.score - a.score)[0] ?? null,
    };
  })().catch((e) => {
    pcPromise = null;
    throw e;
  }));

function CheckList({ title, rows, pc }: { title: string; rows: RequirementRow[]; pc: Pc }) {
  const cpu = rows.find((r) => isCpuLabel(r.label));
  const gpu = rows.find((r) => isGpuLabel(r.label));
  if (!cpu && !gpu) return null;
  return (
    <div>
      <h4>{title}</h4>
      <ul>
        {cpu && <CheckLine label="Processador" text={cpu.value} index={pc.cpus} mine={pc.cpu} />}
        {gpu && <CheckLine label="Placa de vídeo" text={gpu.value} index={pc.gpus} mine={pc.gpu} />}
      </ul>
    </div>
  );
}

const VERDICTS = {
  ok: { icon: "✓", text: "Atende" },
  close: { icon: "≈", text: "Por pouco" },
  below: { icon: "✗", text: "Abaixo" },
} as const;

const score = (m: Model) => `${m.estimated ? "≈" : ""}${m.score.toLocaleString("pt-BR")}`;

function CheckLine({ label, text, index, mine }: { label: string; text: string; index: HardwareIndex; mine: Model | null }) {
  const required = findModels(text, index);
  const result = compare(required, mine);
  if (!result) {
    const why = !mine ? `não reconheci o seu modelo` : "não reconheci o modelo pedido";
    return (
      <li className="check-line unknown">
        <span className="check-icon">?</span>
        <span>
          <span className="muted">{label}: </span>
          {why}
        </span>
      </li>
    );
  }
  const { weakest, ratio, verdict } = result;
  const diff = Math.round((ratio - 1) * 100);
  return (
    <li className={`check-line ${verdict}`}>
      <span className="check-icon">{VERDICTS[verdict].icon}</span>
      <span>
        <span className="muted">{label}: </span>
        {VERDICTS[verdict].text} ({diff >= 0 ? "+" : ""}
        {diff}%)
        <br />
        <span className="muted">
          seu {result.mine.name} ({score(result.mine)}) × {weakest.name} ({score(weakest)})
        </span>
      </span>
    </li>
  );
}
