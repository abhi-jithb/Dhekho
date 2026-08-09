import * as vscode from "vscode";
import * as path from "path";
import { PresenceManager } from "../services/PresenceManager";
import { getDeveloperBadge, getDeveloperColor } from "../services/DeveloperColorService";

function normalizePath(p: string): string {
    return p.replace(/\\/g, "/").replace(/^\/+/, "");
}

function formatDuration(startTimeStr?: string): string {
    if (!startTimeStr) {
        return "";
    }
    const start = new Date(startTimeStr).getTime();
    if (isNaN(start)) {
        return "";
    }
    const mins = Math.floor(Math.max(0, Date.now() - start) / 60000);
    if (mins < 1) {
        return " (just now)";
    }
    if (mins < 60) {
        return ` (${mins}m active)`;
    }
    const hrs = Math.floor(mins / 60);
    return ` (${hrs}h ${mins % 60}m active)`;
}

export class DhekhoFileDecorationProvider implements vscode.FileDecorationProvider {
    private readonly _onDidChangeFileDecorations = new vscode.EventEmitter<vscode.Uri | vscode.Uri[] | undefined>();
    public readonly onDidChangeFileDecorations = this._onDidChangeFileDecorations.event;

    constructor(private readonly presenceManager: PresenceManager) {
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

            let tooltip: string;
            if (fileTeammates.length === 1) {
                const branchInfo = primary.gitBranch ? ` [${primary.gitBranch}]` : "";
                const durInfo = formatDuration(primary.startTime || primary.lastSeen);
                tooltip = `${primary.developerName || primary.developerId}${branchInfo} is working here${durInfo}`;
            } else {
                const names = fileTeammates.map(t => {
                    const b = t.gitBranch ? ` [${t.gitBranch}]` : "";
                    return `${t.developerName || t.developerId}${b}`;
                }).join(", ");
                tooltip = `${names} are working here`;
            }

            return new vscode.FileDecoration(badge, tooltip, color);
        }

        // 2. Aggregated Folder Presence
        const folderTeammates = this.presenceManager.getFolderPresence(relativePath);
        if (folderTeammates.length > 0) {
            const primary = folderTeammates[0];
            const badge = String(folderTeammates.length);
            const color = getDeveloperColor(primary.developerId);

            const summaryLines = folderTeammates.map(t => {
                const b = t.gitBranch ? ` [${t.gitBranch}]` : "";
                const dur = formatDuration(t.startTime || t.lastSeen);
                return `• ${t.developerName || t.developerId}${b} → ${t.activeFile}${dur}`;
            });
            const tooltip = `Teammates active in this folder:\n${summaryLines.join("\n")}`;

            return new vscode.FileDecoration(badge, tooltip, color);
        }

        return undefined;
    }

    public dispose(): void {
        this._onDidChangeFileDecorations.dispose();
    }
}
