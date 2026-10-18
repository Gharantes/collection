-- Links do jogo (vídeos, posts, páginas), abertos no navegador.
CREATE TABLE game_links (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    url     TEXT    NOT NULL
);
