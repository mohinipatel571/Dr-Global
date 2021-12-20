import * as vscode from "vscode";
import { ALLOWED_LANG, getContext, getCWD, retriveTreeData, writeJson } from "./extension";
import { getNonce } from "./getNonce";
import { IssueListingPanel } from './IssueListingPanel';
import { scanFile } from "./ScanProjects";
const projScanConfig = require("../resources/project_scan_data_config.json")

export class RecentProjectsProvider implements vscode.WebviewViewProvider {
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

        var projList = getProjList()
        webviewView.webview.postMessage({
            type: "show_proj",
            value: projList,
        })

        webviewView.webview.onDidReceiveMessage(async (data) => {
            switch (data.type) {
                case "show_issues": {
                    let pName = data.value
                    if (IssueListingPanel.currentPanel) {
                        IssueListingPanel.kill()
                        IssueListingPanel.createOrShow(getContext().extensionUri, "recent_proj|" + pName)
                    }
                    else {
                        IssueListingPanel.createOrShow(getContext().extensionUri, "recent_proj|" + pName)
                    }
                    break;
                }

                case "refresh": {
                    webviewView.webview.postMessage({
                        type: "show_proj",
                        value: getProjList(),
                    })
                    break;
                }
                case "delete":
                    {
                        deleteGetProjList(data.value)
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
                .selected {
                    border: 2px solid blue;
                    background-color: #3399ff;
                    color: white;
                    text-shadow: 0 0 3px #FF0000;
                  }
              
                
            </style>
           
            <ul id="proj-list"></ul>
            <button id="show-issues">Show Issues</button>
            <button onclick="refreshView()">Refresh</button>
            <button onclick="deleteView()">Delete</button>
            
        </body>
        <script nonce="${nonce}">

        
            function refreshView() {
                document.getElementById("proj-list").innerHTML = "";
                console.log("refresh view")

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
                           //  this.style.backgroundColor = "white";
                             let listItems = document.getElementById("proj-list").getElementsByTagName("li");
                             console.log(selectedProj)
                            var length = listItems.length;
                            for (var i = 0; i < length; i++) {
                                listItems[i].className = "";
                            }
                            this.setAttribute('class','selected')
                            localStorage.setItem("selectedProj",selectedProj);
                          }
                            
                            
                        
                        function show(){
                            
                            tsvscode3.postMessage({
                                type: 'show_issues',
                                value: selectedProj
                            })
                        }
                }
            });
             function deleteView(){
                 var selectedProj = localStorage.getItem("selectedProj");
                 console.log("delete clicked! with proj - ",selectedProj)
                tsvscode3.postMessage({
                    type: 'delete',
                    value: selectedProj
                })
                refreshView()
            }
            
        </script>
			</html>`;
    }
}

export function getLoadRecentIssues(projName: string | undefined, projScanConfigILP: Array<any>) {
    var j = 0;
    var recommendations: Array<any> = []
    for (let i = 0; i < projScanConfigILP.length; i++) {
        const p = projScanConfigILP[i];
        if (p.projectName == projName) {
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
                    }
                    recommendations.push(recommendationDict)
                }
            }
        }
    }

    return recommendations
}


function getProjList() {
    var projList: Array<string> = []
    projScanConfig.forEach((proj: any) => {
        projList.push(proj.projectName)
    });
    return projList
}

function deleteGetProjList(currentProject: string) {
    var projScanConfigData = projScanConfig
    // let updateProjectList: Array<{ prrojectName: string, projectData: Array }>;
    console.log("before deleton: ",projScanConfig);

    for (let i = 0; i < projScanConfig.length; i++) {
        const project = projScanConfig[i];
        if(project.projectName == currentProject){
            delete projScanConfig[i]
            console.log("after deleton: ",projScanConfig);
            break;
        }
    }
    let updateProjectList: Array<any> = []
    projScanConfigData.forEach((proj: any) => {
        if (proj.projectName != currentProject) {
            updateProjectList.push(proj)
        }
    });

    // var projList:Array<string>=[]
    // projScanConfig.forEach(() => {
    //     projList.pop()
    // });
    writeJson(updateProjectList, getCWD(__dirname) + "\\resources\\", "project_scan_data_config.json");
}