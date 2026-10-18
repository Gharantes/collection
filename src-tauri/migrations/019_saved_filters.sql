-- Filtros da busca salvos com nome; `filter` é o JSON do texto e dos "Mais filtros".
CREATE TABLE saved_filters (
    id     INTEGER PRIMARY KEY AUTOINCREMENT,
    name   TEXT NOT NULL UNIQUE,
    filter TEXT NOT NULL
);
