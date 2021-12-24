// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { OptionsSidebar } from "./OptionsSidebar";
import { SidebarProvider } from "./SidebarProvider";
import * as fs from "fs";
import * as path from "path";
const dirTree = require("directory-tree");
import axios, { AxiosResponse } from "axios";
import { RecentProjectsProvider } from "./RecentProjectsProvider";
import { AuthenticateUser } from "./AuthenticateUser";

export const ALLOWED_LANG: { [key: string]: string } = {
  typescript: "ts",
  javascript: "js",
  java: "java",
  vue: "vue",
};
var activeDoc: vscode.TextDocument | undefined;
var lang_id: string | undefined;
var codeActionDisposable: vscode.Disposable;
var loadRecentDisposable: vscode.Disposable;
var mainTreeData: any = undefined;
var GLOBAL_CONTEXT: vscode.ExtensionContext;
var globalDefaultVar: string = ""
var globalDefaultVal: string = ""

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  GLOBAL_CONTEXT = context;
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log("in activate");


	activeDoc = vscode.window.activeTextEditor?.document

	lang_id = activeDoc?.languageId

	codeActionDisposable = vscode.languages.registerCodeActionsProvider(lang_id ? lang_id : "", new QuickActions(), {
		providedCodeActionKinds: QuickActions.providedCodeActionKinds
	});

	context.subscriptions.push(codeActionDisposable)
  console.log('Congratulations, your extension "dr-global" is now active!');

  context.subscriptions.push(vscode.commands.registerCommand(MARK_NOT_ISSUE_COMMAND, async () => {
		// globalUserVar = await vscode.window.showInputBox({ title: "Enter the variable name", placeHolder: globalDefaultVar })
	}))

	context.subscriptions.push(vscode.commands.registerCommand(GENERATE_CODE_COMMAND, async (variableName: string, variableVal: string) => {


  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  // let disposable = vscode.commands.registerCommand('dr-global.helloWorld', () => {
  // 	// The code you place here will be executed every time your command is executed
  // 	// Display a message box to the user
  // 	vscode.window.showInformationMessage('Hello World from Dr-Global!');
  // });

  // context.subscriptions.push(disposable);
 
	// vscode.workspace.onDidSaveTextDocument((e) => {
	// 	vscode.window.showInformationMessage("document saved!")
	// 	decorateText(context)
	// })

  globalDefaultVar = variableName
  globalDefaultVal = variableVal

  let editor = vscode.window.activeTextEditor

  var vr = variableName.replace(/^<|>$/g, '')

  setTimeout(async () => {
    var v = await vscode.window.showInputBox({ title: "Variable name", placeHolder: "Enter the variable name", value: vr })
    var newVarName = v
    // let rng: vscode.Range[] = []

    if (editor?.document.lineCount) {

      // rng.push(wordRange)
      editor?.edit((editBuilder) => {
        if (editor) {
          for (let i = 0; i < editor.document.lineCount; i++) {
            let regex = new RegExp(variableName, "g")
            var text = editor.document.lineAt(i).text
            var ch = text.search(regex)
            let newPos = new vscode.Position(i, ch >= 0 ? ch : 0)
            let wordRange = editor.document.getWordRangeAtPosition(newPos, regex)
            if (wordRange) {
              editBuilder.replace(wordRange, v ? v : "")
            }
          }
        }
      })
      writeProperties(newVarName)
    }
    // vscode.window.activeTextEditor?.document.getText().replace(new RegExp(variableName, "g"), v ? v : "")
  }, 1000)

  // vscode.window.showInformationMessage(v ? v : "")



  // if (activeDoc?.lineCount) {
  // 	for (let i = 0; i < activeDoc?.lineCount; i++) {
  // 		activeDoc.lineAt(i)
  // 		// activeDoc.getWordRangeAtPosition(new vscode.Position(i, 0), new RegExp(variableName, "g")).
  // 	}
  // 	// vscode.window.activeTextEditor?.document.getText().replace(new RegExp(variableName, "g"), v ? v : "")
  // }

}))

decorateText(context)

