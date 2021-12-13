import * as vscode from "vscode";
import { getRecommendationList } from "./extension";
import { getNonce } from "./getNonce";
import { getLoadRecentIssues } from "./RecentProjectsProvider";
// import { pythonOps } from "./MLOps";
const projScanConfigILP = require("../resources/project_scan_data_config.json")


export class IssueListingPanel {
  /**
   * Track the currently panel. Only allow a single panel to exist at a time.
   */
  public static currentPanel: IssueListingPanel | undefined;

  public static readonly viewType = "issue_listing";

  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];

  public static isActive() {
    let isActive = IssueListingPanel.currentPanel?._panel.active
    console.log("is active?: ", isActive)
    if (isActive) {
      return IssueListingPanel.currentPanel?._panel.active
    }
    else {
      return false
    }
  }

  public static createOrShow(extensionUri: vscode.Uri, from?: string) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    // If we already have a panel, show it.
    if (IssueListingPanel.currentPanel) {
      IssueListingPanel.currentPanel._panel.reveal(vscode.ViewColumn.Two);
      IssueListingPanel.currentPanel._update();
      return;
    }



    // Otherwise, create a new panel.
    const panel = vscode.window.createWebviewPanel(
      IssueListingPanel.viewType,
      "Issue List",
      vscode.ViewColumn.Two,
      {
        // Enable javascript in the webview
        enableScripts: true,
        retainContextWhenHidden: true,
        // And restrict the webview to only loading content from our extension's `media` directory.
        localResourceRoots: [
          vscode.Uri.joinPath(extensionUri, "media"),
          vscode.Uri.joinPath(extensionUri, "out/compiled"),
        ],
      }
    );

    IssueListingPanel.currentPanel = new IssueListingPanel(panel, extensionUri, from);

    // if (getRecommendationList()) {
    //     vscode.window.showInformationMessage("in rcmd list check")
    //     // IssueListingPanel.currentPanel._panel.webview.postMessage({
    //     //     type: "add_issue_list",
    //     //     value: getRecommendationList(),
    //     // })
    // }
  }

  public static kill() {
    IssueListingPanel.currentPanel?.dispose();
    IssueListingPanel.currentPanel = undefined;
  }

  public static revive(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    IssueListingPanel.currentPanel = new IssueListingPanel(panel, extensionUri);
  }

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, from?: string) {
    this._panel = panel;
    this._extensionUri = extensionUri;

    // Set the webview's initial html content
    this._update();

    // // Listen for when the panel is disposed
    // // This happens when the user closes the panel or when the panel is closed programatically
    // this._panel.onDidDispose(() => {
    //     this.dispose();
    //     console.log("on dispose running");
    // }, null, this._disposables);

    if (this._panel.active) {
      console.log("panel is active")
      // var dfp = pythonOperations()
      // console.log("returned value from pythonOps method: ",dfp)
      // console.log("returned value type from pythonOps method: ",typeof(dfp))
      if (from == "options_sidebar") {
        console.log("----------in if condition----------");
        
        this._panel.webview.postMessage({
          type: "add_issue_list",
          value: getRecommendationList(),
        })
      }
      else {
        console.log("----------in else condition----------: from-:>",from);
        
        let projName = from?.slice(from.indexOf('|')+1, from.length)
        console.log("(from) proj name---->>> ",projName);

        console.log("projScanConfigILP : ",projScanConfigILP);
        
        var rcmdList = getLoadRecentIssues(projName, projScanConfigILP)
        console.log("load recent rcmd list (line 115 issuelistingpanel.ts): ", rcmdList);
        
        this._panel.webview.postMessage({
          type: "add_issue_list",
          value: rcmdList,
        })
      }
    }

    // // Handle messages from the webview
    // this._panel.webview.onDidReceiveMessage(
    //   (message) => {
    //     switch (message.command) {
    //       case "alert":
    //         vscode.window.showErrorMessage(message.text);
    //         return;
    //     }
    //   },
    //   null,
    //   this._disposables
    // );
  }

  public dispose() {
    IssueListingPanel.currentPanel = undefined;

    // Clean up our resources
    this._panel.dispose();

    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) {
        x.dispose();
      }
    }
  }

  private async _update() {
    console.log("in panel _update()")
    const webview = this._panel.webview;
    this._panel.webview.html = this._getHtmlForWebview(webview);
    webview.onDidReceiveMessage(async (data) => {
      console.log("in _update's onDidReceiveMessage()");
      
      switch (data.type) {
        case "show_issue_line": {
          var openPath = vscode.Uri.parse("file:///" + data.value.filePath); //A request file path
          console.log("fileeeee pathhhhhhh--->\n1. @{data.value.filePath}",data.value);
          
          vscode.workspace.openTextDocument(openPath).then(async doc => {
            
            let line = data.value.lineNo-1
            let char = 0
            let pos1 = new vscode.Position(0, 0)
            let pos2 = new vscode.Position(0, 0)
            let rng = new vscode.Range(pos1, pos2)
            let sel = new vscode.Selection(pos1,pos2)

            // vscode.window.showTextDocument(doc, {selection: rng, viewColumn: vscode.ViewColumn.One})

            vscode.window.showTextDocument(doc, vscode.ViewColumn.One).then((editor: vscode.TextEditor) => {
              editor.selection = sel
              // editor.revealRange(rng, vscode.TextEditorRevealType.InCenter)
              vscode.commands.executeCommand("cursorMove", {
                to:"down",
                by:"line",
                value:line
              })
            });
          });
          // setTimeout(()=>{
          //     let pos = new vscode.Position(data.value.lineNo, 2)
          //     let sel = new vscode.Selection(pos, pos)
          //     if (vscode.window.activeTextEditor)
          //         vscode.window.activeTextEditor.selection = sel
          // },1000)
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
        // case "tokens": {
        //   await Util.globalState.update(accessTokenKey, data.accessToken);
        //   await Util.globalState.update(refreshTokenKey, data.refreshToken);
        //   break;
        // }
      }
    });
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    // // And the uri we use to load this script in the webview
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "out/compiled", "HelloWorld.js")
    );

    // Local path to css styles
    const styleResetPath = vscode.Uri.joinPath(
      this._extensionUri,
      "media",
      "reset.css"
    );
    const stylesPathMainPath = vscode.Uri.joinPath(
      this._extensionUri,
      "media",
      "vscode.css"
    );

    // Uri to load styles into webview
    const stylesResetUri = webview.asWebviewUri(styleResetPath);
    const stylesMainUri = webview.asWebviewUri(stylesPathMainPath);
    // const cssUri = webview.asWebviewUri(
    //   vscode.Uri.joinPath(this._extensionUri, "out", "compiled/swiper.css")
    // );

    // Use a nonce to only allow specific scripts to be run
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
        
          <link href="${stylesResetUri}" rel="stylesheet">
          <link href="${stylesMainUri}" rel="stylesheet">
          <style>
            table {
              border-collapse: collapse;
            }
        
            td,
            th {
              border: 2px solid #999;
              padding: 0.5rem;
              text-align: left;
            }
          </style>
        </head>
        
        <body>
          <table id="table1">
            <tbody id="tableData">
              <thead id="heading">
                <tr>
                  <td><b>id</b></td>
                  <td><b>Issue Line</b></td>
                  <td><b>Line No.</b></td>
                  <td><b>Suggestions</b></td>
                  <td><b>File Path</b></td>
                  <td><b>Project Name</b></td>
                </tr>
              </thead>
            <tbody>
          </table>
          <script nonce="${nonce}">
            const vscode2 = acquireVsCodeApi();
            window.addEventListener('message', event => {
        
              const message = event.data; // The JSON data our extension sent
              let data = message.value
              switch (message.type) {
                case 'add_issue_list':
                  console.log("messages: ", message.value)
                  var k = '<tbody>'
                  for (i = 0; i < data.length; i++) {
                    k += '<tr class="info">';
                    k += '<td>' + data[i].id + '</td>';
                    k += '<td><a href="">' + data[i].issueLine + '</a></td>';
                    k += '<td>' + data[i].lineNo + '</td>';
                    k += '<td>' + data[i].suggestion + '</td>';
                    k += '<td>' + data[i].filePath + '</td>';
                    k += '<td>' + data[i].projectName + '</td>';
                    k += '</tr>';
                  }
                  k += '</tbody>';
                  console.log(k)
                  document.getElementById('tableData').innerHTML = k;
        
                  var table = document.getElementById("table1");
                  if (table) {
                    for (var i = 0; i < table.rows.length; i++) {
                      table.rows[i].ondblclick = function () {
                        tableText(this);
                      };
                    }
                  }
        
                  function tableText(tableRow) {
                    var filePath = tableRow.childNodes[4].innerHTML;
                    var lineNo = tableRow.childNodes[2].innerHTML;
                    var obj = { 'filePath': filePath, 'lineNo': lineNo };
                    console.log(obj);
                    vscode2.postMessage({
                      type: 'show_issue_line',
                      value: obj
                    })
                  }
                  break;
              }
            });
          </script>
        
        </body>
        <script src="${scriptUri}" nonce="${nonce}">
        </html>`;
  }
}

// async function pythonOperations(): Promise<string> {
  // var pyData = await pythonOps()
  // pyData.then((out) => {
  //   out.stdout.on("data", (res) => {
  //     console.log("returned value -------------------------->>>>> ", res.toString());
  //   })
  // }).catch(reason => {
  //   console.log("reason-->: ",reason);
  // })
  // console.log("returned value type 2----> ",(await pyData).))
  // return "some text"
  // pyData.stdout.on("data", (data: any) => {
  //   console.log("returned value------>: ",data)
  // })
  // console.log("pydata:::::::::::: ", pyData);

  // return pyData
// }
