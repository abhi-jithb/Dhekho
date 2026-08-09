import * as vscode from "vscode";

const COLOR_PALETTE = [
    "charts.green",
    "charts.purple",
    "charts.blue",
    "charts.orange",
    "charts.yellow",
    "charts.red"
];

function hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash);
}

export function getDeveloperColor(developerId: string): vscode.ThemeColor {
    const index = hashString(developerId) % COLOR_PALETTE.length;
    return new vscode.ThemeColor(COLOR_PALETTE[index]);
}

export function getDeveloperBadge(developerName: string): string {
    if (!developerName) {
        return "●";
    }

    const parts = developerName.trim().split(/[\s._-]+/);
    if (parts.length >= 2 && parts[0] && parts[1]) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    if (parts[0] && parts[0].length >= 1) {
        return parts[0][0].toUpperCase();
    }

    return "●";
}
