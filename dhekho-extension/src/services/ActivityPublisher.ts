import { Activity } from "../models/Activity";

export async function publish(activity: Activity) {
    const response = await fetch("http://localhost:3000/activity", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(activity)
    });

    console.log("Server response:", await response.json());
}