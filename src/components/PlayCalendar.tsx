import { useState } from "react";
import type { Game, PlaySession } from "../db";
import { formatDuration } from "../games";
import { monthPlay } from "../stats";

// Paleta de categorias (tema escuro), na ordem fixa; do 9º jogo em diante vira "Outros".
const COLORS = ["#338ced", "#e76624", "#00a888", "#d28e05", "#e24d8b", "#0aac23", "#9887ef", "#eb6263"];
const OTHER = "#5b6272";

const WEEKDAYS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const clock = (min: number) =>
  `${String(Math.floor(min / 60) % 24).padStart(2, "0")}:${String(Math.floor(min % 60)).padStart(2, "0")}`;

type Props = { games: Game[]; sessions: PlaySession[] };

export function PlayCalendar({ games, sessions }: Props) {
  const today = new Date();
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const { year, month } = cursor;
  const m = monthPlay(sessions, year, month);
  const names = new Map(games.map((g) => [g.id, g.name]));
  const color = new Map(m.perGame.map((p, i) => [p.gameId, COLORS[i] ?? OTHER]));
  const top = m.perGame.slice(0, COLORS.length);
  const rest = m.perGame.slice(COLORS.length);
  const restSeconds = rest.reduce((a, p) => a + p.seconds, 0);
  const maxGame = Math.max(1, ...m.perGame.map((p) => p.seconds));

  const move = (delta: number) => {
    const d = new Date(year, month + delta, 1);
    setCursor({ year: d.getFullYear(), month: d.getMonth() });
  };
  const isCurrent = year === today.getFullYear() && month === today.getMonth();
  const title = new Date(year, month, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  const bar = (key: string | number, name: string, seconds: number, background: string, hint?: string) => (
    <li key={key} title={hint}>
      <span className="hbar-name">
        <span className="swatch" style={{ background }} />
        {name}
      </span>
      <span className="hbar-track">
        <span className="hbar" style={{ width: `${(seconds / maxGame) * 80}%`, background }} />
        <span className="hbar-value">{formatDuration(seconds)}</span>
      </span>
    </li>
  );

  return (
    <section className="chart-card play-calendar">
      <div className="calendar-head">
        <h2>Calendário de jogo</h2>
        <div className="calendar-nav">
          <button className="ghost" onClick={() => move(-1)} aria-label="Mês anterior">
            ‹
          </button>
          <span className="calendar-month">{title}</span>
          <button className="ghost" onClick={() => move(1)} disabled={isCurrent} aria-label="Próximo mês">
            ›
          </button>
          {!isCurrent && (
            <button className="ghost" onClick={() => setCursor({ year: today.getFullYear(), month: today.getMonth() })}>
              Hoje
            </button>
          )}
        </div>
      </div>

      {m.seconds === 0 ? (
        <p className="muted">Nenhuma sessão de jogo registrada neste mês.</p>
      ) : (
        <>
          <h3 className="calendar-sub">Jogado no mês · {formatDuration(m.seconds)}</h3>
          <ul className="hbars month-bars">
            {top.map(({ gameId, seconds }) => bar(gameId, names.get(gameId) ?? "?", seconds, color.get(gameId)!))}
            {rest.length > 0 &&
              bar(
                "outros",
                `Outros (${rest.length})`,
                restSeconds,
                OTHER,
                rest.map((p) => `${names.get(p.gameId) ?? "?"}: ${formatDuration(p.seconds)}`).join("\n"),
              )}
          </ul>

          <h3 className="calendar-sub">Sessões por dia</h3>
          <div className="day-rows">
            <div className="day-row day-axis" aria-hidden>
              <span />
              <span className="day-track">
                {[0, 3, 6, 9, 12, 15, 18, 21, 24].map((h) => (
                  <span key={h} className="hour-tick" style={{ left: `${(h / 24) * 100}%` }}>
                    {h}h
                  </span>
                ))}
              </span>
              <span />
            </div>
            {m.days.map(({ day, segments, seconds }) => {
              const weekday = new Date(year, month, day).getDay();
              const isToday = isCurrent && day === today.getDate();
              const cls = ["day-row", weekday === 0 || weekday === 6 ? "weekend" : "", isToday ? "today" : ""];
              return (
                <div key={day} className={cls.join(" ").trim()}>
                  <span className="day-label">
                    {WEEKDAYS[weekday]} {day}
                  </span>
                  <span className="day-track">
                    {[6, 12, 18].map((h) => (
                      <span key={h} className="hour-line" style={{ left: `${(h / 24) * 100}%` }} />
                    ))}
                    {segments.map((s, i) => (
                      <span
                        key={i}
                        className="session"
                        tabIndex={0}
                        style={{
                          left: `${(s.start / 1440) * 100}%`,
                          width: `max(3px, ${((s.end - s.start) / 1440) * 100}%)`,
                          background: color.get(s.gameId),
                        }}
                      >
                        <span className="tooltip">
                          <strong>{names.get(s.gameId) ?? "?"}</strong> · {clock(s.start)}–{clock(s.end)} ·{" "}
                          {formatDuration((s.end - s.start) * 60)}
                        </span>
                      </span>
                    ))}
                  </span>
                  <span className="day-total">{seconds ? formatDuration(seconds) : ""}</span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
