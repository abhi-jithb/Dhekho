import * as vscode from 'vscode';
import * as path from "path";
import { createActivity } from './services/ActivityService';
import { publish } from './services/ActivityPublisher';
import { getDeveloper } from './services/DeveloperService';
import { PresenceManager } from './services/PresenceManager';
import { ActivitySubscriber } from './services/ActivitySubscriber';
import { DhekhoFileDecorationProvider } from './providers/DhekhoFileDecorationProvider';
import { DhekhoStatusBarItem } from './components/StatusBarItem';
import { registerTeamActivityCommands } from './commands/TeamActivityCommand';

import { getCurrentGitBranch } from './services/GitService';

export function activate(context: vscode.ExtensionContext) {
    console.log('Activating Dhekho team awareness platform extension...');

    const developer = getDeveloper();
    const workspaceId = vscode.workspace.name ||
        (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0] ? vscode.workspace.workspaceFolders[0].name : "default");

    // Read server URL from VS Code configuration
    const config = vscode.workspace.getConfiguration('dhekho');
    const serverUrl = config.get<string>('serverUrl', 'http://localhost:3000');
    const wsUrl = serverUrl.replace(/^http/, 'ws');

    // 1. Presence State Manager
    const presenceManager = new PresenceManager();
    context.subscriptions.push(presenceManager);

    // 2. Register File Decoration Provider for VS Code Explorer
    const decorationProvider = new DhekhoFileDecorationProvider(presenceManager);
    context.subscriptions.push(vscode.window.registerFileDecorationProvider(decorationProvider));

    // 3. Status Bar Item & Commands
    const statusBarItem = new DhekhoStatusBarItem(presenceManager);
    context.subscriptions.push(statusBarItem);
    registerTeamActivityCommands(context, presenceManager);

    // 4. Connect Real-time WebSocket Subscriber
    const subscriber = new ActivitySubscriber(
        wsUrl,
        developer.developerId,
        developer.developerName,
        workspaceId,
        presenceManager
    );
    subscriber.connect();
    context.subscriptions.push({ dispose: () => subscriber.dispose() });

    // 5. Listen for active editor changes
    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(async (edi) => {
            if (!edi || !edi.document || edi.document.uri.scheme !== 'file') {
                return;
            }

            const workspaceFolder = vscode.workspace.getWorkspaceFolder(edi.document.uri);
            const fileName = workspaceFolder
                ? path.relative(workspaceFolder.uri.fsPath, edi.document.uri.fsPath)
                : edi.document.fileName;

            const gitBranch = await getCurrentGitBranch(workspaceFolder);

            const activity = createActivity(
                "active-file-changed",
                fileName,
                workspaceId,
                gitBranch
            );

            console.log("ABOUT TO PUBLISH ACTIVITY:", activity);
            try {
                await publish(activity);
                console.log("PUBLISH FINISHED SUCCESSFULLY");
            } catch (err) {
                console.error("Failed to publish activity to server:", err);
            }
        })
    );
}

export function deactivate() { }