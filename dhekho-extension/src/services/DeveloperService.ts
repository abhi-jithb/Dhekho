import * as os from "os";

export function getDeveloper() {
    return {
        developerId: os.userInfo().username,
        developerName: os.userInfo().username
    };
}