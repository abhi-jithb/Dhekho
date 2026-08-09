import * as vscode from "vscode";

export async function getCurrentGitBranch(workspaceFolder?: vscode.WorkspaceFolder): Promise<string | undefined> {
    try {
        const gitExtension = vscode.extensions.getExtension('vscode.git');
        if (!gitExtension) {
            return undefined;
        }

        if (!gitExtension.isActive) {
            await gitExtension.activate();
        }

        const gitApi = gitExtension.exports.getAPI(1);
        if (!gitApi || !gitApi.repositories || gitApi.repositories.length === 0) {
            return undefined;
        }

        let repo = gitApi.repositories[0];
        if (workspaceFolder) {
            const matched = gitApi.repositories.find((r: any) =>
                r.rootUri.fsPath === workspaceFolder.uri.fsPath
            );
            if (matched) {
                repo = matched;
            }
        }

        return repo.state.HEAD?.name;
    } catch (err) {
        console.error("Error reading active Git branch:", err);
        return undefined;
    }
}
