import * as vscode from "vscode";
import { TeammateState } from "../models/TeammateState";

function normalizePath(p: string): string {
    return p.replace(/\\/g, "/").replace(/^\/+/, "");
}

export class PresenceManager {
    private teammateMap = new Map<string, TeammateState>();
    private readonly _onDidChangePresence = new vscode.EventEmitter<void>();
    public readonly onDidChangePresence = this._onDidChangePresence.event;

    public setSnapshot(states: TeammateState[], currentDeveloperId: string): void {
        this.teammateMap.clear();
        for (const state of states) {
            if (state.developerId !== currentDeveloperId) {
                this.teammateMap.set(state.developerId, {
                    ...state,
                    activeFile: normalizePath(state.activeFile)
                });
            }
        }
        this._onDidChangePresence.fire();
    }

    public updatePresence(state: TeammateState, currentDeveloperId: string): void {
        if (state.developerId === currentDeveloperId) {
            return;
        }

        const normalized = {
            ...state,
            activeFile: normalizePath(state.activeFile)
        };

        this.teammateMap.set(state.developerId, normalized);
        this._onDidChangePresence.fire();
    }

    public removeDeveloper(developerId: string): void {
        if (this.teammateMap.has(developerId)) {
            this.teammateMap.delete(developerId);
            this._onDidChangePresence.fire();
        }
    }

    public getFilePresence(relativePath: string): TeammateState[] {
        const norm = normalizePath(relativePath);
        const result: TeammateState[] = [];
        for (const teammate of this.teammateMap.values()) {
            if (teammate.activeFile === norm) {
                result.push(teammate);
            }
        }
        return result;
    }

    public getFolderPresence(relativePath: string): TeammateState[] {
        const norm = normalizePath(relativePath);
        const prefix = norm.endsWith("/") ? norm : norm + "/";
        const result: TeammateState[] = [];
        for (const teammate of this.teammateMap.values()) {
            if (teammate.activeFile.startsWith(prefix)) {
                result.push(teammate);
            }
        }
        return result;
    }

    public getAllTeammates(): TeammateState[] {
        return Array.from(this.teammateMap.values());
    }

    public dispose(): void {
        this._onDidChangePresence.dispose();
    }
}
