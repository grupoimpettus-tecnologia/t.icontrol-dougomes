import { test } from "node:test";
import { strict as assert } from "node:assert";
import { colunaDemanda, diaPermitidoParaEntrega, lerIsoData, sugerirDatasDemanda } from "./demandas.ts";

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
