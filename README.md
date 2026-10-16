# Collection

App desktop para organizar sua coleção de jogos em listas, no estilo das coleções da Steam.

![Collection](docs/screenshot.png)

## O que faz

- Busca jogos na Steam enquanto você digita e salva capa e preço
- Listas (um jogo pode estar em várias), com sidebar e contagem
- Status (Backlog, Jogando, Terminado) e nota de 0 a 10
- Visualização em cards ou tabela, com filtros e ordenação
- Atualiza preços da Steam; em promoção mostra o preço original junto
- Anotações em markdown com live preview
- Backup em JSON (exportar e importar)

## Rodar

Requisitos: Node 24, Rust e os [pré-requisitos do Tauri](https://tauri.app/start/prerequisites/).

```sh
npm install
npm run tauri dev
```

## Outros comandos

```sh
npm test            # testes
npm run tauri build # gera o instalador
```

## Onde ficam os dados

Banco SQLite `collection.db` em:

- Linux: `~/.config/com.gharantes.collection/`
- Windows: `%APPDATA%\com.gharantes.collection\`
- macOS: `~/Library/Application Support/com.gharantes.collection/`

## Stack

Tauri 2, React 19, TypeScript, Vite, SQLite (`tauri-plugin-sql`) e CodeMirror 6.
