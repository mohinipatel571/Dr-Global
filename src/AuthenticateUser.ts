import * as vscode from "vscode";
import { getContext } from "./extension";
import { getNonce } from "./getNonce";
import { IssueListingPanel } from './IssueListingPanel';


export class AuthenticateUser implements vscode.WebviewViewProvider {
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

        webviewView.webview.onDidReceiveMessage(async (data) => {
            switch (data.type) {
                case "msgScanGit": {
                    console.log("in git case")
                    vscode.window.showInformationMessage("from git scan")
                    break;
                }
                case "msgScanP4": {
                    console.log("in p4 case")
                    vscode.window.showInformationMessage("from p4 scan")
                    break;
                }
                case "onError": {
                    console.log("in error case")
                    if (!data.value) {
                        return;
                    }
                    vscode.window.showErrorMessage(data.value);
                    break;
                }
            }
        });
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
            vscode.Uri.joinPath(this._extensionUri, "out", "compiled/sidebar.js")
        );
        const styleMainUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, "out", "compiled/sidebar.css")
        );

        // Use a nonce to only allow a specific script to be run.
        const nonce = getNonce();

        // tsvscode.postMessage({
        //     type: 'msgScanP4',
        //     value: "value is here for P4 scanning"
        //   })

        // tsvscode.postMessage({
        //     type: 'msgScanGit',
        //     value: "value is here for git scanning"
        // })

        return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<!--
					Use a content security policy to only allow loading images from https or from our extension directory,
					and only allow scripts that have a specific nonce.
        -->
        <meta http-equiv="Content-Security-Policy" content="default-src img-src https: data:; style-src 'unsafe-inline' ${webview.cspSource
            }; script-src 'nonce-${nonce}';">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<link href="${styleResetUri}" rel="stylesheet">
				<link href="${styleVSCodeUri}" rel="stylesheet">
        <link href="${styleMainUri}" rel="stylesheet">
        <script nonce="${nonce}">
          const tsvscode3 = acquireVsCodeApi();
        </script>
        <style>
          button{
            margin-top: 20px;
          }
          h3 {
            text-align: center;
            font-weight: bold;
          }
          label {
            margin-top: .40em;
            display: block
          }
        </style>
			</head>
      <body>
      <div id="gitAuth">
        <h3>Git Authentication</h3>

        <label id="gitUsername" for="email"><b>Username</b></label>
        <input type="text" placeholder="Enter Username" name="email" required>

        <label id="gitPwd" for="psw"><b>Password</b></label>
        <input type="password" placeholder="Enter Password" name="psw"

        <label id="gitUrl" for="psw"><b>Url</b></label>
        <input type="text" placeholder="Enter Url" name="url"

        <div>
            <button id="gitSubmitBtn" >Submit</button>
        </div>
      </div>
      <div id="p4Auth" style="display:none">
        <h3>P4 Authentication</h3>

        <label id="p4Username" for="email"><b>Username</b></label>
        <input type="text" placeholder="Enter Username" name="email" required>

        <label id="p4Port"><b>Port</b></label>
        <input type="text" placeholder="Enter Port" required>

        <label id="p4Pwd" for="psw"><b>Password</b></label>
        <input type="password" placeholder="Enter Password">

        <label id="p4Url" for="psw"><b>Url</b></label>
        <input type="text" placeholder="Enter Url">

        <div>
            <button id="p4SubmitBtn">Submit</button>
        </div>
      </div>
      <hr size="1" width="100%" style="margin-top:20px">
      <button id="scanGit" style="display:none">
        Scan for git
      </button>
      <button id="scanP4" >
        Scan for P4
      </button>
      <script nonce="${nonce}">
        var scanGit = document.getElementById("scanGit")
        scanGit.onclick = function (){
            document.getElementById("gitAuth").style.display = '';
            document.getElementById("p4Auth").style.display = 'none';
            document.getElementById("scanP4").style.display = '';
            document.getElementById("scanGit").style.display = 'none';
        };
        var scanP4 = document.getElementById("scanP4")
        scanP4.onclick = function (){
            document.getElementById("p4Auth").style.display = '';
            document.getElementById("gitAuth").style.display = 'none';
            document.getElementById("scanGit").style.display = '';
            document.getElementById("scanP4").style.display = 'none';

        };
      </script>
			</body>
			</html>`;
    }
}