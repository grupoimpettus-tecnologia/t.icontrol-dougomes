# Editor formatado nos campos Descrição

## Objetivo

Substituir todos os campos de cadastro chamados “Descrição” nos módulos de Infraestrutura por um editor visual capaz de criar e receber conteúdo formatado, incluindo tabelas como a do exemplo anexado.

## Implementação

- Criar um editor reutilizável com barra de ferramentas para negrito, itálico, sublinhado, listas, alinhamento, links, desfazer/refazer e inserção de tabela. O mais completo possível
- Permitir colar conteúdo já formatado, preservando tabelas e formatação compatível.
- Aplicar o editor somente aos campos “Descrição” de Mapa de Acessos, Serviços & Ativos, Equipamentos e Linhas e Celulares.
- Salvar o conteúdo formatado no campo existente, sem alterar os demais dados ou permissões.
- Sanitizar o conteúdo antes de exibi-lo para evitar código inseguro.
- Manter os demais campos de texto longo, como “Configuração”, no formato atual.

## Validação

- Conferir criação e edição de uma descrição com tabela e texto formatado.
- Confirmar que o conteúdo salvo reaparece com a mesma estrutura ao reabrir o cadastro.
- Verificar o funcionamento nos temas claro e escuro e em telas menores.