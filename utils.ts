import * as commonmark from 'commonmark';
import {series} from 'async';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
//import { Dictionary } from 'lodash';

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const apiVersionRegex = /^\d{4}-\d{2}-\d{2}(|-preview)$/;

export function executeSynchronous<T>(asyncFunc: () => Promise<T>) {
    series(
        [asyncFunc],
        (error, _) => {
            if (error) {
                throw error;
            }
        });
}

export async function findDirRecursive(basePath: string, filter: (name: string) => boolean): Promise<string[]> {
  let results: string[] = [];

  for (const subPathName of await readdir(basePath)) {
      const subPath = path.resolve(`${basePath}/${subPathName}`);

      const fileStat = await stat(subPath);
      if (!fileStat.isDirectory()) {
          continue;
      }

      if (filter(subPath)) {
          results.push(subPath)
      }

      const pathResults = await findDirRecursive(subPath, filter);
      results = results.concat(pathResults);
  }

  return results;
}

// export async function getApiVersionsByNamespace(readme: string): Promise<Dictionary<string[]>> {
//   const searchPath = path.resolve(`${readme}/..`);
//   const apiVersionPaths = await findDirRecursive(searchPath, p => path.basename(p).match(apiVersionRegex) !== null);

//   const output: Dictionary<string[]> = {};
//   for (const [namespace, _, apiVersion] of apiVersionPaths.map(p => path.relative(searchPath, p).split(path.sep))) {
//       output[namespace] = [...(output[namespace] ?? []), apiVersion];
//   }

//   return output;
// }

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
