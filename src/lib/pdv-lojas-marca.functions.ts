import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const BASE_PADRAO = "https://lx-degust-api-integracao-prd.azurewebsites.net";

export const MARCAS_PDV = [
  { marca: "Espetto Carioca", codigoFranquia: 3078 },
  { marca: "Momento Bendito", codigoFranquia: 3082 },
  { marca: "Mané", codigoFranquia: 1428 },
  { marca: "Buteco Seu Rufino", codigoFranquia: 3081 },
] as const;

export type HistoricoLoja = {
  cnpjAnterior: string;
  cnpjNovo: string;
  vigenteAte: string;
  alteradoEm: string;
  texto: string;
};

export type LojaMarca = {
  codigoFranquia: number;
  codigoLoja: number;
  nome: string;
  marca: string;
  cnpj: string;
  email: string;
  endereco: string;
  estado: string;
  temPromocao: boolean;
  historico: HistoricoLoja[];
};

export type ResumoMarca = {
  marca: string;
  codigoFranquia: number;
  quantidade: number;
  comPromocao: number;
};

export type ConsultaLojasMarca = {
  consultadoEm: string;
  totalLojas: number;
  porMarca: ResumoMarca[];
  lojas: LojaMarca[];
  avisos: string[];
};

type RegistroApi = Record<string, unknown>;

type EstadoApi = {
  codigo_franquia: number;
  codigo_loja: number;
  cnpj: string;
  visto_em: string;
};

type LojaLocal = {
  nome: string;
  marca: string;
  cnpj: string;
  updated_at: string;
  created_at: string;
};

function texto(valor: unknown) {
  return String(valor ?? "").trim();
}

function campo(obj: RegistroApi | undefined, nome: string) {
  return texto(obj?.[nome]);
}

function digitosCnpj(valor: string) {
  return valor.replace(/\D/g, "").slice(0, 14);
}

export function formatarCnpj(valor: string) {
  const d = digitosCnpj(valor);
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

function chave(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, " ")
    .trim()
    .toUpperCase();
}

