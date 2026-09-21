# TIControl — Fase 1: base, login e empresas

Primeira entrega: identidade visual, acesso ao sistema, cadastro de empresas, perfis de acesso e seleção de empresa. Os módulos (infraestrutura, monitoramento, PDV, e-mail, push, PWA) vêm nas fases seguintes.

## O que você vai ver ao final

1. **Tela de login** com e-mail/senha e entrada com Google.
2. **Primeiro acesso**: quem entra primeiro cria a primeira empresa e vira automaticamente Master.
3. **Tela "Selecionar empresa"**: cards com logo, nome e selo colorido do perfil (Master dourado, Administrador ciano, Técnico verde, Visualizador cinza). Quem tem só uma empresa entra direto.
4. **Layout do painel**: menu lateral recolhível, barra superior com seletor de empresa, alternância claro/escuro e menu do usuário.
5. **Administração Global** (só Master): cadastro de empresas, lista de usuários e convites com escolha de perfil e de quais empresas cada pessoa acessa.
6. **Página inicial do painel** com um resumo simples e os demais módulos listados no menu como "em breve".

## Perfis

- **Master** — vê e cria todas as empresas, único com acesso à Administração Global.
- **Administrador Empresa** — apenas as empresas vinculadas; gerencia conteúdo e convida técnico/visualizador.
- **Técnico** — cria e edita registros nas empresas vinculadas.
- **Visualizador** — somente leitura.

Uma pessoa pode ter perfis diferentes em empresas diferentes. O Master nunca é criado pela tela — só no primeiro acesso ou manualmente no banco.

## Dados

Nesta fase são criadas as tabelas: empresas, perfis de usuário, vínculo usuário↔empresa, perfis de acesso e convites, além do registro de auditoria. As demais tabelas do projeto entram junto com seus módulos.

Cada pessoa só enxerga as empresas às quais está vinculada; o Master enxerga todas. Visualizador não grava nada.

## E-mail

As credenciais do servidor de e-mail do Grupo Impettus serão guardadas de forma protegida (nunca visíveis no código) e usadas como configuração padrão. O envio real (convites e alertas) será ligado na fase de e-mail; nesta fase o convite também gera um link copiável.

## Detalhes técnicos

- O projeto já roda em **TanStack Start (React + Vite + TypeScript + Tailwind + shadcn/ui)** com roteamento por arquivos. Usarei TanStack Router em vez de React Router — o restante da stack pedida (Zustand, TanStack Query, React Hook Form + Zod, Lucide, Recharts) será adicionado normalmente.
- Backend: **Lovable Cloud** (Postgres + Auth + Realtime + Storage + RLS). Será ativado nesta fase. Lógica de servidor usa server functions/rotas do TanStack, não Edge Functions separadas.
- RLS por vínculo em `user_workspaces` + função `has_role`/`is_master` com `security definer` para evitar recursão.
- Empresa atual em Zustand + localStorage; ao trocar de empresa o cache de dados é limpo.
- Rotas protegidas sob `_authenticated/`; `/admin-global` com verificação extra de Master.
- Primeiro usuário vira Master via trigger no banco (nenhuma promoção pela interface).
- PWA e notificações push: o plugin `vite-plugin-pwa` e o service worker serão avaliados na fase de PWA, pois este template tem renderização no servidor.
- Nodemailer roda em ambiente Node; no runtime de borda do Lovable pode não funcionar. Na fase de e-mail eu valido e, se necessário, uso um cliente SMTP compatível — mantendo o servidor do cliente (sem Resend/SendGrid).
- Semente inicial: 2 empresas de exemplo e vínculos de demonstração.

## Fases seguintes (para combinar depois)

2) Módulos de infraestrutura (mapa de acessos, serviços/ativos, equipamentos, linhas) · 3) Dashboard com gráficos · 4) Monitoramento estilo Uptime Kuma · 5) E-mail SMTP + templates · 6) Push · 7) PWA · 8) Agente de inventário
