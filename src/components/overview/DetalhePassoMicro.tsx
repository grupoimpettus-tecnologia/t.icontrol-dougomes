import type { PassoMicroFranqueado } from "@/data/micro-franqueado";

export function DetalhePassoMicro({ passo }: { passo: PassoMicroFranqueado }) {
  return (
    <div className="space-y-4 text-sm">
      <div className="space-y-2">
        <p className="font-semibold text-foreground">{passo.tiIntro ?? "T.I da Franqueadora:"}</p>
        {passo.tiTexto && <p className="leading-relaxed text-muted-foreground">{passo.tiTexto}</p>}
        {passo.tiItens && passo.tiItens.length > 0 && (
          <ul className="list-disc space-y-1.5 pl-5 leading-relaxed text-muted-foreground">
            {passo.tiItens.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
      </div>
      {passo.entregavel && (
        <div className="rounded-md border border-primary/20 bg-primary/5 p-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-primary">Entregável</p>
          <p className="leading-relaxed text-muted-foreground">{passo.entregavel}</p>
        </div>
      )}
      {passo.pontoAtencao && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
            Ponto de atenção
          </p>
          <p className="leading-relaxed text-muted-foreground">{passo.pontoAtencao}</p>
        </div>
      )}
    </div>
  );
}
