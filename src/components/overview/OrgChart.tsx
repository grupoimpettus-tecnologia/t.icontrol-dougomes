import { ConteudoRico } from "@/components/infra/ConteudoRico";

export type NoOrg = {
  id: string;
  titulo: string;
  subtitulo?: string | null;
  parent: string | null;
  /** HTML do editor rico (texto formatado + anexos). */
  conteudo?: string | null;
};

function temConteudo(html: string | null | undefined) {
  if (!html?.trim()) return false;
  const texto = html.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim();
  return Boolean(texto) || /data-anexo/.test(html);
}

function Ramo({
  no,
  todos,
  onSelect,
  exibirFuncoes,
}: {
  no: NoOrg;
  todos: NoOrg[];
  onSelect?: (no: NoOrg) => void;
  exibirFuncoes?: boolean;
}) {
  const filhos = todos.filter((n) => n.parent === no.id);
  const funcoesVisiveis = Boolean(exibirFuncoes && temConteudo(no.conteudo));
  const clicavel = Boolean(onSelect) && !funcoesVisiveis;
  const caixa = (
    <>
      <div className={funcoesVisiveis ? "text-center" : undefined}>
        <p className="text-sm font-semibold leading-tight">{no.titulo}</p>
        {no.subtitulo && <p className="mt-0.5 text-xs text-muted-foreground">{no.subtitulo}</p>}
      </div>
      {funcoesVisiveis ? (
        <div className="org-funcoes">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">Funções</p>
          <ConteudoRico html={no.conteudo ?? ""} className="org-funcoes-texto" />
        </div>
      ) : (
        temConteudo(no.conteudo) && (
          <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-primary/80">
            Ver detalhes
          </p>
        )
      )}
    </>
  );
  return (
    <li>
      {clicavel ? (
        <button
          type="button"
          className="org-box cursor-pointer text-left transition hover:border-primary/60 hover:shadow-md"
          onClick={() => onSelect?.(no)}
        >
          {caixa}
        </button>
      ) : (
        <div className={`org-box ${funcoesVisiveis ? "org-box-funcoes" : ""}`}>{caixa}</div>
      )}
      {filhos.length > 0 && (
        <ul>
          {filhos.map((f) => (
            <Ramo
              key={f.id}
              no={f}
              todos={todos}
              exibirFuncoes={Boolean(exibirFuncoes)}
              {...(onSelect ? { onSelect } : {})}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export function OrgChart({
  nos,
  onSelect,
  fullWidth = false,
  exibirFuncoes = false,
}: {
  nos: NoOrg[];
  onSelect?: (no: NoOrg) => void;
  /** Usa largura disponível (útil para fluxogramas com muitos passos empilhados). */
  fullWidth?: boolean;
  /** Mostra o conteúdo cadastrado no próprio card, no lugar de "Ver detalhes". */
  exibirFuncoes?: boolean;
}) {
  const ids = new Set(nos.map((n) => n.id));
  const raizes = nos.filter((n) => !n.parent || !ids.has(n.parent));
  if (!nos.length) return <p className="py-10 text-center text-sm text-muted-foreground">Nada para exibir.</p>;
  return (
    <div className={fullWidth ? "py-4" : "overflow-x-auto py-6"}>
      <div className={`org-tree mx-auto ${fullWidth ? "w-full max-w-4xl" : "w-max"}`}>
        <ul>
          {raizes.map((r) => (
            <Ramo
              key={r.id}
              no={r}
              todos={nos}
              exibirFuncoes={exibirFuncoes}
              {...(onSelect ? { onSelect } : {})}
            />
          ))}
        </ul>
      </div>
    </div>
  );
}