// vscode.workspace.onDidSaveTextDocument((e) => {
// 	vscode.window.showInformationMessage("document saved!")
// 	decorateText(context)
// })





  var dirData: any = {};

  var sidebarLoad: vscode.Disposable;
  const optionsSidebarProvider = new OptionsSidebar(context.extensionUri);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      "view-options",
      optionsSidebarProvider
    )
  );

  const loadRecent = new RecentProjectsProvider(context.extensionUri);
  loadRecentDisposable = vscode.window.registerWebviewViewProvider(
    "view-load-recent",
    loadRecent
  );
  console.log("just below the load recent instance");
  context.subscriptions.push(loadRecentDisposable);

  var scanProj = new AuthenticateUser(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider("view-scan-proj", scanProj)
  );

  const sidebarProvider = new SidebarProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.commands.registerCommand("view-load-dir.opendir", () => {
      console.log("sidebar load outside: ", sidebarLoad);

      if (sidebarLoad) {
        sidebarLoad.dispose();
      }

      let options = {
        canSelectFiles: false, //Whether to select files
        canSelectFolders: true, //Whether to choose a directory
        canSelectMany: false, //Can multiple choices
        defaultUri: vscode.Uri.file("D:/VScode"), //The folder opened by default
        openLabel: "Select folder",
      };

      vscode.window.showOpenDialog(options).then((result) => {
        if (result === undefined) {
          vscode.window.showErrorMessage("Can't load directory!");
        } else {
          var loadUri = result[0].path.toString();
          var loadDir = loadUri.substr(1, loadUri.length);
          var projName = getProjName(loadDir);
          console.log("loadDirrr: ", loadDir);
          console.log("sidebar load inside: ", sidebarLoad);

          let excludePathListRegex: Array<RegExp> = [];
          excludePathListRegex.push(
            new RegExp(path.join(loadDir, ".vscode").split("\\").join("\\\\")),
            new RegExp(
              path.join(loadDir, "node_modules").split("\\").join("\\\\")
            )
          );

          var treeData = dirTree(loadDir, { exclude: excludePathListRegex });

          mainTreeData = treeData;

          if (sidebarLoad) {
            var tree_data = retriveTreeData();
            tree_data = sidebarProvider.processTreeData(treeData);
            sidebarProvider._view?.webview.postMessage({
              type: "show_tree",
              value: tree_data,
            });
          } else {
            sidebarLoad = vscode.window.registerWebviewViewProvider(
              "view-load-dir",
              sidebarProvider
            );
            context.subscriptions.push(sidebarLoad);
          }

          writeJson(dirData, getCWD(__dirname), "LoadedProjLocations.json");
          vscode.window.showInformationMessage("open dir: " + loadDir);
        }
      });
    })
  );
}
export function retriveTreeData() {
  return mainTreeData;
}

export function getRecommendationList() {
  return;
}

export function getContext() {
  return GLOBAL_CONTEXT;
}
export function getLoadRecentDisposable() {
  return loadRecentDisposable;
}

function getProjName(path: string | undefined) {
  var str = "";
  if (path) {
    for (let i = path.length - 1; i >= 0; i--) {
      const ch = path[i];
      if (ch === "/" || ch === "\\") {
        break;
      } else {
        str += ch;
      }
    }
  }

  var name = "";
  for (let i = str.length - 1; i >= 0; i--) {
    name += str.charAt(i);
  }
  return name;
}

export function writeJson(data: any, saveLocation: string, fileName: string) {
  var json = JSON.stringify(data);
  fs.writeFile(saveLocation + fileName, json, function (err) {
    if (err) throw err;
  });
}

export function getCWD(fullpath: string) {
  var res = "";
  for (let i = fullpath.length - 1; i >= 0; i--) {
    const ch = fullpath[i];
    if (ch === "/" || ch === "\\") {
      res = fullpath.slice(0, i);
      break;
    }
  }
  return res + path.join("/");
}
var mainRange: vscode.Range | undefined;
var issueLineList: Array<number> = []
var saveDispose: vscode.Disposable;
var recommendationDict = {};
var recommendations: Array<any> = [];
// this method is called when your extension is deactivated

