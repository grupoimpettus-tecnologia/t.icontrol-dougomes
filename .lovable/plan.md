# Fase 2 — Agente de status nos equipamentos

Objetivo: cada equipamento passa a ter um token próprio; um pequeno programa instalado na máquina envia um sinal a cada 60 segundos e a tela de Equipamentos mostra online, offline ou em manutenção, com a data do último sinal e os dados coletados (sistema, CPU, memória, disco, IP, MAC).

## O que muda na tela de Equipamentos

- Novas colunas: Situação do agente (Online / Offline / Em manutenção / Sem agente) e Visto pela última vez.
- Novos campos no cadastro: hostname, sistema operacional, CPU, memória, disco, MAC — preenchidos automaticamente pelo agente quando ele reporta, e editáveis manualmente.
- Tipo do equipamento com lista pronta: Servidor, Desktop, Notebook, Switch, Roteador, Firewall, Impressora, Access Point.
- Em cada equipamento: botões "Gerar token" (cria/renova a chave do dispositivo, exibida uma única vez com opção de copiar) e "Baixar agente" (baixa um pacote já configurado com o token e o endereço da aplicação).
- Painel de detalhes do equipamento com o último relatório recebido (uso de CPU, memória, disco, tempo ligado) e histórico recente de sinais.
- Filtro rápido por situação do agente e marcação manual de "Em manutenção" (que sobrepõe o status automático).

## Como o status é calculado

Sem sinal há mais de 3 minutos, o equipamento passa a Offline. Um sinal recebido volta o status para Online. "Em manutenção" é manual e não é alterado pelos sinais.

## O agente (pasta /agent)

Programa Node.js que coleta os dados da máquina com `systeminformation` e `node-os-utils` e envia um POST a cada 60 segundos. Inclui arquivo de configuração com token e URL, scripts de instalação para Linux (systemd), Windows (Task Scheduler) e macOS (launchd), e um README com o passo a passo.

## Detalhes técnicos

- Migração: colunas novas em `public.equipments` (`hostname`, `sistema_operacional`, `cpu`, `memoria`, `disco`, `mac`, `agent_token_hash`, `agent_status`, `ultimo_heartbeat`, `manutencao`); tabela `equipment_heartbeats` (workspace_id, equipment_id, recebido_em, métricas jsonb) com GRANTs, RLS por workspace e índices; política de leitura só para membros da empresa; escrita apenas por service_role.
- Endpoint público `src/routes/api/public/agent/heartbeat.ts` (TanStack server route): recebe `Authorization: Bearer <token>`, valida pelo hash SHA-256 com o `supabaseAdmin`, grava o heartbeat, atualiza `ultimo_heartbeat`/`agent_status` e os campos de hardware. Payload validado com Zod; responde 401 para token inválido.
- Rotina de expiração: a rota de cron existente (`/api/public/cron/run-checks`) passa a marcar como offline os equipamentos sem sinal há mais de 3 minutos, respeitando `manutencao`.
- Server functions em `src/lib/equipments.functions.ts` com `requireSupabaseAuth`: `gerarTokenAgente` (só master/admin/técnico; gera token aleatório, guarda apenas o hash, retorna o token em texto uma vez) e `baixarAgente` (monta o pacote do agente com token e URL).
- UI: `RecursoCrud` ganha suporte a colunas derivadas/ações por linha, ou a rota de Equipamentos passa a ter uma tela própria estendendo o componente; painel de detalhes em drawer.
- Nenhum Edge Function novo: tudo em rotas TanStack e server functions, conforme o padrão do projeto.
- Auditoria: geração de token e mudança de manutenção registradas no módulo de Logs.

## Limite conhecido

Cada equipamento precisa do agente instalado manualmente na máquina; equipamentos de rede (switch, roteador, impressora) não rodam o agente e continuam como "Sem agente" — o acompanhamento deles segue pelo módulo de Monitoramento.
