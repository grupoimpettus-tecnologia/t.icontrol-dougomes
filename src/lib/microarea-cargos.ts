export const MICROAREAS = ["Infraestrutura", "Segurança", "Sistema PDV", "Implantação PDV"] as const;
export const CARGOS_MICROAREA = ["Gestor", "Analista", "Assistente"] as const;
export type Microarea = (typeof MICROAREAS)[number];
export type CargoMicroarea = (typeof CARGOS_MICROAREA)[number];

export type FuncaoMicroarea = { microarea: Microarea; cargo: CargoMicroarea; funcoes_html: string };
export type VersaoCargos = { id: string; nome: string; periodo: string | null; atual: boolean; funcoes: FuncaoMicroarea[] };

export function copiarFuncoes(funcoes: FuncaoMicroarea[]): FuncaoMicroarea[] {
  return MICROAREAS.flatMap((microarea) => CARGOS_MICROAREA.map((cargo) => ({
    microarea, cargo,
    funcoes_html: funcoes.find((f) => f.microarea === microarea && f.cargo === cargo)?.funcoes_html ?? "",
  })));
}

export function chaveFuncoes(microarea: Microarea, cargo: CargoMicroarea) {
  return `${microarea}:${cargo}`;
}

export function podeEditarFuncoes(role: string | undefined) {
  return role === "master" || role === "admin";
}