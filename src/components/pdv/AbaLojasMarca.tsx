import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { RefreshCw, Store } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { consultarLojasMarca, type LojaMarca } from "@/lib/pdv-lojas-marca.functions";

function formatarConsulta(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function AbaLojasMarca({ ws }: { ws: string | undefined }) {
  const consultar = useServerFn(consultarLojasMarca);
  const [selecionada, setSelecionada] = useState<LojaMarca | null>(null);

  const consulta = useQuery({
    queryKey: ["pdv_lojas_marca", ws],
    enabled: !!ws,
    refetchInterval: 120_000,
    queryFn: () => consultar({ data: { workspaceId: ws! } }),
  });

  const dados = consulta.data;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Lojas/Marca</h2>
          <p className="text-sm text-muted-foreground">
            Unidades ativas no Degust One, separadas por marca. O total conta só lojas com promoção carregada.
            {dados ? ` Última consulta em ${formatarConsulta(dados.consultadoEm)}.` : ""}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => consulta.refetch()} disabled={consulta.isFetching || !ws}>
          <RefreshCw className={`mr-2 h-4 w-4 ${consulta.isFetching ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      {!ws && <p className="text-sm text-muted-foreground">Selecione uma empresa para consultar as lojas.</p>}

      {consulta.isLoading && (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">
            Consultando as marcas no Degust One. A leitura das unidades ativas pode levar alguns segundos.
          </CardContent>
        </Card>
      )}

      {consulta.isError && (
        <Card>
          <CardContent className="py-6 text-sm text-destructive">
            {consulta.error instanceof Error ? consulta.error.message : "Não foi possível consultar as lojas."}
          </CardContent>
        </Card>
      )}

      {dados && (
        <>
          {dados.avisos.length > 0 && (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
              {dados.avisos.map((aviso) => (
                <p key={aviso}>{aviso}</p>
              ))}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total de lojas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{dados.totalLojas}</p>
                <p className="text-xs text-muted-foreground">Todas as marcas, com promoção carregada</p>
              </CardContent>
            </Card>
            {dados.porMarca.map((marca) => (
              <Card key={marca.codigoFranquia}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{marca.marca}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{marca.quantidade}</p>
                  <p className="text-xs text-muted-foreground">{marca.comPromocao} com promoção</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {dados.porMarca.map((marca) => {
            const lojas = dados.lojas.filter((loja) => loja.codigoFranquia === marca.codigoFranquia);
            return (
              <section key={marca.codigoFranquia} className="space-y-2">
                <div className="flex items-center gap-2">
                  <Store className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-semibold">{marca.marca}</h3>
                  <Badge variant="secondary">{lojas.length}</Badge>
                </div>
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <thead className="text-left text-muted-foreground">
                      <tr className="border-b">
                        <th className="p-2">Nome da unidade</th>
                        <th className="p-2">Marca</th>
                        <th className="p-2">CNPJ</th>
                        <th className="p-2">E-mail</th>
                        <th className="p-2">Endereço/Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lojas.length === 0 && (
                        <tr>
                          <td className="p-3 text-muted-foreground" colSpan={5}>
                            Nenhuma unidade ativa nesta marca.
                          </td>
                        </tr>
                      )}
                      {lojas.map((loja) => (
                        <tr
                          key={`${loja.codigoFranquia}-${loja.codigoLoja}`}
                          className="cursor-pointer border-b last:border-0 hover:bg-muted/50"
                          onClick={() => setSelecionada(loja)}
                        >
                          <td className="p-2 font-medium">
                            {loja.nome}
                            {loja.historico.length > 0 && (
                              <Badge variant="secondary" className="ml-2 bg-amber-500/15 text-amber-700 dark:text-amber-400">
                                CNPJ alterado
                              </Badge>
                            )}
                          </td>
                          <td className="p-2">{loja.marca}</td>
                          <td className="p-2 whitespace-nowrap">{loja.cnpj}</td>
                          <td className="p-2">{loja.email}</td>
                          <td className="p-2">
                            {loja.endereco} / {loja.estado}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            );
          })}
        </>
      )}

      <Dialog open={!!selecionada} onOpenChange={(aberto) => !aberto && setSelecionada(null)}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          {selecionada && (
            <>
              <DialogHeader>
                <DialogTitle>{selecionada.nome}</DialogTitle>
              </DialogHeader>
              <dl className="grid grid-cols-[8rem_1fr] gap-x-3 gap-y-2 text-sm">
                <dt className="text-muted-foreground">Marca</dt>
                <dd>{selecionada.marca}</dd>
                <dt className="text-muted-foreground">CNPJ</dt>
                <dd>{selecionada.cnpj}</dd>
                <dt className="text-muted-foreground">E-mail</dt>
                <dd>{selecionada.email}</dd>
                <dt className="text-muted-foreground">Endereço</dt>
                <dd>{selecionada.endereco}</dd>
                <dt className="text-muted-foreground">Estado</dt>
                <dd>{selecionada.estado}</dd>
                <dt className="text-muted-foreground">Promoção</dt>
                <dd>{selecionada.temPromocao ? "Carregada" : "Não carregada"}</dd>
              </dl>
              <section className="space-y-2 rounded-lg border bg-muted/40 p-3">
                <h4 className="text-sm font-semibold">Histórico Atualizações da Loja</h4>
                {selecionada.historico.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhuma alteração de CNPJ em relação ao cadastro da aplicação.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {selecionada.historico.map((item) => (
                      <li key={`${item.cnpjAnterior}-${item.alteradoEm}`} className="text-sm">
                        {item.texto}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
