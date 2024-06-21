import React, { ChangeEvent, act, useCallback, useEffect, useState } from 'react'
import AddRecording from './AddRecording'
import { ParseRecording, ScriptRecordingData } from './ParseRecording'
import { ExpectedLength } from '../../../../interface/Script';



export default function TimingCreator() {
  const [recordings, setRecordings] = useState<ScriptRecordingData[]>([]);
  const [result, setResult] = useState<ScriptRecordingData | undefined>(undefined);

  const onAddRecording = (recordingData: string) => {

    const recording = ParseRecording(recordingData)

    setRecordings(recordings => [...recordings, recording])
    if (result === undefined) {
      setResult({
        numPages: recording.numPages,
        acts: recording.acts.map(actOld => ({
          actNumber: actOld.actNumber,
          startPosition: actOld.startPosition,
          expectedLength: {
            type: "NotCalculated",
            predictedLength: 0,
          },
          scenes: actOld.scenes.map(sceneOld => ({
            sceneNumber: sceneOld.sceneNumber,
            startPosition: sceneOld.startPosition,
            expectedLength: {
              type: "NotCalculated",
              predictedLength: 0,
            },
            elements: sceneOld.elements.map((elementOld) => ({
              position: elementOld.position,
              str: elementOld.str,
              expectedLength: {
                type: "NotCalculated",
                predictedLength: 0,
              }
            }))
          }))
        }))
      });
    }
  }

  const recalculateResult = useCallback(() => {
    setResult(resultOld => {
      let averageSum = 0;
      let averageCount = 0;
      if (resultOld === undefined) return undefined;
      return ({
        ...resultOld,
        acts: resultOld.acts.map((act, actIndex) => {
          let newActTotal = 0;
          const nextActPosition = (resultOld.acts[actIndex + 1]?.startPosition ?? resultOld.numPages)
          act.scenes = act.scenes.map((scene, sceneIndex) => {
            let newSceneTotal = 0;
            let scenePure = true;
            const nextScenePosition = (act.scenes[sceneIndex + 1]?.startPosition ?? nextActPosition)
            scene.elements = scene.elements.map((element, elementIndex) => {
              const nextElementPosition = (scene.elements[(elementIndex + 1)]?.position ?? nextScenePosition)
              // console.log(element.position, nextElementPosition)
              if (element.expectedLength.type !== "Customised") {
                let calculatedLengthSum = 0;
                let recordingContributeCount = 0;
                recordings.forEach((recording) => {
                  let recordingExpected = recording.acts[actIndex].scenes[sceneIndex].elements[elementIndex].expectedLength;
                  if (recordingExpected.type !== "NotCalculated") {
                    calculatedLengthSum += recordingExpected.predictedLength;
                    recordingContributeCount++;
                  }
                })
                if (recordingContributeCount !== 0 && calculatedLengthSum !== 0) {
                  element.expectedLength = {
                    predictedLength: calculatedLengthSum / recordingContributeCount,
                    type: "CalculatedAverage"
                  };
                } else if (averageCount !== 0) {
                  let scriptLength = nextElementPosition - element.position;
                  scenePure = false;
                  // console.log(scriptLength, (averageSum / averageCount), scriptLength * (averageSum / averageCount));
                  element.expectedLength = {
                    predictedLength: scriptLength * (averageSum / averageCount),
                    type: "Interpolate"
                  };
                }
              }
              newSceneTotal += element.expectedLength.predictedLength;
              if (sceneIndex === 0 && actIndex === 0) {
                console.log(elementIndex, newSceneTotal, element.expectedLength.predictedLength);
              } 
              return element;
            })
            scene.expectedLength = {
              type: "Sum",
              predictedLength: newSceneTotal
            }
            newActTotal += newSceneTotal;
            if (scenePure) {
              const sceneLength = nextScenePosition - scene.startPosition;
              averageSum += newSceneTotal / sceneLength;
              averageCount++;
              console.log(averageCount, averageSum / averageCount, newSceneTotal / sceneLength);
            }
            return scene
          })
          act.expectedLength = {
            type: "Sum",
            predictedLength: newActTotal
          }
          return act
        }),
      })
    });
  }, [recordings]);

  useEffect(() => {
    recalculateResult();


  }, [recalculateResult]);

  const rows: {
    type: "Act" | "Scene" | "Element";
    actNumber: number;
    sceneNumber?: number;
    elementNumber?: number;
    label: string;
    calculatedValue: ExpectedLength
    recordingData: ExpectedLength[]
  }[] = [];

  if (result !== undefined) {
    result.acts.forEach(act => {
      rows.push({
        type: "Act",
        label: `Act ${act.actNumber}`,
        calculatedValue: act.expectedLength,
        recordingData: [],
        actNumber: act.actNumber,
      })
      act.scenes.forEach(scene => {
        rows.push({
          type: "Scene",
          label: `Scene ${scene.sceneNumber}`,
          calculatedValue: scene.expectedLength,
          recordingData: [],
          actNumber: act.actNumber,
          sceneNumber: scene.sceneNumber,
        })
        scene.elements.forEach((element, index) => {
          rows.push({
            type: "Element",
            label: element.str,
            calculatedValue: element.expectedLength,
            recordingData: [],
            actNumber: act.actNumber,
            sceneNumber: scene.sceneNumber,
            elementNumber: index
          })
        })
      })
    })
    if (recordings.length > 0) {
      recordings.forEach((recording) => {
        let currentIndex = 0;
        recording.acts.forEach((act) => {
          rows[currentIndex].recordingData.push(act.expectedLength);
          currentIndex++;
          act.scenes.forEach(scene => {
            rows[currentIndex].recordingData.push(scene.expectedLength);
            currentIndex++;
            scene.elements.forEach((element) => {
              rows[currentIndex].recordingData.push(element.expectedLength);
              currentIndex++;
            })
          })
        })
      })
    }
  }

  // const calculateRowValue = (rowIndex) => {

  // }

  const changeCalculated = (rowIndex: number, e: ChangeEvent<HTMLInputElement>) => {
    console.log(rows[rowIndex], e.target.value);
    setResult(result => {
      if (result === undefined) return undefined;
      const acts = result.acts.map(act => {
        if (act.actNumber === rows[rowIndex].actNumber) {
          act.scenes = act.scenes.map(scene => {
            if (scene.sceneNumber === rows[rowIndex].sceneNumber) {
              console.log(scene);
              const element = scene.elements.find((element, index) => index === rows[rowIndex].elementNumber);
              if (element === undefined) {
                console.error("Could not find element");
                return scene;
              }
              element.expectedLength.type = "Customised";
              element.expectedLength.textValue = e.target.value;
              element.expectedLength.predictedLength = isNaN(parseInt(e.target.value) * 1000) ? 0 : (parseInt(e.target.value) * 1000);
            }
            return scene;
          })
        }
        return act;
      })
      return {
        numPages: result.numPages,
        acts: acts
      };
    })
    recalculateResult();
  }

  const millsToText = (mills: number) => {
    mills = Math.round(mills / 1000);
    let output = ""
    if (mills >= 60) {
      output += `${Math.floor(mills / 60)}m `;
    }
    output += `${mills % 60}s`
    return output;
  }

  return (
    <div>
      <AddRecording addRecording={onAddRecording} />
      <div style={{
        overflowY: "scroll",
        height: "80vh"
      }}>
        <table>
          <colgroup>
            <col span={1} style={{ width: 200 }} />
            <col span={1} style={{ width: 60 }} />
            {(new Array(recordings.length).map(() => (
              <col span={1} style={{ width: 60 }} />
            )))}
          </colgroup>
          <thead>
            <tr>
              <td>Element</td>
              <td>Prediction</td>
              {recordings.map((recording, index) => (
                <td>{index}</td>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              if (row.type === "Element") {
                return (
                  <tr>
                    <td style={{ width: 200, paddingLeft: 60 }}>{row.label}</td>
                    <td
                      style={{
                        backgroundColor: row.calculatedValue.type === "Customised" ? "#ffbda8" : "#a8caff",
                        width: 60
                      }}
                    ><input style={{
                      width: 30,
                      backgroundColor: row.calculatedValue.type === "Customised" ? "#ffbda8" : "#a8caff"
                    }} type="text" value={row.calculatedValue.textValue ?? Math.round(row.calculatedValue.predictedLength / 1000)} onChange={e => changeCalculated(index, e)} />s</td>
                    {row.recordingData.map((expectedLength) => (
                      <td
                        style={{
                          backgroundColor: expectedLength.type === "CalculatedMerge" ? "#a8ffe5" : "#a8caff",
                          width: 60
                        }}>
                        {millsToText(expectedLength.predictedLength)}
                      </td>
                    ))}
                  </tr>
                )
              } else if (row.type === "Scene") {
                return (
                  <tr>
                    <td style={{ width: 200, paddingLeft: 30 }}>{row.label}</td>
                    <td
                      style={{
                        backgroundColor: row.calculatedValue.type === "Customised" ? "#ffbda8" : "#a8caff",
                        width: 60
                      }}
                    >{millsToText(row.calculatedValue.predictedLength)}</td>
                    {row.recordingData.map((expectedLength) => (
                      <td
                        style={{
                          backgroundColor: expectedLength.type === "CalculatedMerge" ? "#a8ffe5" : "#a8caff",
                          width: 60
                        }}>
                      </td>
                    ))}
                  </tr>
                )
              } else {
                return (
                  <tr>
                    <td style={{ width: 200, paddingLeft: 0 }}>{row.label}</td>
                    <td
                      style={{
                        backgroundColor: row.calculatedValue.type === "Customised" ? "#ffbda8" : "#a8caff",
                        width: 60
                      }}
                    >{millsToText(row.calculatedValue.predictedLength)}</td>
                    {row.recordingData.map((expectedLength) => (
                      <td
                        style={{
                          backgroundColor: expectedLength.type === "CalculatedMerge" ? "#a8ffe5" : "#a8caff",
                          width: 60
                        }}>
                      </td>
                    ))}
                  </tr>
                )
              }
            })}
          </tbody>
        </table>
      </div>
      <div>
            <textarea value={JSON.stringify(result) ?? ""}></textarea>
      </div>
    </div>
  )
}
