export const MICROAREAS = ["Infraestrutura", "Segurança", "Sistema PDV", "Implantação PDV"] as const;
export const CARGOS_MICROAREA = ["Gestor", "Analista", "Assistente"] as const;
export type Microarea = (typeof MICROAREAS)[number];
export type CargoMicroarea = (typeof CARGOS_MICROAREA)[number];

export function chaveFuncoes(microarea: Microarea, cargo: CargoMicroarea) {
  return `${microarea}:${cargo}`;
}

export function podeEditarFuncoes(role: string | undefined) {
  return role === "master" || role === "admin";
}