-- O que o "Atualizar Dados" confere nos jogos sem status (uma linha só). Começa tudo ligado, como antes.
CREATE TABLE no_status_checks (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  check_prices INTEGER NOT NULL DEFAULT 1 CHECK (check_prices IN (0, 1)),
  check_releases INTEGER NOT NULL DEFAULT 1 CHECK (check_releases IN (0, 1)),
  check_demos INTEGER NOT NULL DEFAULT 1 CHECK (check_demos IN (0, 1))
);
INSERT INTO no_status_checks (id) VALUES (1);
