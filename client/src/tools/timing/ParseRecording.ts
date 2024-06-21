import { act } from "react";
import { Act, ExpectedLength, Scene, Script, ScriptElement } from "../../../../interface/Script";

export interface ScriptRecordingData extends Script {
    acts: ActWithRecording[]
}

export interface ActWithRecording extends Act {
    scenes: SceneWithRecording[]
    expectedLength: ExpectedLength
}

export interface SceneWithRecording extends Scene {
    elements: ScriptElementWithRecording[]
    expectedLength: ExpectedLength
}

export interface ScriptElementWithRecording extends ScriptElement {
    expectedLength: ExpectedLength
}


export interface ScriptPosition {
    actNumber: number
    sceneNumber: number
    elementNumber: number
    scrollPosition: number
    timestamp: number
}

interface ElementPlus extends ScriptElement {
    actNumber: number
    sceneNumber: number
    elementNumber: number
}

export function ParseRecording(recordingText: string): ScriptRecordingData {
    const recording: Script = (JSON.parse(recordingText) as Script)
    const elements: ElementPlus[] = []
    let lastIndex = 0;
    let lastTimeIndex = 0;
    let lastTime = 0;
    recording.acts.forEach(act => {
        act.scenes.forEach(scene => {
            scene.elements.forEach((element, elementIndex) => {
                if (element.times === undefined) return;
                elements.push({
                    ...element,
                    elementNumber: elementIndex,
                    actNumber: act.actNumber,
                    sceneNumber: scene.sceneNumber
                })
                let lastTimesTime = 0;
                let lastTimesIndex = 0;
                element.times.forEach((time, index) => {
                    if (time.startTime > lastTimesTime) {
                        lastTimesTime = time.startTime;
                        lastTimesIndex = index;
                    }
                }) 
                if (lastTimesTime > lastTime) {
                    lastTime = lastTimesTime;
                    lastIndex = elements.length - 1;
                    lastTimeIndex = lastTimesIndex
                }
            })
        })
    })
    console.log(elements);
    console.log(lastIndex, elements[lastIndex].times?.[lastTimeIndex]);
    const progressions: {
        steps: {
            element: ElementPlus
            timeNumber: number
        }[]
        lengthTime: number
        startTime: number
    }[] = [];
    let checkIndex = lastIndex;
    let checkTimesIndex = lastTimeIndex;
    let i = 0;
    while (i < 2000) {
        if (checkIndex === -1) {
            console.log("Done");
            break;
        }
        const checkElement = elements[checkIndex];
        const checkTime = checkElement.times?.[checkTimesIndex];
        if (checkTime === undefined) {
            console.error("Check Time does not exists for ", checkIndex, checkTimesIndex);
            break;
        }
        console.log(checkElement);
        if (progressions.length !== 0)
            console.log(compareElements(checkElement, progressions[progressions.length - 1].steps[0].element), 
                    progressions[progressions.length - 1].steps[0].element, checkElement);
        if (progressions.length === 0 || compareElements(checkElement, progressions[progressions.length - 1].steps[0].element) > 0) {
            
            // Create a new progression
            progressions.push({
                startTime: checkTime.startTime,
                lengthTime: checkTime.lengthTime,
                steps: [{
                    element: checkElement,
                    timeNumber: checkTimesIndex
                }]
            })
        } else {
            progressions[progressions.length - 1].lengthTime = progressions[progressions.length - 1].lengthTime + checkTime.lengthTime;
            progressions[progressions.length - 1].steps = [
                {
                    element: checkElement,
                    timeNumber: checkTimesIndex
                },
                ...progressions[progressions.length - 1].steps
            ]
        }

        // Find next element in progression
        checkIndex = elements.findIndex((element) => (element.actNumber === checkTime.previous.actNumber 
            && element.sceneNumber === checkTime.previous.sceneNumber && element.elementNumber === checkTime.previous.elementNumber));
        checkTimesIndex = checkTime.previous.timesNumber;
        console.log(checkIndex, checkTimesIndex);
        i++;
    }
    console.log(i);
    console.log(progressions);

    const recordingOutput: ScriptRecordingData = {
        numPages: recording.numPages,
        acts: recording.acts.map(act => ({
            expectedLength: {
                type: "NotCalculated",
                predictedLength: 0
            },
            ...act,
            scenes: act.scenes.map(scene => ({
                expectedLength: {
                    type: "NotCalculated",
                    predictedLength: 0
                },
                ...scene,
                elements: scene.elements.map(element => ({
                    expectedLength: {
                        type: "NotCalculated",
                        predictedLength: 0
                    },
                    ...element
                })),
            }))
        }))
    }

    progressions
        .filter(progressions => progressions.steps.length > 1)
        .sort((a, b) => (b.lengthTime - a.lengthTime))
        .forEach(progression => {
            progression.steps.forEach(step => {
                const element = recordingOutput.acts.find(act => act.actNumber === step.element.actNumber)
                                        ?.scenes.find(scene => scene.sceneNumber === step.element.sceneNumber)
                                        ?.elements[step.element.elementNumber];
                if (element === undefined || step.element.times === undefined) {
                    console.error("Step", step, "cannot find element");
                    return;
                }
                if (element.expectedLength.type === "NotCalculated" || element.expectedLength.predictedLength < step.element.times[step.timeNumber].lengthTime) {
                    element.expectedLength = {
                        type: "Recorded",
                        predictedLength: step.element.times[step.timeNumber].lengthTime
                    }
                }  else {
                    console.log("Clash", step, element.expectedLength, step.element.times[step.timeNumber].lengthTime);
                }
            })
        console.log(new Date(progression.startTime).toLocaleTimeString(), progression.lengthTime, progression.steps[0].element.position, progression.steps[progression.steps.length - 1].element.position)
    });

    recordingOutput.acts.forEach(act => {
        let actTotal = 0;
        let cantCalculateActTotal = false;
        act.scenes.forEach(scene => {
            let sceneTimeSum = 0;
            let sceneNotRecordedCount = 0;
            scene.elements.forEach((element, index) => {
                if (element.expectedLength.type === "NotCalculated") {
                    if (index === scene.elements.length - 1) {
                        element.expectedLength = {
                            type: "CalculatedMerge",
                            predictedLength: 0,
                            preCalculationValue: 0
                        }
                    } else {
                        if (scene.elements[index + 1].expectedLength.type === "NotCalculated") {
                            console.log("Got to unrecorded section");
                            sceneNotRecordedCount++;
                            return;
                        }
                        element.expectedLength = {
                            type: "CalculatedMerge",
                            predictedLength: scene.elements[index + 1].expectedLength.predictedLength / 2,
                            preCalculationValue: 0
                        }
                        scene.elements[index + 1].expectedLength = {
                            type: "CalculatedMerge",
                            preCalculationValue: scene.elements[index + 1].expectedLength.predictedLength,
                            predictedLength: scene.elements[index + 1].expectedLength.predictedLength / 2,
                        }
                    }
                }
                sceneTimeSum += element.expectedLength.predictedLength;
            })
            if (sceneNotRecordedCount <= 5) {
                scene.expectedLength = {
                    type: "Sum",
                    predictedLength: sceneTimeSum
                }
                actTotal += sceneTimeSum;
            } else {
                cantCalculateActTotal = true;
            }
            
        })
        if (!cantCalculateActTotal) {
           act.expectedLength = {
            type: "Sum",
            predictedLength: actTotal
        } 
        }

    })
    
    console.log(recordingOutput);

    return recordingOutput;
}


function compareElements(a: ElementPlus, b: ElementPlus) {
    let output = a.actNumber - b.actNumber;
    if (output === 0) {
        output = a.sceneNumber - b.sceneNumber;
    }
    if (output === 0) {
        output = a.elementNumber - b.elementNumber;
    }
    return output;
}