function decorateText(context: vscode.ExtensionContext) {
	let timeout: NodeJS.Timer | undefined = undefined;

	const highlightText = vscode.window.createTextEditorDecorationType({
		borderWidth: '1px',
		borderStyle: 'solid',
		overviewRulerColor: 'blue',
		overviewRulerLane: vscode.OverviewRulerLane.Right,
		light: {
			// this color will be used in light color themes
			borderColor: 'red'
		},
		dark: {
			// this color will be used in dark color themes
			borderColor: 'red'
		}
	});

	let activeEditor = vscode.window.activeTextEditor;

	function updateDecorations() {

		mainRange = activeDoc?.lineAt(2).range

		if (!activeEditor) {
			return;
		}

		const highlightLines: vscode.DecorationOptions[] = [];
		let match = [0, 2, 3];
		issueLineList.sort()
		for (let i = 0; i < issueLineList.length; i++) {
			let lineNo = issueLineList[i];
			var currentLine = activeEditor.document.lineAt(lineNo)
			const decoration = { range: currentLine.range };
			highlightLines.push(decoration);
		}
		activeEditor.setDecorations(highlightText, highlightLines);
	}

	function triggerUpdateDecorations() {
		if (timeout) {
			clearTimeout(timeout);
			timeout = undefined;
		}
		else {
			// console.log("timeout: ",timeout)
		}
		if (isOurEditor()) {
			timeout = setTimeout(updateDecorations, 1000);
		}
		else {
		}
	}

	if (activeEditor) {
		triggerUpdateDecorations();
		// updateDecorations()
	}

	var i = 0

	vscode.window.onDidChangeActiveTextEditor(editor => {
		issueLineList = []
		activeEditor = editor;
		activeDoc = editor?.document
		lang_id = activeDoc?.languageId
		if (codeActionDisposable) {
			codeActionDisposable.dispose()
			console.log("on file switch")
			codeActionDisposable = vscode.languages.registerCodeActionsProvider(lang_id ? lang_id : "", new QuickActions(), {
				providedCodeActionKinds: QuickActions.providedCodeActionKinds
			});
		}

		// setTimeout(() => {
		// if(IssueListingPanel.isActive()){
		// 	IssueListingPanel.createOrShow(context.extensionUri)
		// }
		// console.log("===> ",getRecommendationList())
		// },300)
		if (editor) {
			triggerUpdateDecorations();
			// updateDecorations()
		}
	});

	saveDispose = vscode.workspace.onDidSaveTextDocument(e => {
		recommendations = []
		if (isOurEditor()) {
			issueLineList = []
			let lang = activeEditor?.document.languageId
			let locs = getLocs(activeEditor?.document)

			var outData: { [key: string]: string[][] };

			if (activeDoc?.languageId) {
				Object.keys(ALLOWED_LANG).forEach(key => {
					if (lang == key) {
						var val;
						scanCode(locs, ALLOWED_LANG[key], function (out: { [key: string]: string[][] }) {
							console.log("new out----> ", out)
							out['recommendation'].forEach((rcmd) => {
								let n: number = +rcmd[0]
								recommendationDict = {
									id: ++i, lineNo: rcmd[0],
									issueLine: rcmd[1],
									recommendation: rcmd[2],
									suggestion: rcmd[3],
									filePath: activeDoc?.fileName,
									projectName: vscode.workspace.name,
									strDefaultVar: rcmd[4],
									strDefaultVal: rcmd[5]
								}
								recommendations.push(recommendationDict)
								issueLineList.push(n - 1)
							})
							i = 0
						})
						// if(IssueListingPanel.currentPanel){
						// 	IssueListingPanel.kill()
						// }
						// setTimeout(()=>{
						// }, 500)
						// console.log("out: ", outData)
					}
				})
			}
			triggerUpdateDecorations()
		}
	})

	vscode.workspace.onDidChangeTextDocument(event => {
		recommendations = []
		vscode.window.showInformationMessage("in onDidChangeTextDocument()")
		if (activeEditor && event.document === activeEditor.document) {
			if (isOurEditor()) {
				event.contentChanges.forEach((chng) => {
					// console.log("change in text: ", chng)
					if (chng.text.search('\n') == 1 || chng.text == '') {
						issueLineList = []
						var lang: string | undefined = ""
						lang = activeEditor?.document.languageId
						let locs = getLocs(activeEditor?.document)

						var outData: { [key: string]: string[][] };

						if (activeDoc?.languageId) {
							Object.keys(ALLOWED_LANG).forEach(key => {
								if (lang == key) {
									var val;
									scanCode(locs, ALLOWED_LANG[key], function (out: { [key: string]: string[][] }) {
										out['recommendation'].forEach((rcmd) => {
											let n: number = +rcmd[0]
											recommendationDict = {
												id: ++i, lineNo: rcmd[0],
												issueLine: rcmd[1],
												recommendation: rcmd[2],
												suggestion: rcmd[3],
												fileName: getProjName(activeDoc?.fileName),
												projectName: vscode.workspace.name,
												strDefaultVar: rcmd[4],
												strDefaultVal: rcmd[5]
											}
											recommendations.push(recommendationDict)
											issueLineList.push(n - 1)
										})
										i = 0
									})
									// console.log("out: ", outData)
								}
							})
						}
						triggerUpdateDecorations();
					}
				})
			}
		}
	}, null, context.subscriptions);

}
export function deactivate() {}

export function scanCode(locs: any, lang: string | undefined, callback: any) {
  const Url = "http://localhost:5002/infer-loc";
  var dict = {
    code: locs,
    language: lang,
    sid: "",
  };

  //modelInfer(dict);

  axios({
    method: "post",
    url: Url,
    data: dict,
  })
    .then((out) => {
      // console.log("data is: ", out.data)
      callback(out.data);
    })
    .catch((err) => console.log(err));

  // return result
}
function getLocs(activeDocument: vscode.TextDocument | undefined) {

	var lines: { [key: number]: string } = {};

	if (activeDocument) {
		for (let lineNo = 0; lineNo < activeDocument?.lineCount; lineNo++) {
			var lineText = activeDocument?.lineAt(lineNo).text
			lines[lineNo + 1] = lineText.trim()
		}
		// console.log("lines: ", lines)
		return lines
	}
}
function isOurEditor() {
	if (activeDoc && Object.keys(ALLOWED_LANG).includes(activeDoc.languageId)) {
		return true
	}
	else {
		return false
	}
}
const MARK_NOT_ISSUE_COMMAND = 'dr-global.issueCorrection';
const GENERATE_CODE_COMMAND = 'dr-global.generateCode';
export class QuickActions implements vscode.CodeActionProvider {

