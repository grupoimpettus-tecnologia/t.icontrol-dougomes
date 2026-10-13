import { test } from "node:test";
import { strict as assert } from "node:assert";
import { MICROAREAS, CARGOS_MICROAREA, chaveFuncoes, podeEditarFuncoes } from "./microarea-cargos";

test("estrutura contém as quatro microáreas solicitadas", () => {
  assert.deepEqual(MICROAREAS, ["Infraestrutura", "Segurança", "Sistema PDV", "Implantação PDV"]);
});
test("cada microárea tem a hierarquia Gestor, Analista, Assistente", () => {
  assert.deepEqual(CARGOS_MICROAREA, ["Gestor", "Analista", "Assistente"]);
  assert.equal(new Set(MICROAREAS.flatMap((area) => CARGOS_MICROAREA.map((cargo) => chaveFuncoes(area, cargo)))).size, 12);
});
test("edição mantém as permissões existentes Master e Admin", () => {
  assert.equal(podeEditarFuncoes("master"), true);
  assert.equal(podeEditarFuncoes("admin"), true);
  assert.equal(podeEditarFuncoes("tecnico"), false);
  assert.equal(podeEditarFuncoes("viewer"), false);
  assert.equal(podeEditarFuncoes(undefined), false);
});