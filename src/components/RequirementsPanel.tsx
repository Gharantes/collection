import { useEffect, useState } from "react";
import { fetchRequirements, type RequirementRow, type SteamRequirements } from "../steam";

// Requisitos de sistema da Steam, buscados ao abrir a página e nunca salvos.
// Sem internet, se falhar ou se o jogo não tiver, não aparece.
export function RequirementsPanel({ appId }: { appId: number }) {
  const [reqs, setReqs] = useState<SteamRequirements | null>(null);

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

  return (
    <div className="detail-history">
      <h3>Requisitos de sistema</h3>
      <div className="requirements">
        <RequirementList title="Mínimos" rows={reqs.minimum} />
        <RequirementList title="Recomendados" rows={reqs.recommended} />
      </div>
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
