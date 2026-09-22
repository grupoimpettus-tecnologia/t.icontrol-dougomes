# Ajustes de organização, exportações, painel, logs e alertas

## Resultado esperado
- Reorganizar a tabela de Equipamentos com **Responsável** logo após **Patrimônio**.
- Manter a rolagem necessária em telas menores, mas substituir as barras brancas por barras discretas e coerentes com os temas claro e escuro em desktop, tablet e celular.
- Disponibilizar exportação em **PDF, Excel (.xlsx) e CSV** em todas as telas de listagem.
- Fazer o Dashboard exibir números reais dos módulos da empresa selecionada.
- Criar um módulo de **Logs** exclusivo para usuários Master, com histórico detalhado e confiável.
- Ativar alertas de Monitoramento por e-mail e push, com destinatários escolhidos individualmente em cada monitor.

## Implementação
### 1. Organização visual e responsividade
- Alterar a ordem das colunas de Equipamentos sem mudar a ordem dos campos do formulário.
- Padronizar barras horizontal e vertical com cores semânticas, espessura reduzida e suporte aos temas claro/escuro.
- Ajustar contêineres de tabela e menu para preservar rolagem por mouse, toque e teclado sem criar rolagem dupla.
- Validar desktop, tablet e mobile usando a imagem enviada como referência do problema.

### 2. Exportação em todas as listas
- Criar um menu único **Exportar** com PDF, Excel e CSV, reutilizável nas quatro listas de Infraestrutura, Monitoramento, Empresas ativas/inativas, Usuários, Convites e Logs.
- Exportar os registros visíveis após busca/filtros, com título da tela, empresa e data da geração.
- Manter caracteres em português, datas e valores monetários formatados; remover HTML dos campos ricos para formatos tabulares.
- Gerar PDF em orientação adequada à quantidade de colunas e arquivos Excel editáveis.

### 3. Dashboard com dados reais
- Substituir os zeros fixos por contagens da empresa selecionada: equipamentos, linhas ativas, acessos, monitores no ar e membros.
- Exibir estados de carregamento/erro sem alterar o tamanho das caixas e atualizar tudo ao trocar de empresa ou modificar registros.
- Manter a lista de atividades recentes alimentada pelo novo histórico.

### 4. Logs de auditoria — somente Master
- Tornar o histórico automático no banco para que inclusões, edições, exclusões, ativação/desativação e mudanças de acesso não dependam do navegador.
- Registrar módulo, usuário, data/hora, item, ação e diferenças campo a campo entre valor anterior e novo.
- Preservar o histórico como somente leitura, com políticas que permitam consulta apenas ao Master.
- Adicionar uma tela em Administração Global com busca, filtros por empresa/módulo/usuário/ação/período, paginação e painel de detalhes das alterações.
- Cobrir Infraestrutura, Monitoramento, Empresas, Usuários/vínculos, Convites e configurações relevantes; eventos automáticos de verificação não poluirão o histórico administrativo.

### 5. Alertas por monitor
- No cadastro de cada monitor, adicionar controles independentes para e-mail e push.
- Permitir informar um ou mais e-mails e selecionar um ou mais usuários vinculados à empresa para receber push.
- Enviar alertas somente nas transições confirmadas pelo anti-flapping: indisponibilidade e recuperação, incluindo monitor, empresa, horário, causa, latência e duração do incidente.
- Registrar o resultado de cada tentativa de notificação para diagnóstico, sem impedir o ciclo de monitoramento se um canal falhar.
- Para push, registrar navegadores/dispositivos dos usuários, pedir permissão somente após ação do usuário e abrir diretamente o monitor correspondente ao tocar na notificação.
- Mostrar estados claros para navegador incompatível, permissão negada e visualização incorporada que exige abrir em nova aba.

## Dependências e configuração
- O envio por e-mail depende de um domínio remetente configurado e verificado; atualmente o projeto ainda não possui esse domínio configurado.
- A entrega push exigirá conectar o Firebase Cloud Messaging com suporte a web push durante a implementação.
- As alterações estruturais do banco serão aditivas, com permissões e regras de acesso aplicadas na mesma migração.

## Validação
- Conferir as exportações abrindo PDF, XLSX e CSV gerados em cada tipo de lista.
- Verificar contagens do Dashboard contra os registros reais e após troca de empresa.
- Testar criação, edição e exclusão para confirmar os valores antes/depois no Log e a restrição exclusiva ao Master.
- Simular queda e recuperação de monitor, validando e-mail, push, clique na notificação e registro de falhas.
- Revisar visualmente barras e tabelas em desktop, tablet e mobile, nos temas claro e escuro.
