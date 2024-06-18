import { Script, ScriptPosition } from "./Script";
import { ScrollInformation, ScrollUpdate } from "./Scroll";


export interface ServerToClientEvents {
    scrollInformation: (info: ScrollInformation) => void
    scriptBreakup: (info: Script) => void
    scriptPosition: (position: ScriptPosition) => void

}

export interface ClientToServerEvents {
    scrollUpdate: (scrollData: ScrollUpdate) => void
    recordingStart: (name: string) => void
    recordingStop: () => void
    joinAdminDisplayRoom: () => void
    leaveAdminDisplayRoom: () => void
}

export interface InterServerEvents {}

export interface SocketData {}