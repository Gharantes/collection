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
- Filtro "Só vinculados" (jogos com Steam ou executável) em "Mais filtros"; a página "Vinculados" da sidebar saiu
- Busca na Steam ao digitar (storesearch), salvando `steam_id`, imagem e preço
- Filtros por nome, status e lista; ordenação (nome, nota, preço, recentes)
- Tema escuro fixo e visual novo
- Coluna de listas compacta (chips + "+ Lista"); na tabela mostra 2 listas e "+N" para expandir
- Sidebar estilo Steam, visualização em cards (capa vertical) ou tabela
- Página de detalhes do jogo (rota `#/jogo/<id>`, com "Voltar"), no lugar do modal
- Atualização de preços (automática uma vez por dia); promoção mostra o preço original riscado
- Aba "Atualizações" na sidebar, no lugar do botão "Atualizar preços" da página principal: botão "Atualizar Dados" e, abaixo, as mudanças encontradas por atualização (entrou/saiu de desconto, desconto mudou, preço mudou, ganhou/ficou sem preço, entrou no preço-alvo, saiu de Early Access/Pre-release, Pre-release virou Early Access, release date mudou); clicar no nome abre o jogo. Guarda as 30 últimas atualizações com mudanças (localStorage, fora do backup). Early Access/Pre-release são conferidos na Steam um por um, só nos jogos marcados assim, e já ficam atualizados no jogo. Barra de progresso por etapa (Preços, Early Access/Pre-release) com jogos pesquisados/total
- Alerta de promoção (preço-alvo ou desconto mínimo) com notificação do sistema
- Anotações em markdown com live preview (CodeMirror, igual ao obsidian-clone)
- Várias anotações por jogo: grid de cards, botão "+" com menu (Anotação ou Imagem; pergunta se reduz a imagem para WebP 1920 px), edição num dialog
- Menu "Configurações" na sidebar: exportar e importar backup em JSON, "Resetar biblioteca" (confirma digitando RESET_ALL)
- Exportar/importar backup mostram um dialog com barra de progresso por etapa; só fecha no fim, mostrando onde salvou (ou o erro)
- Histórico de status com datas editáveis: começou, voltou ao backlog, retomou, terminou
- Arrastar card ou linha para uma lista da sidebar
- "Vincular" (Steam ou executável) e "Abrir"; se o jogo sumir, volta a "Vincular"
- Botões "Loja Steam" (abre no Firefox, ou no navegador padrão) e "Abrir pasta" (só se vinculado) na página do jogo; ficam numa linha abaixo, como texto sublinhado
- Backup de saves por jogo, só manual (fazer, restaurar, apagar)
- Tempo de jogo dos jogos abertos pelo executável ou pela Steam (no Windows, pelo registro `Apps<id>Running`)
- Executável que exige administrador (erro 740) abre pedindo o UAC, mantendo o tempo de jogo
- Página de estatísticas
- Atualização do app pelas releases do GitHub: só manual, pelo botão "Procurar atualizações" em Configurações (antes procurava ao abrir)
- Ícone próprio, README, testes simples, CI simples (só front), release por tag `v*`
- `App.tsx` dividido em componentes
- Botão para fechar a mensagem de erro
- Checkboxes "Early Access" e "Pre-release" (um ou outro) na página do jogo; marcar um libera a "Release Date"
- Páginas "Early Access" e "Pre-release" na sidebar (removidas: agora são filtros salvos); colunas da tabela escolhidas num menu com ícone ao lado de Cards/Tabela (Preço, Release Date, Status, Nota, Listas, Remover; imagem e nome sempre), no lugar do botão "Compacta" (que antes era troca automática)
- Release date em texto livre, como na Steam (data, "Q1 2027" ou só o ano)
- Seção "Mais filtros" na busca: listas e status com incluir/exigir/excluir (clique alterna, botão direito limpa), release (Lançado, Early Access, Pre-release, Possui demo) também com incluir/exigir/excluir, no lugar dos antigos checkboxes "Mostrar Early Access/Pre-release"; o select de status foi para lá. Nota mínima e máxima (sem nota fica de fora)
- Filtros salvos: "Salvar filtro atual" com nome em "Mais filtros" (texto da busca + mais filtros + colunas da tabela; mesmo nome troca; carregar um filtro antigo, sem colunas, não mexe nelas), chips sempre visíveis entre os filtros e a grid/tabela (clique carrega, clique no marcado limpa, × apaga); vão no banco e no backup
- Grade mais leve ao tirar filtros: capas com `loading="lazy"` e `decoding="async"`, cards com `content-visibility: auto`; grade e tabela mostram 48 jogos por vez e trazem mais ao rolar perto do fim
- Slider de conquistas na página do jogo: "Não importam", "Caçando platina" e "Platinado"
- Medalha em roseta (como a da Steam) no canto de cima à direita da capa nos cards (a nota foi para baixo à direita) e na miniatura da tabela: dourada com brilho se platinado, cinza se caçando platina
- Seção "Links" na página do jogo: colar URL, salvar, clicar abre no Firefox (ou navegador padrão), × apaga; YouTube e Twitter/X ganham ícone próprio, o resto um ícone padrão; vão no backup
- Faixa "Early Access" / "Pre-release" na base da capa (cards e miniatura da tabela): Early Access no azul da loja da Steam, Pre-release em laranja/âmbar; passar o mouse mostra a release date
- Seção "Notícias" na página do jogo: últimas 5 da API de notícias da Steam, buscadas ao abrir e nunca salvas; sem internet não aparece. Padrão só anúncios oficiais, com toggle para todas as fontes. Aviso quando o Early Access/Pre-release/release date da Steam difere do marcado, com botão para atualizar. A busca de notícias é por jogo e começa desligada (checkbox "Buscar notícias"); filtro "Notícias" em "Mais filtros", abaixo de Release, com slider (Todos, Sem buscar notícias, Buscando notícias; só a etapa escolhida aparece, ao lado). Abaixo, filtro "Conquistas" com o mesmo slider (Todos, Não importam, Caçando platina, Platinado)
- Ao adicionar jogo da Steam, Early Access/Pre-release e release date vêm preenchidos pela Steam
- Checkbox "Tenho o jogo" na página do jogo; jogos que não tem aparecem escurecidos nos cards e na tabela (clareiam um pouco no hover); vai no backup
- Demo dentro da página do jogo (`demo_steam_id`, vai no backup): ao adicionar da Steam marca a demo sozinho; escolher uma demo adiciona o jogo completo (ou marca a demo nele). Botão verde "▶ Jogar demo" (como o da Steam; só se não tem o jogo e a demo está instalada na Steam) abre pela Steam e o tempo soma no jogo. Link "Demo na Steam" (loja da demo) sempre que o jogo tem demo. Etapa "Demos" no "Atualizar Dados" (só jogos que não tem): "Ganhou demo", "Demo removida". "Juntar demos" em Configurações, com barra de progresso: junta páginas de demo com a do jogo completo (ou transforma a demo nele). Usa a `IStoreBrowseService/GetItems` da Steam, em lotes de 100

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
