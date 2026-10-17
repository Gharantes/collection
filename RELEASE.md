# Como fazer release

O workflow [release.yml](.github/workflows/release.yml) roda quando uma tag `v*` é enviada ao GitHub. Ele gera os instaladores de Windows, Linux e macOS, assina a atualização e publica tudo numa release com o `latest.json` que o botão **Procurar atualizações** usa.

## Jeito automático

```sh
npm run release -- patch    # 0.4.0 -> 0.4.1 (também aceita minor, major ou 0.5.0)
```

O [scripts/release.mjs](scripts/release.mjs) faz os passos 1 a 6 abaixo. Ele confere se você está na `main` sem mudanças pendentes, pede confirmação e roda os testes. Depois sobe a versão nos três arquivos, faz o commit, cria e envia a tag. Se o `gh` (GitHub CLI) estiver instalado e logado, também acompanha o build e confere se a release tem o `latest.json` e os `.sig`.

Se a versão dos arquivos ainda não foi publicada, passe ela mesma (ex.: `npm run release -- 0.4.0`): o script pula o commit de versão e só cria a tag.

## Pré-requisitos (uma vez só)

- Secret `TAURI_SIGNING_PRIVATE_KEY` cadastrado no repositório (Settings → Secrets and variables → Actions) com o conteúdo de `~/.tauri/collection.key`.
- A chave não tem senha (o workflow passa `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` vazio).
- A chave pública correspondente está em `plugins.updater.pubkey` no [tauri.conf.json](src-tauri/tauri.conf.json). Se trocar a chave, troque as duas; quem tem a versão antiga instalada não vai aceitar atualizações assinadas com a nova.

## Passo a passo

1. **Confirme que está tudo certo na `main`**

   ```sh
   git checkout main
   git pull
   npm test
   cargo test --manifest-path src-tauri/Cargo.toml
   ```

2. **Suba a versão nos três arquivos** (mesmo número, sem o `v`):

   - [package.json](package.json) → `"version"`
   - [src-tauri/tauri.conf.json](src-tauri/tauri.conf.json) → `"version"`
   - [src-tauri/Cargo.toml](src-tauri/Cargo.toml) → `version` em `[package]`

   O updater compara a versão do `tauri.conf.json` instalada com a do `latest.json` da release. Se ela não subir, o app não enxerga a atualização, mesmo com tag nova.

   Depois rode `cargo check --manifest-path src-tauri/Cargo.toml` para atualizar o `Cargo.lock`.

3. **Faça o commit da versão**

   ```sh
   git add package.json src-tauri/tauri.conf.json src-tauri/Cargo.toml src-tauri/Cargo.lock
   git commit -m "Versão 0.4.0"
   ```

4. **Crie a tag e envie**

   ```sh
   git tag v0.4.0
   git push
   git push origin v0.4.0
   ```

   A tag precisa bater com a versão dos arquivos.

5. **Acompanhe o build** na aba Actions do GitHub (workflow *Release*). Leva alguns minutos por plataforma.

6. **Confira a release** em https://github.com/Gharantes/collection/releases:
   - tem os instaladores (`.msi`/`.exe`, `.deb`/`.AppImage`/`.rpm`, `.dmg`);
   - tem os arquivos `.sig` e o `latest.json`;
   - opcional: edite a descrição com o que mudou.

7. **Teste a atualização**: abra uma versão anterior instalada e clique em **Configurações → Procurar atualizações**.

## Se der errado

- **Build falhou**: corrija na `main`, apague a tag e crie de novo.

  ```sh
  git tag -d v0.4.0
  git push origin :refs/tags/v0.4.0
  ```

  Apague também a release (se chegou a ser criada) na página de releases antes de reenviar a tag.

- **App não encontra a atualização**: confira se a versão do `tauri.conf.json` subiu e se o `latest.json` da release mostra o número novo.

## Build local (sem publicar)

```sh
export TAURI_SIGNING_PRIVATE_KEY="$(cat ~/.tauri/collection.key)"
npm run tauri build
```

Os instaladores ficam em `src-tauri/target/release/bundle/`.