	public static readonly providedCodeActionKinds = [
		vscode.CodeActionKind.QuickFix
	];

	public provideCodeActions(document: vscode.TextDocument, range: vscode.Range): vscode.CodeAction[] | undefined {
		var newRange = mainRange;
		if (!this.isAtIssueLine(document, range, newRange)) {
			return;
		}

		var suggestion: vscode.CodeAction | undefined;
		var generatedRcmd: vscode.CodeAction | undefined;

		if (newRange) {
			let textSuggestion = recommendations.filter((v) => v['lineNo'] == range.start.line + 1)[0]['suggestion']
			suggestion = this.createFix(document, range, textSuggestion, false, "Suggestion: ");

			let textRcmd = recommendations.filter((v) => v['lineNo'] == range.start.line + 1)[0]['recommendation']
			generatedRcmd = this.generateCode(document, range, textRcmd, true, "Generated code: ");
		}

		const commandAction = this.createCommand();

		if (suggestion && generatedRcmd) {
			return [
				suggestion,
				generatedRcmd,
				// replaceWithSmileyFix,
				// replaceWithSmileyHankyFix,
				commandAction
			];
		}
	}

	private isAtIssueLine(document: vscode.TextDocument, range: vscode.Range | undefined, newRange: vscode.Range | undefined) {
		if (range && newRange) {
			const start = range.start;
			const line = document.lineAt(start.line);
			const newLine = document.lineAt(newRange.start.line)
			return issueLineList.includes(range.start.line);
		}
	}

	private createFix(document: vscode.TextDocument, range: vscode.Range, fixing: string, toReplace: boolean, catagory: string): vscode.CodeAction {
		const fix = new vscode.CodeAction(catagory + fixing, vscode.CodeActionKind.QuickFix,);
		fix.edit = new vscode.WorkspaceEdit();
		if (toReplace) {
			fix.edit.replace(document.uri, document.lineAt(range.start.line).range, fixing)
		}
		return fix;
	}

	private generateCode(document: vscode.TextDocument, range: vscode.Range, fixing: string, toReplace: boolean, catagory: string): vscode.CodeAction | undefined {
		const fix = new vscode.CodeAction(catagory + fixing, vscode.CodeActionKind.QuickFix,);
		fix.edit = new vscode.WorkspaceEdit();
		if (toReplace) {
			fix.edit.replace(document.uri, document.lineAt(range.start.line).range, fixing)
			fix.command = {
				command: GENERATE_CODE_COMMAND,
				title: "Generated code",
				tooltip: "This will generate new variable for this string.",
				arguments: [
					recommendations.filter((v) => v['lineNo'] == range.start.line + 1)[0]['strDefaultVar'],
					recommendations.filter((v) => v['lineNo'] == range.start.line + 1)[0]['strDefaultVal'],
				]
			}
		}
		return fix;
	}

	private createCommand(): vscode.CodeAction {
		const action = new vscode.CodeAction('Mark as not an issue', vscode.CodeActionKind.Empty);
		action.command = { command: MARK_NOT_ISSUE_COMMAND, title: 'Correct the issue line', tooltip: 'This will change the recommendation for this line' };
		return action;
	}
}
function writeProperties(varName: string | undefined) {
	// var str = "I live in Indore"
	// const ref = "iLiveInIndore"
	// var dict: any = {}
	// dict[ref] = str
	// var json = JSON.stringify(dict)
	var readFileName = 'en.json'

	var newpath: any;

	newpath = vscode.window.activeTextEditor?.document.fileName

	vscode.window.showInformationMessage(getCWD(newpath))

	let readFilePath = getCWDFromAbs(newpath) + "src/locales/" + readFileName
	let existingJson: any;
	fs.readFile(readFilePath, 'utf8', function (err, data) {
		existingJson = JSON.parse(data)
		existingJson.main[varName ? varName : ""] = globalDefaultVal

		let json = JSON.stringify(existingJson)
		fs.writeFile(readFilePath, json, function () {
			(er: any) => {
				console.log("error in file write: ", er)
			}
		})
	})


}
function getCWDFromAbs(fullpath: string): string | fs.PathLike {
	var relativePath = vscode.workspace.asRelativePath(fullpath)
	fullpath = fullpath.replace(/\\/g, "\/")
	var rootPath = fullpath.replace(new RegExp(relativePath, "g"), '')
	return rootPath
}