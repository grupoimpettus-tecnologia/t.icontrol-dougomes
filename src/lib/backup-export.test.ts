import { test } from "node:test";
import { strict as assert } from "node:assert";
import { montarArquivoBackup, TABELAS_BACKUP, TAMANHO_PAGINA_BACKUP } from "./backup-export.ts";

const cabecalho = {
  formato: "ticontrol-backup" as const, versao: 1 as const,
  gerado_em: "2026-10-24T18:35:00Z",
  workspace: { id: "empresa-1", nome: "Empresa teste", slug: "teste" },
};

test("backup grande reúne todas as páginas sem perder linhas e mantém o formato restaurável", async () => {
  const dados = Array.from({ length: 1501 }, (_, i) => ({ id: i + 1, workspace_id: "empresa-1" }));
  let chamadas = 0;
  let maximo = 0;
  let total = 0;
  const blob = await montarArquivoBackup(cabecalho, async ({ tabela, depoisId, ultimoId }) => {
    if (tabela !== "monitor_checks") return { linhasJson: "[]", quantidade: 0, proximoId: null, ultimoId: null };
    chamadas++;
    const inicio = Number(depoisId ?? 0);
    const linhas = dados.slice(inicio, inicio + TAMANHO_PAGINA_BACKUP);
    maximo = Math.max(maximo, linhas.length);
    if (chamadas > 1) assert.equal(ultimoId, "1501");
    return {
      linhasJson: JSON.stringify(linhas), quantidade: linhas.length,
      proximoId: inicio + linhas.length < dados.length ? String(inicio + linhas.length) : null,
      ultimoId: "1501",
    };
  }, (n) => { total = n; });
  const arquivo = JSON.parse(await blob.text());
  assert.equal(chamadas, 4);
  assert.equal(maximo, 500);
  assert.equal(total, 1501);
  assert.deepEqual(arquivo.tabelas.monitor_checks, dados);
  assert.deepEqual(arquivo.workspace, cabecalho.workspace);
  assert.equal(arquivo.formato, "ticontrol-backup");
  assert.equal(arquivo.versao, 1);
  assert.deepEqual(Object.keys(arquivo.tabelas), [...TABELAS_BACKUP]);
});

test("falha em uma página cancela o arquivo, sem entregar backup incompleto", async () => {
  await assert.rejects(montarArquivoBackup(cabecalho, async () => { throw new Error("Falha de leitura"); }, () => {}), /Falha de leitura/);
});

test("cursor repetido interrompe a leitura em vez de acumular páginas indefinidamente", async () => {
  await assert.rejects(montarArquivoBackup(cabecalho, async () => ({
    linhasJson: '[{"id":"1"}]', quantidade: 1, proximoId: "1", ultimoId: "1",
  }), () => {}), /não avançou/);
});