import React, { useEffect, useState } from 'react'
import { Scene, Script, ScriptPosition } from '../../interface/Script';
import { socket } from './socket';
import { time } from 'console';

interface SceneToShow {
  scene: Scene
  timeRemaining: number | undefined
};

export default function Display() {
  const [scriptPosition, setScriptPosition] = useState<ScriptPosition>({ actNumber: 0, sceneNumber: 0, elementNumber: 0, scrollPosition: 0, timestamp: Date.now() });
  const [scriptBreakup, setScriptBreakup] = useState<Script>({ numPages: 0, acts: [] });
  const [scenesToShow, setScenesToShow] = useState<SceneToShow[]>([]);
  const [startTime, setStartTime] = useState<{ timeRemaining: number, event: string } | null>(null);
  const [name, setName] = useState("");
  const [time, setTime] = useState("");

  useEffect(() => {
    function onScriptPosition(position: ScriptPosition) {
      setScriptPosition(position);
      console.log("On Position");
    }

    function onScriptUpdate(script: Script) {
      console.log(script);
      setScriptBreakup(script);
    }

    socket.on('scriptPosition', onScriptPosition);
    socket.on('scriptBreakup', onScriptUpdate);
    socket.emit('joinAdminDisplayRoom');

    return () => {
      socket.off('scriptPosition', onScriptPosition);
      socket.off('scriptBreakup', onScriptUpdate);
    };
  }, []);

  useEffect(() => {
    const scenesToShowNew: SceneToShow[] = []
    let currentScene = scriptBreakup.acts.find((act) => act.actNumber === scriptPosition.actNumber)
      ?.scenes.find(scene => scene.sceneNumber === scriptPosition.sceneNumber);
    let i = 0;
    let previousTimeRemaining = 0;
    while (currentScene !== undefined && i <= 8) {
      console.log(currentScene);

      scenesToShowNew.push({
        scene: currentScene,
        timeRemaining: previousTimeRemaining
      })
      let timeRemaining = previousTimeRemaining + (currentScene?.expectedLength?.predictedLength ?? 0);
      if (scriptPosition.sceneNumber === currentScene.sceneNumber) {
        currentScene.elements.forEach((element, index) => {
          if (index < scriptPosition.elementNumber) {
            if (element.expectedLength === undefined) {
              console.error("Some elements don't have predictions");
              return;
            }
            timeRemaining -= element.expectedLength?.predictedLength;
          }
        })
        i++
      }
      previousTimeRemaining = timeRemaining;
      const currentSceneNumber = currentScene.sceneNumber;
      currentScene = scriptBreakup.acts.find((act) => act.actNumber === scriptPosition.actNumber)
        ?.scenes.find(scene => scene.sceneNumber === currentSceneNumber + 1);
      i++;
    }
    setScenesToShow(scenesToShowNew);
  }, [scriptBreakup, scriptPosition]);

  useEffect(() => {
    const interval = setInterval(() => {
      setScenesToShow(scenesToShow => {
        console.log("update time");
        return scenesToShow.map((scenesToShow, index) => {
          if (index === 0) return scenesToShow;
          if (scenesToShow.timeRemaining === undefined) return scenesToShow;
          scenesToShow.timeRemaining -= 1000;
          return scenesToShow;
        })
      });
      setStartTime(currentCountdown => {
        if (currentCountdown === null) return null;
        const newTime = currentCountdown.timeRemaining - 1000;
        if (newTime < 0) return null;
        return {
          event: currentCountdown.event,
          timeRemaining: (currentCountdown.timeRemaining - 1000)
        }
      })
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const millsToText = (mills: number) => {
    mills = Math.round(mills / 1000);
    let output = ""
    if (mills >= 60) {
      output += `${Math.floor(mills / 60)}m `;
    }
    output += `${mills % 60}s`
    return output;
  }

  const startEvent = () => {
    setStartTime({
      timeRemaining: parseInt(time) * 60 * 1000,
      event: name
    })
  }

  return (
    <div style={{
      backgroundColor: 'black',
      width: "100vw",
      height: "100vh"
    }}>
      <div style={{
        color: "white"
      }}>
        Start Event
        <input value={name} onChange={e => setName(e.target.value)}/>
        in
        <input value={time} onChange={e => setTime(e.target.value)} />
        minutes
        <input type="button" value="Submit" onClick={startEvent} />
        <input type="button" value="Remove" onClick={() => setStartTime(null)} />
      </div>
      <div style={{
        position: "absolute",
        right: 0,
        top: 0,
        color: "white",
        fontSize: 20
      }}>
        {startTime === null ? (
          <table className='display'>
            <tbody>
            {scenesToShow.map((scenesToShow, index) => (
              <tr>
                <td >{index === 0 ? "Current Scene:" : ""}</td>
                <td className='bordered'>Act: {scriptPosition.actNumber}</td>
                <td className='bordered'>Scene: {scenesToShow.scene.sceneNumber}</td>
                <td className={(scenesToShow.timeRemaining ?? 0) === 0 ? "" : "bordered"}>{(scenesToShow.timeRemaining ?? 0) === 0 ? "Time Till Scene" : millsToText(scenesToShow.timeRemaining ?? 0)}</td>
              </tr>
            ))}
            </tbody>
          </table>
        ) : (
          <div style={{
            display: "flex",
            flexDirection: 'column',
            alignItems: "center",
            justifyContent: "center",
            margin: 40
          }}>
            <h1>{startTime.event}</h1>
            <h3>Time Remaining: {millsToText(startTime.timeRemaining)}</h3>
          </div>
        )}
      </div>
    </div>
  )
}
