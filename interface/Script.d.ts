
export type PredictionType = "Recorded" | "CalculatedMerge" | "CalculatedAverage" | "Sum" | "NotCalculated" | "Customised" | "Interpolate"

export interface Script {
    numPages: number
    acts: Act[]
}

export interface Act {
    actNumber: number
    startPosition: number
    scenes: Scene[]
    expectedLength?: ExpectedLength
}

export interface Scene {
    sceneNumber: number
    startPosition: number
    elements: ScriptElement[]
    expectedLength?: ExpectedLength
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
    expectedLength?: ExpectedLength
}

export interface ExpectedLength {
    type: PredictionType
    predictedLength: number
    preCalculationValue?:  number,
    textValue?: string,
}

export interface ScriptPosition {
    actNumber: number
    sceneNumber: number
    elementNumber: number
    scrollPosition: number
    timestamp: number
}