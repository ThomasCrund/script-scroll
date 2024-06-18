import fs from "fs"
import { Script, ScriptPosition } from '../../interface/Script'
import ScrollManager from "./ScrollManager";
import { Server, Socket } from "socket.io";
import { ClientToServerEvents, InterServerEvents, ServerToClientEvents, SocketData } from "../../interface/Socket";

export default class ScriptManager {
    scriptBreakup: Script;
    scrollManager: ScrollManager;
    currentPosition: ScriptPosition;
    startSwitchPosition: ScriptPosition;
    recording: boolean;
    recordingDumpFileName: string;
    recordingFileName: string;
    recordingFileNumber: number;
    records: ScriptPosition[];
    constructor(scrollManager: ScrollManager) {
        this.scriptBreakup = { numPages: 0, acts: [] };
        this.scrollManager = scrollManager;
        this.currentPosition = { actNumber: 0, sceneNumber: 0, elementNumber: 0, scrollPosition: 0, timestamp: Date.now() }
        this.startSwitchPosition = this.currentPosition
        this.recording = false;
        this.recordingDumpFileName = "dump.csv";
        this.records = [];
        this.recordingFileName = "output"
        this.recordingFileNumber = 0
        fs.readFile("../client/public/script.json", (err, data) => {
            if (err) throw err;
            this.scriptBreakup = JSON.parse(data.toString())
        })
    }

    getScriptBreakup() {
        return this.scriptBreakup
    }

    findPositionInScriptFromScroll(scrollPosition: number): ScriptPosition {
        let position: ScriptPosition = { actNumber: 0, sceneNumber: 0, elementNumber: 0, scrollPosition: scrollPosition, timestamp: Date.now() };
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
            return true;
        }
        return false;
    }

    registerEvents(io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>, socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>) {
        socket.emit('scriptBreakup', this.getScriptBreakup());

        socket.on('joinAdminDisplayRoom', () => {
            socket.join("data");
            socket.emit("scriptPosition", this.currentPosition);
        });
        socket.on('leaveAdminDisplayRoom', () => socket.leave("data"));
        socket.on('recordingStart', (name) => this.startRecording(name));
        socket.on('recordingStop', () => this.stopRecording());
    }

    startRecording(name: string) {
        if (this.recording) {
            console.log("Can't Start Recording when already recording")
            return
        }
        console.log("Start Recording");
        this.recording = true;
        this.recordingDumpFileName = `./${name}_dump.csv`;
        this.recordingFileName = name;
    }

    updateRecordingFile() {
        const data = this.records.map(record => `${record.scrollPosition},${record.actNumber},${record.sceneNumber}, ${record.elementNumber}\n`).join("");
        this.records = [];
        fs.appendFile(this.recordingDumpFileName, data, () => {
            console.log("Recording Data Updated");
        })
        fs.writeFile(`./recordings/${this.recordingFileName}_${this.recordingFileNumber}.json`, JSON.stringify(this.scriptBreakup), () => {
            console.log("Recording Data Updated");
        })
        this.recordingFileNumber++;
    }

    stopRecording() {
        this.recording = false;
        console.log("Stop Recording");
        this.updateRecordingFile();
    }

    loop(io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>) {

        // console.log("loop", this.currentPosition);

        if (this.updateCurrentPosition()) {
            // Current Script Element has changed
            io.to("data").emit("scriptPosition", this.currentPosition);
            console.log("New Position");

            if (this.recording) {
                const scriptOldElement = this.scriptBreakup.acts.find(act => act.actNumber === this.startSwitchPosition.actNumber)
                    ?.scenes.find(scene => scene.sceneNumber === this.startSwitchPosition.sceneNumber)
                    ?.elements[this.startSwitchPosition.elementNumber];
                let oldTimesNumber = 0;
                if (scriptOldElement !== undefined) {
                    if (scriptOldElement.times == undefined) {
                        scriptOldElement.times = []
                    }
                    oldTimesNumber = scriptOldElement.times.length - 1
                    scriptOldElement.times[oldTimesNumber].lengthTime = this.currentPosition.timestamp - scriptOldElement.times[oldTimesNumber].startTime
                }

                const scriptElement = this.scriptBreakup.acts.find(act => act.actNumber === this.currentPosition.actNumber)
                    ?.scenes.find(scene => scene.sceneNumber === this.currentPosition.sceneNumber)
                    ?.elements[this.currentPosition.elementNumber];
                if (scriptElement === undefined) {
                    if (this.currentPosition.actNumber == 0 && this.currentPosition.sceneNumber == 0 && this.currentPosition.elementNumber == 0) {
                        return;
                    }
                    console.log("Can't Find matching Script Element")
                    return;
                }

                if (scriptElement.times == undefined) {
                    scriptElement.times = []
                }

                scriptElement.times.push({
                    startTime: this.currentPosition.timestamp,
                    lengthTime: 0,
                    previous: {
                        actNumber: this.startSwitchPosition.actNumber,
                        sceneNumber: this.startSwitchPosition.sceneNumber,
                        elementNumber: this.startSwitchPosition.elementNumber,
                        timesNumber: oldTimesNumber
                    }
                })

                this.startSwitchPosition = this.currentPosition;

                console.log("Updating elements", scriptOldElement, scriptElement)

                io.to("data").emit('scriptBreakup', this.getScriptBreakup());
            }


        }

        if (this.recording) {
            this.records.push(this.currentPosition);
            if (this.records.length > 120) {
                this.updateRecordingFile();
            }
        }


    }

}