import { test } from "node:test";
import { strict as assert } from "node:assert";
import { colunaDemanda, diaPermitidoParaEntrega, ladoAtualizacao, lerIsoData, proximoStatus, resumoDemandas, statusDemanda, sugerirDatasDemanda } from "./demandas.ts";

test("sexta, sábado e domingo recuam para a quinta", () => {
  assert.equal(sugerirDatasDemanda(lerIsoData("2026-10-16"), []).dataEntrega, "2026-10-15");
  assert.equal(sugerirDatasDemanda(lerIsoData("2026-10-17"), []).dataEntrega, "2026-10-15");
  assert.equal(sugerirDatasDemanda(lerIsoData("2026-10-18"), []).dataEntrega, "2026-10-15");
});

test("quinta livre permanece e o início é a segunda da mesma semana", () => {
  const sugestao = sugerirDatasDemanda(lerIsoData("2026-10-15"), []);
  assert.equal(sugestao.dataPedida, "2026-10-15");
  assert.equal(sugestao.dataEntrega, "2026-10-15");
  assert.equal(sugestao.dataInicio, "2026-10-12");
});

test("entrega ocupada vai para o dia permitido mais próximo, sem repetir o dia", () => {
  const sugestao = sugerirDatasDemanda(lerIsoData("2026-10-15"), ["2026-10-15"]);
  assert.equal(sugestao.dataEntrega, "2026-10-14");
  assert.notEqual(sugestao.dataEntrega, "2026-10-15");
  assert.equal(diaPermitidoParaEntrega(lerIsoData(sugestao.dataEntrega)), true);
});

test("a coluna segue o intervalo entre início e entrega", () => {
  const hoje = lerIsoData("2026-10-14");
  assert.equal(colunaDemanda("2026-10-19", "2026-10-22", hoje), "a_fazer");
  assert.equal(colunaDemanda("2026-10-12", "2026-10-15", hoje), "em_andamento");
  assert.equal(colunaDemanda("2026-10-05", "2026-10-08", hoje), "concluida");
});

test("o resumo conta total, em andamento e classificação alta", () => {
  const hoje = lerIsoData("2026-10-14");
  const resumo = resumoDemandas(
    [
      { data_inicio: "2026-10-12", data_entrega: "2026-10-15", classificacao: "alta" },
      { data_inicio: "2026-10-19", data_entrega: "2026-10-22", classificacao: "baixa" },
      { data_inicio: "2026-10-05", data_entrega: "2026-10-08", classificacao: "alta" },
    ],
    hoje,
  );
  assert.equal(resumo.total, 3);
  assert.equal(resumo.emAndamento, 1);
  assert.equal(resumo.statusAlto, 2);
});

test("o status manual define a coluna e o próximo passo", () => {
  const hoje = lerIsoData("2026-10-14");
  const item = { data_inicio: "2026-10-12", data_entrega: "2026-10-15", status: "a_fazer" as const };
  assert.equal(statusDemanda(item, hoje), "a_fazer");
  assert.equal(proximoStatus("a_fazer"), "em_andamento");
  assert.equal(proximoStatus("em_andamento"), "concluida");
  assert.equal(proximoStatus("concluida"), null);
  assert.equal(resumoDemandas([{ ...item, classificacao: "alta" }], hoje).emAndamento, 0);
});

test("o cadastrante fica à direita e outro usuário à esquerda", () => {
  assert.equal(ladoAtualizacao("autor-1", "autor-1"), "direita");
  assert.equal(ladoAtualizacao("autor-2", "autor-1"), "esquerda");
});

test("semana cheia empurra a entrega para a próxima segunda", () => {
  const sugestao = sugerirDatasDemanda(lerIsoData("2026-10-15"), [
    "2026-10-12",
    "2026-10-13",
    "2026-10-14",
    "2026-10-15",
  ]);
  assert.equal(sugestao.dataEntrega, "2026-10-19");
  assert.equal(sugestao.dataInicio, "2026-10-19");
});
