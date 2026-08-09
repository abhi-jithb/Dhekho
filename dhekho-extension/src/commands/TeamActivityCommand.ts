import * as vscode from "vscode";
import { PresenceManager } from "../services/PresenceManager";
import { getDeveloperBadge } from "../services/DeveloperColorService";

export function registerTeamActivityCommands(
    context: vscode.ExtensionContext,
    presenceManager: PresenceManager
) {
    // Command 1: Show Team Activity QuickPick
    const showTeamActivityCommand = vscode.commands.registerCommand(
        "dhekho.showTeamActivity",
        async () => {
            const teammates = presenceManager.getAllTeammates();
            if (teammates.length === 0) {
                vscode.window.showInformationMessage(
                    "Dhekho: No active teammates currently working in this workspace."
                );
                return;
            }

            const items: vscode.QuickPickItem[] = teammates.map((t) => {
                const badge = getDeveloperBadge(t.developerName);
                return {
                    label: `$(${getIconForInitial(badge)}) ${t.developerName || t.developerId}`,
                    description: t.activeFile,
                    detail: `Workspace: ${t.workspaceId} • Last Active: ${new Date(t.lastSeen).toLocaleTimeString()}`
                };
            });

            const selected = await vscode.window.showQuickPick(items, {
                placeHolder: "Select a teammate to reveal their active file in Explorer"
            });

            if (selected && selected.description) {
                const workspaceFolders = vscode.workspace.workspaceFolders;
                if (workspaceFolders && workspaceFolders.length > 0) {
                    const targetUri = vscode.Uri.joinPath(
                        workspaceFolders[0].uri,
                        selected.description
                    );
                    try {
                        const doc = await vscode.workspace.openTextDocument(targetUri);
                        await vscode.window.showTextDocument(doc, { preview: true });
                    } catch (err) {
                        vscode.window.showWarningMessage(
                            `Could not open file: ${selected.description}`
                        );
                    }
                }
            }
        }
    );

    context.subscriptions.push(showTeamActivityCommand);
}

function getIconForInitial(badge: string): string {
    return "account";
}
