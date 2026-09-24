export type NoOrg = { id: string; titulo: string; subtitulo?: string | null; parent: string | null };

function Ramo({ no, todos }: { no: NoOrg; todos: NoOrg[] }) {
  const filhos = todos.filter((n) => n.parent === no.id);
  return (
    <li>
      <div className="org-box">
        <p className="text-sm font-semibold leading-tight">{no.titulo}</p>
        {no.subtitulo && <p className="mt-0.5 text-xs text-muted-foreground">{no.subtitulo}</p>}
      </div>
      {filhos.length > 0 && (
        <ul>
          {filhos.map((f) => (
            <Ramo key={f.id} no={f} todos={todos} />
          ))}
        </ul>
      )}
    </li>
  );
}

export function OrgChart({ nos }: { nos: NoOrg[] }) {
  const ids = new Set(nos.map((n) => n.id));
  const raizes = nos.filter((n) => !n.parent || !ids.has(n.parent));
  if (!nos.length) return <p className="py-10 text-center text-sm text-muted-foreground">Nada para exibir.</p>;
  return (
    <div className="overflow-x-auto py-6">
      <div className="org-tree mx-auto w-max">
        <ul>
          {raizes.map((r) => (
            <Ramo key={r.id} no={r} todos={nos} />
          ))}
        </ul>
      </div>
    </div>
  );
}
