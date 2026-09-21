import { Construction } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function ModuloEmBreve({
  titulo,
  descricao,
  itens,
}: {
  titulo: string;
  descricao: string;
  itens: string[];
}) {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">{titulo}</h1>
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
            <Construction className="h-3 w-3" /> Em desenvolvimento
          </span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{descricao}</p>
      </div>

      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle>O que vem neste módulo</CardTitle>
          <CardDescription>Planejado para as próximas etapas do projeto.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {itens.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                {item}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
