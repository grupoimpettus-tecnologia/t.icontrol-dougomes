import { test } from "node:test";
import { strict as assert } from "node:assert";
import { MICROAREAS, CARGOS_MICROAREA, copiarFuncoes } from "./microarea-cargos.ts";
import { classificarResponsavel, completarFuncoesPeloOrganograma, extrairItensOrganograma } from "./funcoes-por-responsavel.ts";

const tabela = `
<h2>Redes</h2>
<table>
<tr><th><p>Atividade Principal</p></th><th><p>Descrição Detalhada</p></th><th><p>Responsável</p></th><th><p>Responsáveis Cenário Atual</p></th></tr>
<tr><td><p>1.1 Projeto e Arquitetura de Rede</p></td><td><p>Definir topologia</p></td><td><p>Arquiteto de Rede/Coordenador</p></td><td><p>Analista</p></td></tr>
<tr><td><p>1.2 Configuração de Switches/Routers</p></td><td><p>Configurar VLANs</p></td><td><p>Analista de Redes</p></td><td><p>Analista</p></td></tr>
<tr><td><p>1.4 Gestão de Firewalls</p></td><td><p>Configurar regras, NAT</p></td><td><p>Especialista em Segurança/Redes</p></td><td><p>Especialista/Analista</p></td></tr>
<tr><td><p>1.5 Troubleshooting de Rede</p></td><td><p>Diagnosticar falhas</p></td><td><p></p></td><td><p></p></td></tr>
<tr><td><p>1.6 Documentação de Rede</p></td><td><p>Registrar topologia</p></td><td><p>Assistente</p></td><td><p>Assistente</p></td></tr>
<tr><td><p>Visitas locais</p></td><td><p>Suporte T.I da loja</p></td><td><p>Suporte local</p></td><td><p>HouseTI</p></td></tr>
</table>
<ul>
<li><p>Antispam/antivírus email: HouseTI</p></li>
<li><p>Quotas e listas</p></li>
</ul>`;

test("analista, assistente e parceiro definem os dois lados", () => {
  assert.deepEqual(classificarResponsavel("Analista"), { analista: true, assistente: false, marcado: true });
  assert.deepEqual(classificarResponsavel("Especialista/Analista"), { analista: true, assistente: false, marcado: true });
  assert.deepEqual(classificarResponsavel("Analista/Assistente"), { analista: true, assistente: true, marcado: true });
  assert.deepEqual(classificarResponsavel("HouseTI"), { analista: true, assistente: true, marcado: true });
});

test("linha vazia herda a classificação e HouseTI entra nos dois cargos", () => {
  const itens = extrairItensOrganograma(tabela);
  const porNome = new Map(itens.map((item) => [item.atividade, item]));
  assert.equal(porNome.get("1.1 Projeto e Arquitetura de Rede")?.analista, true);
  assert.equal(porNome.get("1.5 Troubleshooting de Rede")?.analista, true);
  assert.equal(porNome.get("1.5 Troubleshooting de Rede")?.assistente, false);
  assert.equal(porNome.get("1.6 Documentação de Rede")?.assistente, true);
  assert.equal(porNome.get("1.6 Documentação de Rede")?.analista, false);
  assert.equal(porNome.get("Visitas locais")?.analista, true);
  assert.equal(porNome.get("Visitas locais")?.assistente, true);
  assert.equal(porNome.get("Antispam/antivírus email")?.assistente, true);
  assert.equal(porNome.get("Quotas e listas"), undefined);
});

test("organiza por seção e mantém o subitem abaixo do grupo", () => {
  const html = `<h2>EQUIPAMENTOS</h2><ul><li><p><strong>Notebooks/Celulares:</strong></p><ul><li><p>Gestão de inventário</p></li><li><p>Suporte técnico hardware: Analista</p></li></ul></li></ul>`;
  const funcoes = copiarFuncoes([{ microarea: "Infraestrutura", cargo: "Gestor", funcoes_html: "<p>Função do gestor</p>" }]);
  const resultado = completarFuncoesPeloOrganograma(funcoes, [{ id: "infra", titulo: "Infraestrutura", parent: null, conteudo: html }]);
  const analista = resultado.find((item) => item.cargo === "Analista" && item.microarea === "Infraestrutura")?.funcoes_html ?? "";
  assert.match(analista, /<h2>EQUIPAMENTOS<\/h2><ul><li><p><strong>Notebooks\/Celulares:<\/strong><\/p><ul><li><p>Suporte técnico hardware<\/p><\/li><\/ul><\/li><\/ul>/);
  assert.doesNotMatch(analista, /Gestão de inventário/);
  assert.equal(resultado.find((item) => item.cargo === "Gestor")?.funcoes_html, "<p>Função do gestor</p>");
});

test("completa analista e assistente sem alterar o gestor e sem colar a descrição no título", () => {
  const funcoes = copiarFuncoes([{ microarea: "Infraestrutura", cargo: "Gestor", funcoes_html: "<p>Função do gestor</p>" }, { microarea: "Infraestrutura", cargo: "Analista", funcoes_html: "<p>texto antigo sem seções</p>" }]);
  const resultado = completarFuncoesPeloOrganograma(funcoes, [
    { id: "infra", titulo: "Infraestrutura", parent: null, conteudo: tabela },
    { id: "filho", titulo: "Redes", parent: "infra", conteudo: "<ul><li>Backup de configuração: Assistente</li></ul>" },
  ]);
  const gestor = resultado.find((item) => item.microarea === "Infraestrutura" && item.cargo === "Gestor");
  const analista = resultado.find((item) => item.microarea === "Infraestrutura" && item.cargo === "Analista");
  const assistente = resultado.find((item) => item.microarea === "Infraestrutura" && item.cargo === "Assistente");
  assert.equal(gestor?.funcoes_html, "<p>Função do gestor</p>");
  assert.match(analista?.funcoes_html ?? "", /<h2>Redes<\/h2><ul><li><p>1\.1 Projeto e Arquitetura de Rede<\/p><\/li>/);
  assert.doesNotMatch(analista?.funcoes_html ?? "", /Definir topologia|texto antigo/);
  assert.match(assistente?.funcoes_html ?? "", /1\.6 Documentação de Rede/);
  assert.match(assistente?.funcoes_html ?? "", /<li><p>Backup de configuração<\/p><\/li><\/ul>$/);
  assert.equal(resultado.length, MICROAREAS.length * CARGOS_MICROAREA.length);
});
