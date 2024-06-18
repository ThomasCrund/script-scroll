

export interface Script {
    numPages: number
    acts: Act[]
}

export interface Act {
    actNumber: number
    startPosition: number
    scenes: Scene[]
}

export interface Scene {
    sceneNumber: number
    startPosition: number
    elements: ScriptElement[]
}

export interface ScriptElement {
    str: string
    position: number
    times?: {
        startTime: number
        lengthTime: number
        previous: {
            actNumber: number
            sceneNumber: number
            elementNumber: number
            timesNumber: number
        }
    }[]
}


export interface ScriptPosition {
    actNumber: number
    sceneNumber: number
    elementNumber: number
    scrollPosition: number
    timestamp: number
}