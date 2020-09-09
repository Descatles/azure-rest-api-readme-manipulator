import {readFileSync, writeFileSync} from 'fs';
import * as commonmark from 'commonmark';
import { ReadMeBuilder, ReadMeManipulator, getInputFilesForTag } from "@azure/openapi-markdown";
import { MarkDownEx, parse } from "@ts-common/commonmark-to-markdown"
import * as constants from './constants';
import * as utils from './utils';
import path from 'path';
import chalk from 'chalk';

const apiVersionRegex = /^\d{4}-\d{2}-\d{2}(|-preview)$/;

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
      const basePath = `${path.basename(path.dirname(path.dirname(readMeMdPath)))}/${path.basename(path.dirname(readMeMdPath))}`;
      const afterScripts = `    after_scripts:\n      - npm install --prefix generator && npm run postprocessor `.concat(basePath,` --prefix generator && npm install --prefix tools && npm run test-ci --prefix tools\n`);

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
        const modifiedReadmeMdContent = contentBeforeswaggerToSDKField.concat(constants.swaggerToSDKField, afterScripts, '```', contentAfterswaggerToSDKField);
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
        const modifiedReadmeMdContent = contentBeforeSwaggerToSDK.concat(contentSwaggerToSDK, constants.swaggerToSDKAddon, afterScripts, contentAfterSwaggerToSDK);

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
        if (_readMeMdContent.toLowerCase().indexOf('See configuration in'.toLowerCase()) != -1) {
            const modifiedReadmeMdContent = _readMeMdContent.concat("\n", constants.multiapiAddon);
            if (await writeReadMeMdContent(readMeMdPath, modifiedReadmeMdContent)) return true;
            else return false;
        }
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

async function addSchemaMultiApiReadme(readMeMdPath: string | undefined): Promise<boolean> {

    let multiapiReadMeBody = "### AzureResourceSchema multi-api\n\n``` yaml $(azureresourceschema) && $(multiapi)\nbatch:\n";

    let multiapiReadMeTail = "";
    if (readMeMdPath) {
      const readMeMdContent = await getReadMeMdContent(readMeMdPath);
      if (readMeMdContent) {
        const _readMeMdContent: string = readMeMdContent;
        const readMeManipulator = new ReadMeManipulator(console, new ReadMeBuilder());
        const markDownContent = parse(_readMeMdContent);
        const allTags = readMeManipulator.getAllTags(markDownContent);
        for (const tag of allTags) {
          if (tag !== "all-api-versions") {
            multiapiReadMeBody = multiapiReadMeBody.concat("  - tag: ", tag, "\n");
            multiapiReadMeTail = multiapiReadMeTail.concat("### Tag: ", tag, " and azureresourceschema\n\nThese settings apply only when `--tag=", tag, " --azureresourceschema` is specified on the command line.\nPlease also specify `--azureresourceschema-folder=<path to the root directory of your azure-resource-manager-schemas clone>`.\n\n``` yaml $(tag) == '", tag, "' && $(azureresourceschema)\noutput-folder: $(azureresourceschema-folder)/schemas\n```\n\n");
          }
        }
        multiapiReadMeBody = multiapiReadMeBody.concat("```\n\n");
        const writeReadmeMdContent = constants.multiapiReadMeHead.concat(multiapiReadMeBody, multiapiReadMeTail);
        const SchemaMultiApiReadmePath = path.join(path.dirname(readMeMdPath), "readme.azureresourceschema.md");
        if (await writeReadMeMdContent(SchemaMultiApiReadmePath, writeReadmeMdContent)) return true;
        else return false;
      }
    }
    return false;
}

function getVersionForInputFile(filePath: string): string {
  //const apiVersionRegex = /^\d{4}-\d{2}-\d{2}(|-preview)$/;
  let version = path.basename(path.dirname(filePath));
  // if (version.match(apiVersionRegex) === null) {
  //   console.error(`Get version of ` + chalk.red(filePath) + ` failed`);
  //   return '';
  // }
  if (version[0] !== '2') {
    version = path.basename(path.dirname(path.dirname(filePath)));
    if (version[0] !== '2') {
      console.error(`Get version of ` + chalk.red(filePath) + ` failed, version: ` + chalk.red(version));
      return '';
    }
  }
  return version;
}

async function getTagsWithMutiVersion(basePath: string): Promise<boolean> {
  let res: string[] = [];
  const readMeMdPath = path.join(constants.specsPath, basePath, "readme.md");
  if (readMeMdPath) {
    const readMeMdContent = await getReadMeMdContent(readMeMdPath);
    if (readMeMdContent) {
      const _readMeMdContent: string = readMeMdContent;
      const readMeManipulator = new ReadMeManipulator(console, new ReadMeBuilder());
      const markDownContent = parse(_readMeMdContent);
      const allTags = readMeManipulator.getAllTags(markDownContent);
      let markdownParser = new commonmark.Parser();
      let parsedReadmeMd: commonmark.Node = markdownParser.parse(_readMeMdContent);
      for (const tag of allTags) {
        if (tag !== "all-api-versions") {
          const inputFiles = getInputFilesForTag(parsedReadmeMd, tag);
          if (inputFiles) {
            let version: string = '';
            for (const inputFile of inputFiles) {
              const currentVersion = getVersionForInputFile(inputFile);
              if (currentVersion !== '') {
                if (version !== '' && version !== currentVersion) {
                  console.error(`Multiple version in ` + chalk.green(basePath) + chalk.green('/') + chalk.green(tag));
                  break;
                } else {
                  version = currentVersion;
                }
              }
            }
          }
        }
      }
      return true;
    }
  }
  return false;
}

utils.executeSynchronous(async () => {
  let basePaths = await utils.getAllBaseName(constants.specsPath);
  for (const autogenPath of basePaths) {
    if (!getTagsWithMutiVersion(autogenPath)) {
      console.error(`getTagsWithMutiVersion ` + chalk.red(autogenPath) + ` failed`);
    }

    // if (!await addSwaggerToSDKConfiguration(readMeMdPath)) {
    //     console.error(`add swagger-to-sdk configuration in ` + chalk.red(readMeMdPath) + ` failed`);
    //     continue;
    // }
    // //else console.log(`add swagger-to-sdk configuration in ${readMeMdPath} done`);
    // if (!await addMultiApiConfiguration(readMeMdPath)) {
    //     console.error(`add Multiapi configuration in ` + chalk.red(readMeMdPath) + ` failed`);
    //     continue;
    // }
    // //else console.log(`add Multiapi configuration in ${readMeMdPath} done`);
    // if (!await addSchemaMultiApiReadme(readMeMdPath)) {
    //     console.error(`add MutiApi Readme file for ARM Schema for ` + chalk.red(readMeMdPath) + ` failed`);
    // }
    // //else console.log(`add MutiApi Readme file for ARM Schema for ${readMeMdPath} done`);

  }
});
