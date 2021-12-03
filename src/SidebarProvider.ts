import * as vscode from "vscode";
import { ALLOWED_LANG, getContext, getCWD, getLoadRecentDisposable, retriveTreeData, writeJson } from "./extension";
import { getNonce } from "./getNonce";
import { IssueListingPanel } from './IssueListingPanel';
import { RecentProjectsProvider } from "./RecentProjectsProvider";
import { scanFile } from "./ScanProjects";
const projScanConfig = require("../resources/project_scan_data_config.json");

export class SidebarProvider implements vscode.WebviewViewProvider {
  _view?: vscode.WebviewView;
  _doc?: vscode.TextDocument;

  constructor(private readonly _extensionUri: vscode.Uri) { }

  public resolveWebviewView(webviewView: vscode.WebviewView) {
    this._view = webviewView;

    webviewView.webview.options = {
      // Allow scripts in the webview
      enableScripts: true,

      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    var tree_data = retriveTreeData();

    tree_data = this.processTreeData(tree_data);

    webviewView.webview.postMessage({
      type: "show_tree",
      value: tree_data,
    });



    webviewView.webview.onDidReceiveMessage(async (data) => {
      switch (data.type) {
        // case "show_issues": {
        //   if (!data.value) {
        //     return
        //   }
        //   if (IssueListingPanel.currentPanel) {
        //     IssueListingPanel.kill()
        //     setTimeout(() => {
        //       IssueListingPanel.createOrShow(getContext().extensionUri)
        //     }, 500)
        //   }
        //   else {
        //     IssueListingPanel.createOrShow(getContext().extensionUri)
        //   }
        //   break
        // }
        case "dispose": {
          console.log(data.value);
          break;
        }
        case "start_scan": {
          if (!data.value) {
            console.log("xxxxxxxxxxxxxxx--no values--xxxxxxxxxxxxxx");
            return;
          }
          console.log(data.value);
          let fileList = data.value[1];
          let projectName = data.value[0];
          let fileConfigData: Array<any> = [];
          for (let i = 0; i < fileList.length; i++) {
            const path = fileList[i];

            var openPath = vscode.Uri.parse("file:///" + path); //A request file path
            console.log("openFilePath: ", openPath);
            await vscode.workspace.openTextDocument(openPath).then(async (file) => {
              let lang = file.languageId;
              if (lang) {
                const allowedLangs = Object.keys(ALLOWED_LANG);
                for (let j = 0; j < allowedLangs.length; j++) {
                  const key = allowedLangs[j];
                  if (lang === key) {
                    console.log("before scan file method", projectName);
                    let fileRcmd = await scanFile(file, ALLOWED_LANG[key], projectName);
                    console.log("after scan file method call", fileRcmd);
                    fileConfigData.push(fileRcmd);
                  }
                }
              }
            });
          }
          var projDataDict: any = {};
          console.log("data receiving?- ", fileConfigData);
          let projectExists = false;
          var projScanConfigData = projScanConfig;
          for (let i = 0; i < projScanConfig.length; i++) {
            const proj = projScanConfig[i];
            if (proj.projectName === projectName) {
              projScanConfigData[i].projectData = fileConfigData;
              projectExists = true;
              break;
            }
          }
          if (!projectExists) {
            let writeData = {
              projectName: projectName,
              projectData: fileConfigData
            };
            projScanConfigData.push(writeData);
          }
          writeJson(projScanConfigData, getCWD(__dirname) + "\\resources\\", "project_scan_data_config.json");
          vscode.window.showInformationMessage('Scanning for project- "' + projectName + '" is completed. You can check the report in "Recent Projects" ');
          // if(getLoadRecentDisposable()){
          //   console.log("yes, it is disposable");
          //   getLoadRecentDisposable().dispose;
          //   var rp = new RecentProjectsProvider(getContext().extensionUri)
          //   getContext().subscriptions.push(
          //     vscode.window.registerWebviewViewProvider('view-load-recent',  rp)
          //   )
          // }
          break;
        }
        case "onInfo": {
          if (!data.value) {
            return;
          }
          vscode.window.showInformationMessage(data.value);
          break;
        }
        case "onError": {
          if (!data.value) {
            return;
          }
          vscode.window.showErrorMessage(data.value);
          break;
        }
      }
    });
  }

  processTreeData(tree_data: any) {

    let t = JSON.stringify(tree_data);
    let t2 = [JSON.parse(t)];
    let newData: Array<any> = [];
    var dict;
    t2.map(item => {
      if (item.children) {
        console.log("just before get children");

        dict = {
          id: item.path,
          text: item.name,
          children: this.getChildren(item.children)
        };
        // return "name is::: " + t2[0].children[0].children
      }
      else {
        console.log("else in");
        dict = {
          id: item.path,
          text: item.name,
        };
        // return "undefined"
      }
      newData.push(dict);
    });
    return newData;
  }

  private getChildren(childList: Array<any>) {
    var dict;
    let newData: Array<any> = [];
    childList.map(item => {
      if (item.children) {
        dict = {
          id: item.path,
          text: item.name,
          children: this.getChildren(item.children)
        };
      }
      else {
        dict = {
          id: item.path,
          text: item.name,
        };
      }
      newData.push(dict);
    });
    return newData;
  }

  public revive(panel: vscode.WebviewView) {
    this._view = panel;
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    const styleResetUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "reset.css")
    );
    const styleVSCodeUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "vscode.css")
    );
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "out", "compiled/tree.min.js")
    );
    const styleMainUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "out", "compiled/sidebar.css")
    );

    // Use a nonce to only allow a specific script to be run.
    const nonce = getNonce();

    return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<!--
					Use a content security policy to only allow loading images from https or from our extension directory,
					and only allow scripts that have a specific nonce.
        -->
        <meta http-equiv="Content-Security-Policy" content="img-src https: data:; style-src 'unsafe-inline' ${webview.cspSource
      }; script-src 'nonce-${nonce}';">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<link href="${styleResetUri}" rel="stylesheet">
				<link href="${styleVSCodeUri}" rel="stylesheet">
        <link href="${styleMainUri}" rel="stylesheet">
        <script nonce="${nonce}" src="${scriptUri}">

        </script>
			</head>
      <body>
      <div class="container"></div>
      <button id="btnStartScan">Start Scan</button>
  </body>
  <script nonce="${nonce}">
    const tsvscode2 = acquireVsCodeApi();
    var fileList = []
    var projectName = ""
    var output = []
    window.addEventListener('message', event => {
        
      const message = event.data; // The JSON data our extension sent
      switch (message.type) {
        case 'modify':
          console.log(message.value)
        case 'show_tree':
          var maindata = message.value

          let tree = new Tree('.container', {
            data: maindata,
            closeDepth: 3,
            loaded: function () {
              console.log("(loaded) maindata[0].text:--xxxxxx-- ",maindata[0].text)
              projectName = maindata[0].text
              console.log("(loaded) project name:--xxxxxx-- ",projectName)
              fileList = this.values
              output = [projectName, fileList]
              console.log("(loaded) output:--xxxxxx-- ",output)

            },
            onChange: function () {
              console.log("(onChange) maindata[0].text:--xxxxxx-- ",maindata[0].text)
              projectName = maindata[0].text
              console.log("(onChange) project name:--xxxxxx-- ",projectName)
              fileList = this.values
              output = [projectName, fileList]
              console.log("(onChange) output:--xxxxxx-- ",output)

            }
        })
          break;
      }
    });
    var btnStartScan = document.getElementById("btnStartScan")
    btnStartScan.onclick = function (){
      tsvscode2.postMessage({
        type: 'start_scan',
        value: output
      })
    }
  </script>
			</html>`;
  }
}


