import { ScrollInformation, ScrollUpdate } from "./Scroll";


export interface ServerToClientEvents {
    scrollInformation: (info: ScrollInformation) => void
}

export interface ClientToServerEvents {
    scrollUpdate: (scrollData: ScrollUpdate) => void
}

export interface InterServerEvents {}

export interface SocketData {}