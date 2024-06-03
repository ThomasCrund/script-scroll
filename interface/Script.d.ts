

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
    element: ScriptElement[]
}

export interface ScriptElement {
    str: string
    position: number
}