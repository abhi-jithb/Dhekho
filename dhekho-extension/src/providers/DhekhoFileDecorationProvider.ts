import * as vscode from "vscode";
import * as path from "path";
import { PresenceManager } from "../services/PresenceManager";
import { getDeveloperBadge, getDeveloperColor } from "../services/DeveloperColorService";

function normalizePath(p: string): string {
    return p.replace(/\\/g, "/").replace(/^\/+/, "");
}

export class DhekhoFileDecorationProvider implements vscode.FileDecorationProvider {
    private readonly _onDidChangeFileDecorations = new vscode.EventEmitter<vscode.Uri | vscode.Uri[] | undefined>();
    public readonly onDidChangeFileDecorations = this._onDidChangeFileDecorations.event;

    constructor(private readonly presenceManager: PresenceManager) {
        // When presence state changes, request VS Code to refresh decorations across Explorer
        this.presenceManager.onDidChangePresence(() => {
            this._onDidChangeFileDecorations.fire(undefined);
        });
    }

    public provideFileDecoration(
        uri: vscode.Uri,
        token: vscode.CancellationToken
    ): vscode.FileDecoration | undefined {
        if (uri.scheme !== "file") {
            return undefined;
        }

        const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
        if (!workspaceFolder) {
            return undefined;
        }

        const relativePath = normalizePath(path.relative(workspaceFolder.uri.fsPath, uri.fsPath));
        if (!relativePath || relativePath === ".") {
            return undefined;
        }

        // 1. Direct File Presence
        const fileTeammates = this.presenceManager.getFilePresence(relativePath);
        if (fileTeammates.length > 0) {
            const primary = fileTeammates[0];
            const badge = getDeveloperBadge(primary.developerName);
            const color = getDeveloperColor(primary.developerId);

            const names = fileTeammates.map(t => t.developerName || t.developerId).join(", ");
            const tooltip = fileTeammates.length === 1
                ? `${names} is currently working here`
                : `${names} are currently working here`;

            return new vscode.FileDecoration(badge, tooltip, color);
        }

        // 2. Aggregated Folder Presence
        const folderTeammates = this.presenceManager.getFolderPresence(relativePath);
        if (folderTeammates.length > 0) {
            const primary = folderTeammates[0];
            const badge = String(folderTeammates.length);
            const color = getDeveloperColor(primary.developerId);

            const summaryLines = folderTeammates.map(
                t => `• ${t.developerName || t.developerId} → ${t.activeFile}`
            );
            const tooltip = `Teammates active in this folder:\n${summaryLines.join("\n")}`;

            return new vscode.FileDecoration(badge, tooltip, color);
        }

        return undefined;
    }

    public dispose(): void {
        this._onDidChangeFileDecorations.dispose();
    }
}
