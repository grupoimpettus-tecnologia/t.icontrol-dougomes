/** Formato alvo das linhas RJ: `21 00000-0000`. */

const FORMATO_21 = /^21 \d{5}-\d{4}$/;

/** Remove tudo que não for dígito. */
export function apenasDigitos(valor: string) {
  return valor.replace(/\D/g, "");
}

/**
 * Organiza o número da coluna "Número" (phone_lines.linha):
 * - Já no formato `21 00000-0000` → mantém
 * - Começa com DDD 11 → mantém (sem ajuste)
 * - Tem 21, mas fora do formato → normaliza
 * - Não tem 21 antes do primeiro 9 → inclui 21 e formata
 */
export function formatarNumeroLinha(valor: string | null | undefined): string {
  if (valor == null) return "";
  const original = String(valor).trim();
  if (!original) return original;

  if (FORMATO_21.test(original)) return original;

  const digitos = apenasDigitos(original);
  if (!digitos) return original;

  // DDD 11: não executar nenhum ajuste.
  if (digitos.startsWith("11")) return original;

  const idx9 = digitos.indexOf("9");
  if (idx9 === -1) return original;

  const prefixo = digitos.slice(0, idx9);
  // Outro DDD (ex.: 13, 19): não forçar 21.
  if (prefixo !== "" && prefixo !== "21") return original;

  const local = digitos.slice(idx9, idx9 + 9);
  if (local.length < 9) return original;

  return `21 ${local.slice(0, 5)}-${local.slice(5)}`;
}

export function precisaFormatarNumeroLinha(valor: string | null | undefined) {
  if (valor == null || !String(valor).trim()) return false;
  return formatarNumeroLinha(valor) !== String(valor).trim();
}
