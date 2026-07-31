import * as vscode from 'vscode';

export function activate(context : vscode.ExtensionContext){
    console.log('First line of hard code in building VS Code Extension');

    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(()=>{
            console.log("Active editor changed!");
        })
    );
}

export function deactivate(){}