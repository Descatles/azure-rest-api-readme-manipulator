import * as commonmark from 'commonmark';
import {series} from 'async';

export function executeSynchronous<T>(asyncFunc: () => Promise<T>) {
    series(
        [asyncFunc],
        (error, _) => {
            if (error) {
                throw error;
            }
        });
}

export const commonmarkToString = (root: commonmark.Node) => {
    let walker = root.walker();
    let event;
    let output = "";
    while ((event = walker.next())) {
      let curNode = event.node;

      const leaving = render.leaving[curNode.type]
      if (!event.entering && leaving !== undefined) {
        output += leaving(curNode, event.entering);
      }
      const entering = render.entering[curNode.type]
      if (event.entering && entering !== undefined) {
        output += entering(curNode, event.entering);
      }
    }

    output = output.replace(/\n$/, "");

    return output;
  }

  type Func = (node: commonmark.Node, b: unknown) => unknown

  interface Render {
    readonly entering: {
      readonly [key in commonmark.NodeType]?: Func
    }
    readonly leaving: {
      readonly [key in commonmark.NodeType]?: Func
    }
  }

  const indent = (node: commonmark.Node|null): string =>
    node !== null ? indent(node.parent) + (node.type === "item" ? "  " : "") : ""

  const render : Render = {
    entering: {
      text: (node: commonmark.Node) => node.literal,
      softbreak: () => "\n",
      linebreak: () => "\n",
      emph: () => "*",
      strong: () => "**",
      html_inline: () => "`",
      link: () => "[",
      image: () => {},
      code: (node: commonmark.Node) => `\`${node.literal}\``,
      document: () => "",
      paragraph: () => "",
      block_quote: () => "> ",
      item: (node: commonmark.Node) =>
        `${indent(node.parent)}${{ bullet: "*", ordered: `1${node.listDelimiter}` }[node.listType]} `,
      list: () => "",
      heading: (node: commonmark.Node) =>
        Array(node.level)
          .fill("#")
          .join("") + " ",
      code_block: (node: commonmark.Node) =>
        `\`\`\` ${node.info}\n${node.literal}\`\`\`\n\n`,
      html_block: (node: commonmark.Node) => node.literal,
      thematic_break: () => "---\n\n",
      custom_inline: () => {},
      custom_block: () => {},
    },

    leaving: {
      heading: () => "\n\n",
      paragraph: () => "\n\n",
      link: (node: commonmark.Node) => `](${node.destination})`,
      strong: () => "**",
      emph: () => "*",
    }
  };
