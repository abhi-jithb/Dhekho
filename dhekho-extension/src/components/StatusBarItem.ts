import * as vscode from "vscode";
import { PresenceManager } from "../services/PresenceManager";

export class DhekhoStatusBarItem implements vscode.Disposable {
    private statusBarItem: vscode.StatusBarItem;

    constructor(private readonly presenceManager: PresenceManager) {
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right,
            100
        );
        this.statusBarItem.command = "dhekho.showTeamActivity";

        this.update();

        // Listen for presence state changes to update count live
        this.presenceManager.onDidChangePresence(() => {
            this.update();
        });

        this.statusBarItem.show();
    }

    private update(): void {
        const teammates = this.presenceManager.getAllTeammates();
        const count = teammates.length;

        if (count === 0) {
            this.statusBarItem.text = `$(people) Dhekho: Solo`;
            this.statusBarItem.tooltip = `Dhekho Team Awareness: No teammates active`;
        } else {
            const names = teammates.map(t => t.developerName || t.developerId).join(", ");
            this.statusBarItem.text = `$(people) Dhekho: ${count} active`;
            this.statusBarItem.tooltip = `Dhekho Team Awareness:\nActive teammates: ${names}\nClick to view team activity`;
        }
    }

    public dispose(): void {
        this.statusBarItem.dispose();
    }
}
