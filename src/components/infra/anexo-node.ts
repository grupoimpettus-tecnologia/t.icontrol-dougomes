import { Node, mergeAttributes } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    anexo: {
      inserirAnexo: (atributos: {
        path: string;
        nome: string;
        tipo: string;
        tamanho?: number;
      }) => ReturnType;
    };
  }
}

/** Nó inline que representa um arquivo anexado guardado no bucket "anexos". */
export const Anexo = Node.create({
  name: "anexo",
  inline: true,
  group: "inline",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      path: { default: "" },
      nome: { default: "arquivo" },
      tipo: { default: "application/octet-stream" },
      tamanho: { default: 0 },
    };
  },

  parseHTML() {
    return [
      {
        tag: "a[data-anexo]",
        getAttrs: (el) => {
          const node = el as HTMLElement;
          return {
            path: node.getAttribute("data-anexo") ?? "",
            nome: node.getAttribute("data-nome") ?? node.textContent ?? "arquivo",
            tipo: node.getAttribute("data-tipo") ?? "application/octet-stream",
            tamanho: Number(node.getAttribute("data-tamanho") ?? 0),
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes, node }) {
    const { path, nome, tipo, tamanho } = node.attrs as {
      path: string;
      nome: string;
      tipo: string;
      tamanho: number;
    };
    return [
      "a",
      mergeAttributes(HTMLAttributes, {
        class: "anexo-chip",
        href: "#",
        "data-anexo": path,
        "data-nome": nome,
        "data-tipo": tipo,
        "data-tamanho": String(tamanho ?? 0),
        title: nome,
      }),
      `📎 ${nome}`,
    ];
  },

  addCommands() {
    return {
      inserirAnexo:
        (atributos) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { tamanho: 0, ...atributos },
          }),
    };
  },
});
