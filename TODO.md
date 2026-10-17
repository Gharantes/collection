# TODO

Ideias já discutidas. Antes de sugerir algo novo, conferir aqui para não repetir.

## Pendente

- [ ] Salvar a chave de assinatura como secret do repositório (necessário para releases com atualização automática):
      `gh secret set TAURI_SIGNING_PRIVATE_KEY < ~/.tauri/collection.key`

## Feito

- Setup Tauri 2 + React + TypeScript + Vite + SQLite, igual ao price-tracker-v2
- Listas (um jogo em várias), nota de 0 a 10
- Status: Backlog, Jogando, Terminado, Abandonado
- Botão "O que jogar?": sorteia um jogo vinculado (Steam ou executável) entre os mostrados (respeita a lista); mostra num dialog (capa, nome, listas) com "Ir à página" e "Reroll"
- Filtro "Vinculados" na sidebar (jogos com Steam ou executável)
- Busca na Steam ao digitar (storesearch), salvando `steam_id`, imagem e preço
- Filtros por nome, status e lista; ordenação (nome, nota, preço, recentes)
- Tema escuro fixo e visual novo
- Coluna de listas compacta (chips + "+ Lista"); na tabela mostra 2 listas e "+N" para expandir
- Sidebar estilo Steam, visualização em cards (capa vertical) ou tabela
- Página de detalhes do jogo (rota `#/jogo/<id>`, com "Voltar"), no lugar do modal
- Botão "Atualizar preços" (e automático uma vez por dia); promoção mostra o preço original riscado
- Alerta de promoção (preço-alvo ou desconto mínimo) com notificação do sistema
- Anotações em markdown com live preview (CodeMirror, igual ao obsidian-clone)
- Várias anotações por jogo: grid de cards, botão "+" com menu (Anotação ou Imagem; pergunta se reduz a imagem para WebP 1920 px), edição num dialog
- Backup da coleção em JSON (exportar e importar)
- Histórico de status com datas editáveis: começou, voltou ao backlog, retomou, terminou
- Arrastar card ou linha para uma lista da sidebar
- "Vincular" (Steam ou executável) e "Abrir"; se o jogo sumir, volta a "Vincular"
- Backup de saves por jogo, só manual (fazer, restaurar, apagar)
- Tempo de jogo dos jogos abertos pelo executável
- Página de estatísticas
- Atualização automática do app pelas releases do GitHub
- Ícone próprio, README, testes simples, CI simples (só front), release por tag `v*`
- `App.tsx` dividido em componentes

## Recusado

- Importar a biblioteca da Steam (GetOwnedGames)
- Qualquer backup automático de saves (ao abrir, ao fechar, antes de restaurar)
- Detectar a pasta de saves sozinho (manifesto do Ludusavi)
- Achar a Steam em pasta personalizada no Windows (registro)
- Listas automáticas por regras
- Busca rápida com Ctrl+K
- Histórico de preço (menor preço já visto)
- Tempo estimado para terminar (HowLongToBeat)
- Projetos novos sugeridos: backup de saves separado (virou parte deste app), Collection para filmes/séries/livros, leitor de RSS
- CI com Rust (o CI deve ser rápido)
