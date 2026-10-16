# Collection

App desktop para organizar sua coleção de jogos em listas, no estilo das coleções da Steam.

![Collection](docs/screenshot.png)

## O que faz

- Busca jogos na Steam enquanto você digita e salva capa e preço
- Listas (um jogo pode estar em várias), com sidebar e contagem
- Status (Backlog, Jogando, Terminado, Abandonado) e nota de 0 a 10
- Botão "O que jogar?" sorteia um jogo do Backlog
- Visualização em cards ou tabela, com filtros e ordenação
- Atualiza preços da Steam uma vez por dia; em promoção mostra o preço original junto
- Alerta de promoção (preço-alvo ou desconto mínimo) com notificação
- Histórico de status com datas: começou, voltou ao backlog, retomou, terminou
- Vincula o jogo à Steam ou a um executável e abre direto do app
- Backup manual dos saves de cada jogo
- Tempo de jogo dos jogos abertos pelo executável
- Página de estatísticas
- Atualização automática do app
- Arrastar jogos para as listas da sidebar
- Anotações em markdown com live preview
- Backup da coleção em JSON (exportar e importar)

## Rodar

Requisitos: Node 24, Rust e os [pré-requisitos do Tauri](https://tauri.app/start/prerequisites/).

```sh
npm install
npm run tauri dev
```

## Outros comandos

```sh
npm test                         # testes do front
cargo test --manifest-path src-tauri/Cargo.toml  # testes do Rust
npm run tauri build              # gera o instalador
```

O build de release assina a atualização; ele precisa da chave privada no ambiente:
`export TAURI_SIGNING_PRIVATE_KEY="$(cat ~/.tauri/collection.key)"`.

Para publicar uma versão com instaladores, crie uma tag `v*` (ex.: `git tag v0.2.0 && git push --tags`).

## Onde ficam os dados

Banco SQLite `collection.db` em:

- Linux: `~/.config/com.gharantes.collection/`
- Windows: `%APPDATA%\com.gharantes.collection\`
- macOS: `~/Library/Application Support/com.gharantes.collection/`

Os backups de saves ficam em `saves/` dentro da pasta de dados do app (`~/.local/share/com.gharantes.collection/` no Linux).

## Stack

Tauri 2, React 19, TypeScript, Vite, SQLite (`tauri-plugin-sql`) e CodeMirror 6.
