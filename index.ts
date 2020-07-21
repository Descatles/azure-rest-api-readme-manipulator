import {readFileSync, writeFileSync} from 'fs';
import * as commonmark from 'commonmark';
import * as constants from './constants';
import * as utils from './utils';
import path from 'path';
import chalk from 'chalk';

async function getReadMeMdContent(readMeMdPath: string): Promise<string | undefined> {
  //console.log(`Getting file contents for "${readMeMdPath}"...`);
  try {
    const buffer = readFileSync(readMeMdPath);
    return buffer.toString();
  } catch (e) {
    console.error(`File ` + chalk.green(readMeMdPath) + ` not found`);
    return undefined;
  }
}

async function writeReadMeMdContent(readMeMdPath: string, modifiedReadmeMdContent: string): Promise<boolean> {
  //console.log(`Writting file contents for "${readMeMdPath}"...`);
  try {
    writeFileSync(readMeMdPath, modifiedReadmeMdContent);
    return true;
  } catch (e) {
    console.error(`File ` + chalk.green(readMeMdPath) + ` write failure`);
    return false;
  }
}


async function addSwaggerToSDKConfigurationCommonmark(readMeMdPath: string | undefined): Promise<boolean> {
  if (readMeMdPath) {
    const readMeMdContent = await getReadMeMdContent(readMeMdPath);
    if (readMeMdContent) {
      let _readMeMdContent:string = readMeMdContent;
      let markdownParser = new commonmark.Parser();
      let parsedReadmeMd: commonmark.Node = markdownParser.parse(_readMeMdContent);
      let walker = parsedReadmeMd.walker();
      let event:any, node:any;
      let cnt = 0;
      while ((event = walker.next())) {
        node = event.node;
        if (node.type === "code_block" && node.info && node.info.toLowerCase().indexOf("$(swagger-to-sdk)") !== -1) {
          node.literal = node.literal + constants.swaggerToSDKAddon;
          cnt ++;
        }
      }
      if (!cnt) {
        console.error(`File ` + chalk.green(readMeMdPath) + ` has no Swagger to SDK field`);
        return false;
      }
      const modifiedReadmeMdContent = utils.commonmarkToString(parsedReadmeMd);
      if (await writeReadMeMdContent(readMeMdPath, modifiedReadmeMdContent)) return true;
      else return false;
    }
  }
  return false;
}

async function addSwaggerToSDKConfiguration(readMeMdPath: string | undefined): Promise<boolean> {
  if (readMeMdPath) {
    const readMeMdContent = await getReadMeMdContent(readMeMdPath);
    if (readMeMdContent) {

      const _readMeMdContent: string = readMeMdContent;
      const firstOfSwaggerToSDKField = _readMeMdContent.toLowerCase().indexOf("$(swagger-to-sdk)");
      const lastOfSwaggerToSDKField = _readMeMdContent.toLowerCase().lastIndexOf("$(swagger-to-sdk)");

      if (firstOfSwaggerToSDKField === -1) {
        console.error(`File ` + chalk.green(readMeMdPath) + ` has no Swagger to SDK field`);
        const firstOfCodeGenerationField = _readMeMdContent.toLowerCase().indexOf("# code generation");
        const lastOfCodeGenerationField = _readMeMdContent.toLowerCase().lastIndexOf("# code generation");
        if (firstOfCodeGenerationField === -1) {
          console.error(`File ` + chalk.green(readMeMdPath) + ` has no Code Generation field`);
          return false;
        }
        if (firstOfCodeGenerationField !== lastOfCodeGenerationField){
          console.error(`File ` + chalk.green(readMeMdPath) + ` has more than one Code Generation field`);
          return false;
        }
        const length = "# code generation\n".length;
        const contentBeforeswaggerToSDKField = _readMeMdContent.substr(0, firstOfCodeGenerationField + length);
        const contentAfterswaggerToSDKField = _readMeMdContent.substr(firstOfCodeGenerationField + length);
        const modifiedReadmeMdContent = contentBeforeswaggerToSDKField.concat(constants.swaggerToSDKField, contentAfterswaggerToSDKField);
        if (await writeReadMeMdContent(readMeMdPath, modifiedReadmeMdContent)) return true;
        else return false;
      } else {
        if (firstOfSwaggerToSDKField !== lastOfSwaggerToSDKField){
          console.error(`File ` + chalk.green(readMeMdPath) + ` has more than one Swagger to SDK field`);
          return false;
        }

        const configurationAddPosition = _readMeMdContent.substr(firstOfSwaggerToSDKField).indexOf("```");
        const contentBeforeSwaggerToSDK = _readMeMdContent.substr(0, firstOfSwaggerToSDKField);
        const contentSwaggerToSDK = _readMeMdContent.substr(firstOfSwaggerToSDKField).substr(0, configurationAddPosition);
        const contentAfterSwaggerToSDK = readMeMdContent.substr(firstOfSwaggerToSDKField).substr(configurationAddPosition);
        const modifiedReadmeMdContent = contentBeforeSwaggerToSDK.concat(contentSwaggerToSDK
                                                                 .concat(constants.swaggerToSDKAddon
                                                                 .concat(contentAfterSwaggerToSDK)));

        if (await writeReadMeMdContent(readMeMdPath, modifiedReadmeMdContent)) return true;
        else return false;
      }
    }
  }
  return false;
}

async function addMultiApiConfiguration(readMeMdPath: string | undefined): Promise<boolean> {
  if (readMeMdPath) {
    const readMeMdContent = await getReadMeMdContent(readMeMdPath);
    if (readMeMdContent) {
      const _readMeMdContent: string = readMeMdContent;
      const firstOfMultiApiField = _readMeMdContent.toLowerCase().indexOf("## multi-api/profile support for autorest v3 generators");
      const lastOfMultiApiField = _readMeMdContent.toLowerCase().lastIndexOf("## multi-api/profile support for autorest v3 generators");
      if (firstOfMultiApiField === -1) {
        console.error(`File ` + chalk.green(readMeMdPath) + ` has no Muti-API field`);
        return false;
      }
      if (firstOfMultiApiField !== lastOfMultiApiField) {
        console.error(`File ` + chalk.green(readMeMdPath) + ` has more than one Muti-API field`);
        return false;
      }
      const contentBeforeMultiApiField = _readMeMdContent.substr(0, firstOfMultiApiField);
      const contentAfterMultiApiField = _readMeMdContent.substr(firstOfMultiApiField);
      const modifiedReadmeMdContent = contentBeforeMultiApiField.concat(constants.multiapiAddon, contentAfterMultiApiField);
      if (await writeReadMeMdContent(readMeMdPath, modifiedReadmeMdContent)) return true;
      else return false;
    }
  }
  return false;
}

utils.executeSynchronous(async () => {
  for (const autogenPath of constants.autogenList) {
    const readMeMdPath = path.join(constants.specsPath, autogenPath, "readme.md");
    if (await addSwaggerToSDKConfiguration(readMeMdPath)) console.log(`add swagger-to-sdk configuration in ${readMeMdPath} done`);
    else console.error(`add swagger-to-sdk configuration in ` + chalk.green(readMeMdPath) + ` failed`);
    if (await addMultiApiConfiguration(readMeMdPath)) console.log(`add Multiapi configuration in ${readMeMdPath} done`);
    else console.error(`add Multiapi configuration in ` + chalk.green(readMeMdPath) + ` failed`);
  }
});
