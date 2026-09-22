import { supabase } from "@/integrations/supabase/client";

export const BUCKET_ANEXOS = "anexos";

export type AnexoInfo = {
  path: string;
  nome: string;
  tipo: string;
  tamanho: number;
};

function nomeSeguro(nome: string) {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .slice(-80);
}

export async function enviarAnexo(workspaceId: string, arquivo: File): Promise<AnexoInfo> {
  const path = `${workspaceId}/${crypto.randomUUID()}-${nomeSeguro(arquivo.name || "arquivo")}`;
  const { error } = await supabase.storage.from(BUCKET_ANEXOS).upload(path, arquivo, {
    contentType: arquivo.type || "application/octet-stream",
    upsert: false,
  });
  if (error) throw error;
  return {
    path,
    nome: arquivo.name || "arquivo",
    tipo: arquivo.type || "application/octet-stream",
    tamanho: arquivo.size,
  };
}

export function podeVisualizar(tipo: string, nome: string) {
  const t = (tipo || "").toLowerCase();
  if (t.startsWith("image/") || t === "application/pdf") return true;
  return /\.(png|jpe?g|gif|webp|avif|svg|bmp|pdf)$/i.test(nome || "");
}

async function urlAssinada(path: string, download?: string) {
  const { data, error } = await supabase.storage
    .from(BUCKET_ANEXOS)
    .createSignedUrl(path, 60 * 60, download ? { download } : undefined);
  if (error || !data) throw error ?? new Error("Não foi possível gerar o link do arquivo.");
  return data.signedUrl;
}

export async function abrirAnexo(path: string) {
  const url = await urlAssinada(path);
  window.open(url, "_blank", "noopener,noreferrer");
}

export async function baixarAnexo(path: string, nome: string) {
  const url = await urlAssinada(path, nome);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function formatarTamanho(bytes: number) {
  if (!bytes) return "";
  const unidades = ["B", "KB", "MB", "GB"];
  let valor = bytes;
  let i = 0;
  while (valor >= 1024 && i < unidades.length - 1) {
    valor /= 1024;
    i += 1;
  }
  return `${valor.toFixed(valor >= 10 || i === 0 ? 0 : 1)} ${unidades[i]}`;
}
