import type { Game, PlaySession, StatusEvent } from "../db";
import { formatDuration, money } from "../games";
import { computeStats } from "../stats";

type Props = { games: Game[]; events: StatusEvent[]; sessions: PlaySession[] };

const number = (n: number, digits = 0) => n.toLocaleString("pt-BR", { maximumFractionDigits: digits });

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="tile">
      <span className="tile-label">{label}</span>
      <span className="tile-value">{value}</span>
    </div>
  );
}

export function StatsPage({ games, events, sessions }: Props) {
  const s = computeStats(games, events, sessions);
  const maxYear = Math.max(1, ...s.finishedByYear.map((y) => y.count));
  const maxPlayed = Math.max(1, ...s.topPlayed.map((t) => t.seconds));

  return (
    <div className="stats">
      <div className="tiles">
        <Tile label="Jogos" value={number(s.total)} />
        <Tile label="Terminados" value={number(s.byStatus.finished)} />
        <Tile label="Jogando" value={number(s.byStatus.playing)} />
        <Tile label="Backlog" value={number(s.byStatus.backlog)} />
        <Tile label="Nota média" value={s.avgRating == null ? "—" : number(s.avgRating, 1)} />
        <Tile label="Tempo de jogo" value={s.playedSeconds ? formatDuration(s.playedSeconds) : "—"} />
        <Tile
          label="Tempo médio até terminar"
          value={s.avgDaysToFinish == null ? "—" : `${number(s.avgDaysToFinish)} dias`}
        />
        <Tile label="Valor da coleção (preço atual)" value={s.value ? money(s.value, "BRL") : "—"} />
      </div>

      <section className="chart-card">
        <h2>Terminados por ano</h2>
        {s.finishedByYear.length === 0 ? (
          <p className="muted">Marque jogos como Terminado para ver este gráfico.</p>
        ) : (
          <>
            <div
              className="columns"
              role="img"
              aria-label={s.finishedByYear.map((y) => `${y.year}: ${y.count}`).join(", ")}
            >
              {s.finishedByYear.map((y) => (
                <div key={y.year} className="column" tabIndex={0}>
                  <span className="column-value">{y.count || ""}</span>
                  <span className="column-bar" style={{ height: `${(y.count / maxYear) * 100}%` }} />
                  <span className="tooltip">
                    {y.year}: {y.count} {y.count === 1 ? "jogo" : "jogos"}
                  </span>
                </div>
              ))}
            </div>
            <div className="column-axis">
              {s.finishedByYear.map((y) => (
                <span key={y.year}>{y.year}</span>
              ))}
            </div>
            <details className="chart-table">
              <summary>Ver como tabela</summary>
              <table>
                <tbody>
                  {s.finishedByYear.map((y) => (
                    <tr key={y.year}>
                      <td>{y.year}</td>
                      <td>{y.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          </>
        )}
      </section>

      <section className="chart-card">
        <h2>Mais jogados</h2>
        {s.topPlayed.length === 0 ? (
          <p className="muted">Abra jogos pelo app (executável) para registrar o tempo de jogo.</p>
        ) : (
          <ul className="hbars">
            {s.topPlayed.map(({ game, seconds }) => (
              <li key={game.id}>
                <span className="hbar-name">{game.name}</span>
                <span className="hbar-track">
                  <span className="hbar" style={{ width: `${(seconds / maxPlayed) * 80}%` }} />
                  <span className="hbar-value">{formatDuration(seconds)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
