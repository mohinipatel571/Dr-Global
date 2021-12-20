// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { OptionsSidebar } from './OptionsSidebar';
import { SidebarProvider } from './SidebarProvider';
import * as fs from 'fs';
import * as path from 'path';
const dirTree = require("directory-tree");
import axios, { AxiosResponse } from 'axios';
import { RecentProjectsProvider } from './RecentProjectsProvider';
import { AuthenticateUser } from './AuthenticateUser';

export const ALLOWED_LANG: { [key: string]: string } = { "typescript": "ts", "javascript": "js", "java": "java", "vue": "vue" }

var loadRecentDisposable: vscode.Disposable;
var mainTreeData: any = undefined;



var GLOBAL_CONTEXT: vscode.ExtensionContext;

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "dr-global" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	// let disposable = vscode.commands.registerCommand('dr-global.helloWorld', () => {
	// 	// The code you place here will be executed every time your command is executed
	// 	// Display a message box to the user
	// 	vscode.window.showInformationMessage('Hello World from Dr-Global!');
	// });

	// context.subscriptions.push(disposable);
	
	var dirData: any = {};

	var sidebarLoad: vscode.Disposable;
	const optionsSidebarProvider = new OptionsSidebar(context.extensionUri);

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider('view-options', optionsSidebarProvider)
	);

	const loadRecent = new RecentProjectsProvider(context.extensionUri)
	loadRecentDisposable = vscode.window.registerWebviewViewProvider('view-load-recent', loadRecent)
	console.log("just below the load recent instance");
	context.subscriptions.push(loadRecentDisposable)

	var scanProj = new AuthenticateUser(context.extensionUri)
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider('view-scan-proj', scanProj)
	)



	const sidebarProvider = new SidebarProvider(context.extensionUri);
	context.subscriptions.push(
		vscode.commands.registerCommand('view-load-dir.opendir', () => {

			console.log("sidebar load outside: ", sidebarLoad);

			if (sidebarLoad) {
				sidebarLoad.dispose();
			}

			let options = {
				canSelectFiles: false,		//Whether to select files
				canSelectFolders: true,		//Whether to choose a directory
				canSelectMany: false,		//Can multiple choices
				defaultUri: vscode.Uri.file("D:/VScode"),	//The folder opened by default
				openLabel: 'Select folder'
			};

			vscode.window.showOpenDialog(options).then(result => {
				if (result === undefined) {
					vscode.window.showErrorMessage("Can't load directory!");
				}
				else {
					var loadUri = result[0].path.toString();
					var loadDir = loadUri.substr(1, loadUri.length);
					var projName = getProjName(loadDir);
					console.log("loadDirrr: ", loadDir);
					console.log("sidebar load inside: ", sidebarLoad);

					let excludePathListRegex: Array<RegExp> = [];
					excludePathListRegex.push(
						new RegExp(path.join(loadDir, ".vscode").split('\\').join('\\\\')),
						new RegExp(path.join(loadDir, "node_modules").split('\\').join('\\\\'))
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
					}
					else {
						sidebarLoad = vscode.window.registerWebviewViewProvider('view-load-dir', sidebarProvider);
						context.subscriptions.push(sidebarLoad);
					}

					writeJson(dirData, getCWD(__dirname), 'LoadedProjLocations.json');
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
			if (ch ==='/' || ch === '\\') {
				break;
			}
			else {
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
		if (ch === '/' || ch ==='\\') {
			res = fullpath.slice(0, i);
			break;
		}
	}
	return res + path.join('/');
}

// this method is called when your extension is deactivated
export function deactivate() {}
export function scanCode(locs: any, lang: string | undefined, callback: any) {
	const Url =
		"http://localhost:5002/infer-loc";
	var dict = {
		"code": locs,
		"language": lang,
		"sid": ""
	};

	//modelInfer(dict);

	axios({
		method: 'post',
		url: Url,
		data: dict
	}).then((out) => {
		// console.log("data is: ", out.data)
		callback(out.data);
	}).catch(err => console.log(err));

	// return result
}		
