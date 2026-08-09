export interface Activity {
    type: string;
    file: string;
    workspaceId: string;
    timeStamp: Date;
    developerId: string;
    developerName: string;
    gitBranch?: string;
}