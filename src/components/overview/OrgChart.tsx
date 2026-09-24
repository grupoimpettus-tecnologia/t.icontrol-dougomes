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
}: {
  no: NoOrg;
  todos: NoOrg[];
  onSelect?: (no: NoOrg) => void;
}) {
  const filhos = todos.filter((n) => n.parent === no.id);
  const clicavel = Boolean(onSelect);
  return (
    <li>
      <button
        type="button"
        className={`org-box text-left ${clicavel ? "cursor-pointer transition hover:border-primary/60 hover:shadow-md" : "cursor-default"}`}
        onClick={() => onSelect?.(no)}
        disabled={!clicavel}
      >
        <p className="text-sm font-semibold leading-tight">{no.titulo}</p>
        {no.subtitulo && <p className="mt-0.5 text-xs text-muted-foreground">{no.subtitulo}</p>}
        {temConteudo(no.conteudo) && (
          <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-primary/80">
            Ver detalhes
          </p>
        )}
      </button>
      {filhos.length > 0 && (
        <ul>
          {filhos.map((f) => (
            <Ramo key={f.id} no={f} todos={todos} {...(onSelect ? { onSelect } : {})} />
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
}: {
  nos: NoOrg[];
  onSelect?: (no: NoOrg) => void;
  /** Usa largura disponível (útil para fluxogramas com muitos passos empilhados). */
  fullWidth?: boolean;
}) {
  const ids = new Set(nos.map((n) => n.id));
  const raizes = nos.filter((n) => !n.parent || !ids.has(n.parent));
  if (!nos.length) return <p className="py-10 text-center text-sm text-muted-foreground">Nada para exibir.</p>;
  return (
    <div className={fullWidth ? "py-4" : "overflow-x-auto py-6"}>
      <div className={`org-tree mx-auto ${fullWidth ? "w-full max-w-4xl" : "w-max"}`}>
        <ul>
          {raizes.map((r) => (
            <Ramo key={r.id} no={r} todos={nos} {...(onSelect ? { onSelect } : {})} />
          ))}
        </ul>
      </div>
    </div>
  );
}
