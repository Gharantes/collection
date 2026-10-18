# TODO

Ideias já discutidas. Antes de sugerir algo novo, conferir aqui para não repetir.

## Pendente

- [ ] Salvar a chave de assinatura como secret do repositório (necessário para releases com atualização):
      `gh secret set TAURI_SIGNING_PRIVATE_KEY < ~/.tauri/collection.key`

## Feito

- Setup Tauri 2 + React + TypeScript + Vite + SQLite, igual ao price-tracker-v2
- Listas (um jogo em várias), nota de 0 a 10
- Status: Backlog, Jogando, Terminado, Abandonado
- "Registrar Status" em Configurações: adicionar e apagar status (apagar tira o status dos jogos e apaga o histórico dele); vão no backup
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
- Menu "Configurações" na sidebar: exportar e importar backup em JSON, "Resetar biblioteca" (confirma digitando RESET_ALL)
- Histórico de status com datas editáveis: começou, voltou ao backlog, retomou, terminou
- Arrastar card ou linha para uma lista da sidebar
- "Vincular" (Steam ou executável) e "Abrir"; se o jogo sumir, volta a "Vincular"
- Botões "Loja Steam" (abre no Firefox, ou no navegador padrão) e "Abrir pasta" (só se vinculado) na página do jogo
- Backup de saves por jogo, só manual (fazer, restaurar, apagar)
- Tempo de jogo dos jogos abertos pelo executável ou pela Steam (no Windows, pelo registro `Apps<id>Running`)
- Executável que exige administrador (erro 740) abre pedindo o UAC, mantendo o tempo de jogo
- Página de estatísticas
- Atualização do app pelas releases do GitHub: só manual, pelo botão "Procurar atualizações" em Configurações (antes procurava ao abrir)
- Ícone próprio, README, testes simples, CI simples (só front), release por tag `v*`
- `App.tsx` dividido em componentes
- Botão para fechar a mensagem de erro
- Checkboxes "Early Access" e "Pre-release" (um ou outro) na página do jogo; marcar um libera a "Release Date"
- Páginas "Early Access" e "Pre-release" na sidebar; a tabela delas mostra só imagem, nome, preço e release date
- Release date em texto livre, como na Steam (data, "Q1 2027" ou só o ano)
- Seção "Mais filtros" na busca: listas e status com incluir/exigir/excluir (clique alterna, botão direito limpa), checkboxes "Mostrar Early Access" e "Mostrar Pre-release"; o select de status foi para lá. Nas páginas Early Access e Pre-release esses checkboxes ficam fixos. Nota mínima e máxima (sem nota fica de fora)
- Slider de conquistas na página do jogo: "Não importam", "Caçando platina" e "Platinado"
- Medalha em roseta (como a da Steam) no canto de cima à direita da capa nos cards (a nota foi para baixo à direita) e na miniatura da tabela: dourada com brilho se platinado, cinza se caçando platina

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
