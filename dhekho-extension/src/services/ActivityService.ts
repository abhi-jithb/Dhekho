import { Activity } from "../models/Activity";
import { getDeveloper } from "./DeveloperService";

export function createActivity(
    type: string,
    fileName: string,
    workspaceId: string,
    gitBranch?: string
): Activity {

    const developer = getDeveloper();

    return {
        type,
        file: fileName,
        workspaceId,
        timeStamp: new Date(),
        developerId: developer.developerId,
        developerName: developer.developerName,
        gitBranch
    };
}