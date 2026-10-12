import { test } from "node:test";
import { strict as assert } from "node:assert";
import { contatoLojaSchema, exigirMaster } from "./pdv-loja-contato";

test("somente Master pode editar o e-mail da loja", () => {
  assert.doesNotThrow(() => exigirMaster(true));
  assert.throws(() => exigirMaster(false), /Somente o Master/);
  assert.throws(() => exigirMaster(null), /Somente o Master/);
});

test("contato aceita e-mail válido ou remoção, rejeitando e-mail inválido", () => {
  const loja = { workspaceId: "00000000-0000-4000-8000-000000000001", codigoFranquia: 3078, codigoLoja: 1 };
  assert.equal(contatoLojaSchema.parse({ ...loja, email: "loja@example.com" }).email, "loja@example.com");
  assert.equal(contatoLojaSchema.parse({ ...loja, email: "" }).email, "");
  assert.equal(contatoLojaSchema.safeParse({ ...loja, email: "invalido" }).success, false);
});