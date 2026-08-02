import {Activity} from '../models/Activity'

export function createActivity(type:string, file:string): Activity{
    return{
        type,
        file,
        timeStamp:new Date()
    };
}