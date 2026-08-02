import {Activity} from "../models/Activity"

export function publish(activity: Activity){
    console.log(JSON.stringify(activity, null, 6))
}