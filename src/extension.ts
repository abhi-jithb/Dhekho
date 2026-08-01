import { timeStamp } from 'console';
import * as vscode from 'vscode';
import {Activity} from "./models/Activity"

export function activate(context : vscode.ExtensionContext){
    console.log('First line of hard code in building VS Code Extension');

    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor((edi)=>{
            console.log("Active editor changed!");

            if(edi){
                const activity : Activity = {
                    type: "Active File Changed!",
                    file: edi.document.fileName,
                    timeStamp: new Data()
                }
                console.log(activity);
            } else{
                console.log("no active editor!");
            }
        })
    );
}

export function deactivate(){}