function nomesCompativeis(a: string, b: string) {
  const na = chave(a);
  const nb = chave(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  return na.length >= 8 && nb.length >= 8 && (na.includes(nb) || nb.includes(na));
}

function marcasCompativeis(local: string, marca: string) {
  const a = chave(local);
  const b = chave(marca);
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

function formatarData(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function textoHistorico(anterior: string, novo: string, vigenteAte: string, alteradoEm: string) {
  return `Unidade tinha o CNPJ '${formatarCnpj(anterior)}' até a data '${formatarData(vigenteAte)}' e alterou para '${formatarCnpj(novo)}' na data '${formatarData(alteradoEm)}'.`;
}

function montarEndereco(endereco: RegistroApi | undefined, lista: RegistroApi) {
  const logradouro = campo(endereco, "nomeEndereco") || campo(lista, "endereco");
  const numeroBruto = campo(endereco, "numero") || campo(lista, "numeroEndereco");
  const numero = numeroBruto && numeroBruto !== "0" ? numeroBruto : "";
  const bairro = campo(endereco, "bairro") || campo(lista, "bairro");
  const complemento = campo(endereco, "complemento") || campo(lista, "complemento");
  const cidade = campo(endereco, "cidade") || campo(lista, "cidade");
  const linha = [logradouro, numero].filter(Boolean).join(", ");
  const partes = [linha, bairro, complemento, cidade].filter(Boolean);
  const estado = campo(endereco, "estado") || campo(lista, "uf");
  return {
    endereco: partes.join(" · ") || "Não informado",
    estado: estado || "Não informado",
  };
}

async function mapPool<T, R>(itens: T[], limite: number, fn: (item: T) => Promise<R>) {
  const saida = new Array<R>(itens.length);
  let proximo = 0;
  async function trabalhador() {
    while (proximo < itens.length) {
      const indice = proximo++;
      const item = itens[indice];
      if (item !== undefined) saida[indice] = await fn(item);
    }
  }
  const trabalhadores = Math.min(limite, itens.length);
  await Promise.all(Array.from({ length: trabalhadores }, () => trabalhador()));
  return saida;
}

async function autenticar(base: string, usuario: string, senha: string, codigoFranqueador: number) {
  const resposta = await fetch(`${base}/api/usuario/autenticar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ usuario, senha, codigoFranqueador }),
    signal: AbortSignal.timeout(20000),
  });
  if (!resposta.ok) {
    throw new Error(`Falha ao autenticar ${codigoFranqueador} (${resposta.status})`);
  }
  const json = (await resposta.json()) as { acesso?: { token?: string } };
  const token = json.acesso?.token;
  if (!token) throw new Error(`Token ausente para a franquia ${codigoFranqueador}`);
  return token;
}

async function lerJson(resposta: Response) {
  if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
  return (await resposta.json()) as unknown;
}

function tabelaAusente(mensagem: string) {
  return /schema cache|Could not find the table|does not exist/i.test(mensagem);
}

export const consultarLojasMarca = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ workspaceId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }): Promise<ConsultaLojasMarca> => {
    const { data: papel } = await context.supabase.rpc("workspace_role", {
      _user_id: context.userId,
      _workspace_id: data.workspaceId,
    });
    if (!papel) throw new Error("Sem acesso a esta empresa");

    const base = (process.env["DEGUST_API_BASE"] || BASE_PADRAO).replace(/\/$/, "");
    const usuario = process.env["DEGUST_USUARIO"];
    const senha = process.env["DEGUST_SENHA"];
    if (!usuario || !senha) {
      throw new Error("Configure DEGUST_USUARIO e DEGUST_SENHA no ambiente do servidor.");
    }

    const avisos: string[] = [];
    const consultadoEm = new Date().toISOString();

    const porFranquia = await Promise.all(
      MARCAS_PDV.map(async (marca) => {
        const token = await autenticar(base, usuario, senha, marca.codigoFranquia);
        const listaResposta = await fetch(
          `${base}/api/loja/listarLojasFranquia?codigoFranquia=${marca.codigoFranquia}`,
          { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(30000) },
        );
        const listaBruta = await lerJson(listaResposta);
        const lista = Array.isArray(listaBruta) ? (listaBruta as RegistroApi[]) : [];
        const detalhes = await mapPool(lista, 8, async (item) => {
          const codigoLoja = Number(item["codigoLoja"]);
          try {
            const [detalheResposta, promoResposta] = await Promise.all([
              fetch(
                `${base}/api/loja/loja?CodigoFranqueador=${marca.codigoFranquia}&CodigoLoja=${codigoLoja}`,
                { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(20000) },
              ),
              fetch(`${base}/api/produto/consultar-promocoes`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                body: JSON.stringify({ codigoFranquia: marca.codigoFranquia, codigoLoja }),
                signal: AbortSignal.timeout(20000),
              }),
            ]);
            const detalhe = (await lerJson(detalheResposta)) as RegistroApi;
            const promocoes = await lerJson(promoResposta);
            return { item, detalhe, temPromocao: Array.isArray(promocoes) && promocoes.length > 0, detalheOk: true };
          } catch {
            return { item, detalhe: null as RegistroApi | null, temPromocao: false, detalheOk: false };
          }
        });
        return { marca, token, detalhes };
      }),
    );

    type Unidade = LojaMarca & { cnpjDigitos: string };
    const unidades: Unidade[] = [];

    for (const grupo of porFranquia) {
      let falhas = 0;
      for (const entrada of grupo.detalhes) {
        const dadosGerais = (entrada.detalhe?.["dadosGerais"] ?? {}) as RegistroApi;
        const ativo = campo(dadosGerais, "ativo").toUpperCase();
        if (entrada.detalheOk) {
          if (ativo !== "S") continue;
        } else {
          falhas += 1;
          const situacao = campo(entrada.item, "situacao").toUpperCase();
          const situacaoLoja = chave(campo(entrada.item, "situacaoLoja"));
          if (situacao !== "A" && !situacaoLoja.includes("OPERACAO")) continue;
        }
        const cnpjDigitos = digitosCnpj(campo(dadosGerais, "cnpj") || campo(entrada.item, "cnpj"));
        const email = campo(entrada.item, "email") || campo(entrada.item, "emailGerenteLoja") || "Não informado";
        const local = montarEndereco(entrada.detalhe?.["endereco"] as RegistroApi | undefined, entrada.item);
        unidades.push({
          codigoFranquia: grupo.marca.codigoFranquia,
          codigoLoja: Number(entrada.item["codigoLoja"]),
          nome: campo(dadosGerais, "nomeFantasia") || campo(entrada.item, "nomeLoja") || "Sem nome",
          marca: grupo.marca.marca,
          cnpj: cnpjDigitos ? formatarCnpj(cnpjDigitos) : "Não informado",
          cnpjDigitos,
          email,
          endereco: local.endereco,
          estado: local.estado,
          temPromocao: entrada.temPromocao,
          historico: [],
        });
      }
      if (falhas > 0) {
        avisos.push(
          `${grupo.marca.marca}: ${falhas} unidade(s) sem retorno completo do cadastro. A lista usou a situação da franquia.`,
        );
      }
    }

    const historicoPorChave = new Map<string, HistoricoLoja[]>();
    const db = context.supabase as unknown as {
      from: (tabela: string) => {
        select: (cols: string) => {
          eq: (col: string, valor: string) => Promise<{ data: unknown; error: { message: string } | null }>;
        };
        upsert: (
          linhas: unknown[],
          opts: { onConflict: string },
        ) => Promise<{ error: { message: string } | null }>;
        insert: (linhas: unknown[]) => Promise<{ error: { message: string } | null }>;
      };
    };

    try {
      const [estadoResp, historicoResp, locaisResp] = await Promise.all([
        db.from("pdv_loja_api_estado").select("codigo_franquia, codigo_loja, cnpj, visto_em").eq("workspace_id", data.workspaceId),
        db
          .from("pdv_loja_atualizacoes")
          .select("codigo_franquia, codigo_loja, cnpj_anterior, cnpj_novo, vigente_ate, alterado_em")
          .eq("workspace_id", data.workspaceId),
        db.from("pdv_lojas").select("nome, marca, cnpj, updated_at, created_at").eq("workspace_id", data.workspaceId),
      ]);
      const erroLeitura = estadoResp.error || historicoResp.error || locaisResp.error;
      if (erroLeitura) throw new Error(erroLeitura.message);

      const estados = (estadoResp.data ?? []) as EstadoApi[];
      const historicos = (historicoResp.data ?? []) as {
        codigo_franquia: number;
        codigo_loja: number;
        cnpj_anterior: string;
        cnpj_novo: string;
        vigente_ate: string;
        alterado_em: string;
      }[];
      const locais = (locaisResp.data ?? []) as LojaLocal[];
      const estadoPorChave = new Map(estados.map((e) => [`${e.codigo_franquia}:${e.codigo_loja}`, e]));

      for (const item of historicos) {
        const chaveLoja = `${item.codigo_franquia}:${item.codigo_loja}`;
        const lista = historicoPorChave.get(chaveLoja) ?? [];
        lista.push({
          cnpjAnterior: formatarCnpj(item.cnpj_anterior),
          cnpjNovo: formatarCnpj(item.cnpj_novo),
          vigenteAte: item.vigente_ate,
          alteradoEm: item.alterado_em,
          texto: textoHistorico(item.cnpj_anterior, item.cnpj_novo, item.vigente_ate, item.alterado_em),
        });
        historicoPorChave.set(chaveLoja, lista);
      }

      const novos: {
        workspace_id: string;
        codigo_franquia: number;
        codigo_loja: number;
        marca: string;
        nome: string;
        cnpj_anterior: string;
        cnpj_novo: string;
        vigente_ate: string;
        alterado_em: string;
      }[] = [];
      const estadosNovos: {
        workspace_id: string;
        codigo_franquia: number;
        codigo_loja: number;
        marca: string;
        nome: string;
        cnpj: string;
        visto_em: string;
        updated_at: string;
      }[] = [];

      for (const unidade of unidades) {
        if (unidade.cnpjDigitos.length !== 14) continue;
        const chaveLoja = `${unidade.codigoFranquia}:${unidade.codigoLoja}`;
        const estado = estadoPorChave.get(chaveLoja);
        let anterior = "";
        let vigenteAte = "";
        if (estado && digitosCnpj(estado.cnpj) !== unidade.cnpjDigitos) {
          anterior = digitosCnpj(estado.cnpj);
          vigenteAte = estado.visto_em;
        } else if (!estado) {
          const compativeis = locais.filter(
            (local) => marcasCompativeis(local.marca, unidade.marca) && nomesCompativeis(local.nome, unidade.nome),
          );
          const igual = compativeis.find((local) => digitosCnpj(local.cnpj) === unidade.cnpjDigitos);
          if (!igual) {
            const diferente = compativeis
              .filter((local) => digitosCnpj(local.cnpj).length === 14)
              .sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1))[0];
            if (diferente) {
              anterior = digitosCnpj(diferente.cnpj);
              vigenteAte = diferente.updated_at || diferente.created_at;
            }
          }
        }
        if (anterior && vigenteAte) {
          const jaExiste = (historicoPorChave.get(chaveLoja) ?? []).some(
            (h) => digitosCnpj(h.cnpjAnterior) === anterior && digitosCnpj(h.cnpjNovo) === unidade.cnpjDigitos,
          );
          if (!jaExiste) {
            const registro = {
              workspace_id: data.workspaceId,
              codigo_franquia: unidade.codigoFranquia,
              codigo_loja: unidade.codigoLoja,
              marca: unidade.marca,
              nome: unidade.nome,
              cnpj_anterior: anterior,
              cnpj_novo: unidade.cnpjDigitos,
              vigente_ate: vigenteAte,
              alterado_em: consultadoEm,
            };
            novos.push(registro);
            const lista = historicoPorChave.get(chaveLoja) ?? [];
            lista.push({
              cnpjAnterior: formatarCnpj(anterior),
              cnpjNovo: unidade.cnpj,
              vigenteAte,
              alteradoEm: consultadoEm,
              texto: textoHistorico(anterior, unidade.cnpjDigitos, vigenteAte, consultadoEm),
            });
            historicoPorChave.set(chaveLoja, lista);
          }
        }
        estadosNovos.push({
          workspace_id: data.workspaceId,
          codigo_franquia: unidade.codigoFranquia,
          codigo_loja: unidade.codigoLoja,
          marca: unidade.marca,
          nome: unidade.nome,
          cnpj: unidade.cnpjDigitos,
          visto_em: consultadoEm,
          updated_at: consultadoEm,
        });
      }

      if (novos.length) {
        const gravacao = await db.from("pdv_loja_atualizacoes").insert(novos);
        if (gravacao.error) throw new Error(gravacao.error.message);
      }
      if (estadosNovos.length) {
        const gravacao = await db
          .from("pdv_loja_api_estado")
          .upsert(estadosNovos, { onConflict: "workspace_id,codigo_franquia,codigo_loja" });
        if (gravacao.error) throw new Error(gravacao.error.message);
      }
    } catch (erro) {
      const mensagem = erro instanceof Error ? erro.message : "Falha ao comparar CNPJ";
      avisos.push(
        tabelaAusente(mensagem)
          ? "Histórico de CNPJ indisponível no momento. Tente novamente em alguns instantes."
          : `Histórico de CNPJ não foi gravado: ${mensagem}`,
      );
    }

    const lojas = unidades
      .map(({ cnpjDigitos: _cnpjDigitos, ...loja }) => ({
        ...loja,
        historico: (historicoPorChave.get(`${loja.codigoFranquia}:${loja.codigoLoja}`) ?? []).sort((a, b) =>
          a.alteradoEm < b.alteradoEm ? 1 : -1,
        ),
      }))
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

    const porMarca = MARCAS_PDV.map((marca) => {
      const daMarca = lojas.filter((loja) => loja.codigoFranquia === marca.codigoFranquia);
      return {
        marca: marca.marca,
        codigoFranquia: marca.codigoFranquia,
        quantidade: daMarca.length,
        comPromocao: daMarca.filter((loja) => loja.temPromocao).length,
      };
    });

    return {
      consultadoEm,
      totalLojas: lojas.filter((loja) => loja.temPromocao).length,
      porMarca,
      lojas,
      avisos,
    };
  });
