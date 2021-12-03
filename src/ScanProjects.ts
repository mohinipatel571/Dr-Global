import * as vscode from 'vscode';
import { scanCode } from './extension';

export async function scanFile(file: vscode.TextDocument, lang: string, projectName: string): Promise<Array<any>> {
    let locs = getLocs(file);
    let recommendations: Array<any> = [];
    let recommendationDict = {};
    return await new Promise((resolve, reject) => {
        scanCode(locs, lang, function (out: { [key: string]: string[][] }) {
            console.log("new out----> ", out);
            out['recommendation'].forEach((rcmd) => {
                let n: number = +rcmd[0];
                recommendationDict = {
                    lineNo: rcmd[0],
                    issueLine: rcmd[1],
                    recommendation: rcmd[2],
                    suggestion: rcmd[3],
                    filePath: file.fileName,
                    projectName: projectName,
                    strDefaultVar: rcmd[4],
                    strDefaultVal: rcmd[5]
                };
                recommendations.push(recommendationDict);
            });
            resolve(recommendations);
        });
        console.log("inside scan code---: ",locs);
    })      ;  
}

function getLocs(file: vscode.TextDocument) {
    let lines: { [key: number]: string } = {};

	if (file) {
		for (let lineNo = 0; lineNo < file?.lineCount; lineNo++) {
			var lineText = file?.lineAt(lineNo).text;
			lines[lineNo + 1] = lineText.trim();
		}
		// console.log("lines: ", lines)
		return lines;
	}
}

