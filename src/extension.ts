import * as vscode from 'vscode';
import { createActivity } from './services/ActivityService';
import { publish } from './services/ActivityPublisher';

export function activate(context : vscode.ExtensionContext){
    console.log('First line of hard code in building VS Code Extension');

    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor((edi)=>{
            console.log("Active editor changed!");

            if(edi){
                const activity = createActivity(
                    "Active File Changed!",
                    edi.document.fileName
                );
                publish(activity)
            } else{
                console.log("no active editor!");
            }
        })
    );
}

export function deactivate(){}