# TIControl

Plataforma de gestão de T.I para times de infraestrutura, com múltiplas empresas e perfis de acesso.

## Status do projeto

**Fase 1 concluída:** base visual, login, empresas, perfis, seleção de empresa e Administração Global.

### Já disponível

- Login por e-mail/senha e com Google
- Primeiro usuário do sistema vira **Master** automaticamente
- Criação de empresas e tela "Selecionar empresa" (entra direto quando há apenas uma)
- Painel com menu lateral recolhível, seletor de empresa, tema claro/escuro e menu do usuário
- Administração Global (apenas Master): empresas, usuários, convites e métricas
- Convite por link com perfil e seleção de empresas
- Registro de auditoria

### Perfis

| Perfil | Acesso |
| --- | --- |
| Master | Todas as empresas + Administração Global |
| Administrador | Empresas vinculadas, gerencia conteúdo e membros |
| Técnico | Cria e edita registros nas empresas vinculadas |
| Visualizador | Somente leitura |

### Próximas fases

1. Módulos de infraestrutura (mapa de acessos, serviços & ativos, equipamentos, linhas)
2. Dashboard com gráficos
3. Monitoramento de serviços (estilo Uptime Kuma)
4. E-mail SMTP próprio + templates
5. Notificações push
6. PWA instalável
7. Agente de inventário

## Tecnologia

React + TypeScript + Vite, TanStack Start/Router/Query, Tailwind CSS v4, shadcn/ui, Zustand,
Recharts, Lucide. Backend em Lovable Cloud (Postgres, Auth, Storage, RLS).

As credenciais do servidor de e-mail do cliente já estão armazenadas de forma criptografada no
ambiente e serão usadas na fase de alertas por e-mail.
