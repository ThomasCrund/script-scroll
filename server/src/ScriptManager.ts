import fs from "fs"
import { Script, ScriptPosition } from '../../interface/Script'
import ScrollManager from "./ScrollManager";

export default class ScriptManager {
    scriptBreakup: Script;
    scrollManager: ScrollManager;
    currentPosition: ScriptPosition;
    changed: boolean;
    constructor(scrollManager: ScrollManager) {
        this.scriptBreakup = {numPages: 0, acts: []};
        this.scrollManager = scrollManager;
        this.currentPosition = { actNumber: 0, sceneNumber: 0, elementNumber: 0, scrollPosition: 0 } 
        this.changed = true;
        fs.readFile("../client/public/script.json", (err, data) => {
            if (err) throw err;
            this.scriptBreakup = JSON.parse(data.toString())
        })
    }

    getScriptBreakup() {
        return this.scriptBreakup
    }

    getCurrentPosition(): ScriptPosition {
        this.changed = false;
        return this.currentPosition
    }

    findPositionInScriptFromScroll(scrollPosition: number): ScriptPosition {
        let position = { actNumber: 0, sceneNumber: 0, elementNumber: 0, scrollPosition: scrollPosition };
        if (this.scriptBreakup.numPages === 0) {
            console.log("script breakup not ready");
            return position;
        }
        const acts = this.scriptBreakup.acts;
        for (let i = 0; i <= acts.length; i++) {
            const act = acts[i];
            if (act == undefined) continue;

            const nextActPosition = (this.scriptBreakup.acts[i + 1]?.startPosition ?? this.scriptBreakup.numPages)
            if (scrollPosition < act.startPosition) continue;
            if (scrollPosition >= nextActPosition) continue;
            position.actNumber = act.actNumber;

            for (let j = 0; j < act.scenes.length; j++) {
                const scene = act.scenes[j];
                if (scene == undefined) continue;

                const nextScenePosition = (act.scenes[j + 1]?.startPosition ?? nextActPosition);
                if (scrollPosition < scene.startPosition) continue;
                if (scrollPosition >= nextScenePosition) continue;
                position.sceneNumber = scene.sceneNumber;

                for (let k = 0; k < scene.elements.length; k++) {
                    const element = scene.elements[k];

                    const nextElementPosition = (scene.elements[k + 1]?.position ?? nextScenePosition);
                    if (scrollPosition < element.position) continue;
                    if (scrollPosition >= nextElementPosition) continue;
                    position.elementNumber = k;
                }
                break;
            }
            break;
        }
        return position;
    }
    
    updateCurrentPosition() {
        const newScrollPosition = this.scrollManager.master.scrollPosition;
        
        if (newScrollPosition == this.currentPosition.scrollPosition) return;

        const newPosition = this.findPositionInScriptFromScroll(newScrollPosition);

        if (newPosition.actNumber != this.currentPosition.actNumber || newPosition.sceneNumber != this.currentPosition.sceneNumber || newPosition.elementNumber != this.currentPosition.elementNumber) {
            this.currentPosition = newPosition;
            console.log(newPosition);
            this.changed = true;
        }
    }

}