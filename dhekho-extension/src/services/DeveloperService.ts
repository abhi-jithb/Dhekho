import * as os from "os";

export function getDeveloper() {
    const username = os.userInfo().username || "developer";
    const developerName = username.charAt(0).toUpperCase() + username.slice(1);

    return {
        developerId: username.toLowerCase(),
        developerName: developerName
    };
}