import * as vscode from "vscode";
import { ALLOWED_LANG, getContext, getCWD, retriveTreeData, writeJson } from "./extension";
import { getNonce } from "./getNonce";
import { IssueListingPanel } from './IssueListingPanel';
import { scanFile } from "./ScanProjects";
const projScanConfig = require("../resources/project_scan_data_config.json");

export class RecentProjectsProvider implements vscode.WebviewViewProvider {
    _view?: vscode.WebviewView;
    _doc?: vscode.TextDocument;

    constructor(private readonly _extensionUri: vscode.Uri) { }

    public resolveWebviewView(webviewView: vscode.WebviewView) {
        this._view = webviewView;
        console.log("in resolveWebviewView");

        webviewView.webview.options = {
            // Allow scripts in the webview
            enableScripts: true,

            localResourceRoots: [this._extensionUri],
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        var projList = getProjList();
        webviewView.webview.postMessage({
            type: "show_proj",
            value: projList,
        });

        webviewView.webview.onDidReceiveMessage(async (data) => {
            switch (data.type) {
                case "show_issues": {
                    console.log("in show issues");

                    let pName = data.value;
                    if (IssueListingPanel.currentPanel) {
                        IssueListingPanel.kill();
                        IssueListingPanel.createOrShow(getContext().extensionUri, "recent_proj|" + pName);
                    }
                    else {
                        IssueListingPanel.createOrShow(getContext().extensionUri, "recent_proj|" + pName);
                    }
                    break;
                }

                case "refresh": {
                    console.log("in refresh:::", projScanConfig);
                    webviewView.webview.postMessage({
                        type: "show_proj",
                        value: getProjList(),
                    });
                    break;
                }
            }
        });
    }

    public revive(panel: vscode.WebviewView) {
        console.log("in revive");

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
            }; ">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<link href="${styleResetUri}" rel="stylesheet">
				<link href="${styleVSCodeUri}" rel="stylesheet">
        <link href="${styleMainUri}" rel="stylesheet">
        <script nonce="${nonce}" src="${scriptUri}">
        </script>
			</head>
        <body>
            <style>
                li{
                    display: block;
                }
            </style>
            <ul id="proj-list"></ul>
            <button id="show-issues">Show Issues</button>
            <button onclick="refreshView()">Refresh</button>
        </body>
        <script nonce="${nonce}">
            function refreshView() {
                document.getElementById("proj-list").innerHTML = "";

                tsvscode3.postMessage({
                    type: 'refresh',
                    value: 'Refreshing the panel'
                })
            }
            console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
            const tsvscode3 = acquireVsCodeApi();
            let projUL = document.getElementById("proj-list")
            let showIssuesBtn = document.getElementById("show-issues")
            window.addEventListener('message', event => {
                
                const message = event.data; // The JSON data our extension sent
                switch (message.type) {
                    case 'show_proj':
                        var projList = message.value
                        for(let i=0; i<projList.length; i++){
                            let projName = projList[i]
                            let li = document.createElement("li")
                            li.setAttribute('id',projName)  
                            li.appendChild(document.createTextNode(projName))
                            projUL.appendChild(li)
                        }
                        let lis = projUL.getElementsByTagName('li')
                        for (let i = 0; i < lis.length; i++) {
                            lis[i].onclick = itemClick;
                        }
                        showIssuesBtn.onclick = show
                        var selectedProj = ""
                        function itemClick(){
                            selectedProj = this.innerHTML
                            console.log(selectedProj)
                        }
                        function show(){
                            tsvscode3.postMessage({
                                type: 'show_issues',
                                value: selectedProj
                            })
                        }
                }
            });
            
            
        </script>
			</html>`;
    }
}

export function getLoadRecentIssues(projName: string | undefined, projScanConfigILP: Array<any>) {
    var j = 0;
    var recommendations: Array<any> = [];
    for (let i = 0; i < projScanConfigILP.length; i++) {
        const p = projScanConfigILP[i];
        if (p.projectName === projName) {
            for (let f = 0; f < p.projectData.length; f++) {
                let fData = p.projectData[f];

                for (let k = 0; k < fData.length; k++) {
                    const issueLine = fData[k];
                    var recommendationDict = {
                        id: ++j,
                        lineNo: issueLine.lineNo,
                        issueLine: issueLine.issueLine,
                        recommendation: issueLine.recommendation,
                        suggestion: issueLine.suggestion,
                        filePath: issueLine.filePath,
                        projectName: issueLine.projectName,
                        strDefaultVar: issueLine.strDefaultVar,
                        strDefaultVal: issueLine.strDefaultVal
                    };
                    recommendations.push(recommendationDict);
                }
            }
        }
    }

    return recommendations;
}


function getProjList() {
    var projList: Array<string> = [];
    projScanConfig.forEach((proj: any) => {
        projList.push(proj.projectName);
    });
    return projList;
};

