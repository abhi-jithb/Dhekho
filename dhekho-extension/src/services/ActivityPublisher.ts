import { Activity } from "../models/Activity";

export async function publish(activity: Activity, serverUrl: string = "http://localhost:3000") {
    const baseUrl = serverUrl.replace(/\/+$/, "");
    const endpoint = `${baseUrl}/activity`;

    const response = await fetch(endpoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(activity)
    });

    if (!response.ok) {
        throw new Error(`Failed to publish activity. Server responded with status ${response.status}`);
    }

    return await response.json();
}