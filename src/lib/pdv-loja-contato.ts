import { z } from "zod";

export const contatoLojaSchema = z.object({
  workspaceId: z.string().uuid(),
  codigoFranquia: z.number().int().positive(),
  codigoLoja: z.number().int().positive(),
  email: z.union([z.literal(""), z.email()]).transform((email) => email.trim()),
});

export function exigirMaster(master: boolean | null) {
  if (master !== true) throw new Error("Somente o Master pode editar o e-mail da loja.");
}