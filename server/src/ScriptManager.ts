import fs from "fs"
import { Script } from '../../interface/Script'

export default class ScriptManager {
    scriptBreakup: Script
    constructor() {
        this.scriptBreakup = {numPages: 0, acts: []};
        fs.readFile("../client/public/script.json", (err, data) => {
            if (err) throw err;
            this.scriptBreakup = JSON.parse(data.toString())
        })
    }

    getScriptBreakup() {
        return this.scriptBreakup
    }
}