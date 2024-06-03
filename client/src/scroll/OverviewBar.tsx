import React, { MouseEvent, useRef, useState } from 'react'
import { ScrollData } from './ScrollWindow'
import { Act, Script } from '../../../interface/Script'

interface OverviewBarProps {
    scrollPosition: ScrollData,
    scriptBreakup: Script
    handleSetPosition: (position: number) => void
    height: number
}

export default function OverviewBar({
    scrollPosition,
    height,
    scriptBreakup,
    handleSetPosition
}: OverviewBarProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [ hoverPos, setHoverPos ] = useState(-1);

  const calculateHeightOfScene = (act: Act, sceneIndex: number): number => {
    const lengthOfAct = (act.scenes[sceneIndex + 1]?.startPosition ?? scriptBreakup.numPages) - act.scenes[sceneIndex].startPosition
    return lengthOfAct * height / scriptBreakup.numPages
  }

  const hoverCallback = (e: MouseEvent<HTMLDivElement>) => {
    if (ref.current == null) {
      console.error("ref not working");
      return;
    }
    const box = ref.current.getBoundingClientRect();
    const pos = e.clientY - box.y;
    setHoverPos(pos * scriptBreakup.numPages / height)
  }

  return (
    <div
      style={{
        width: 50,
        border: "1px solid black",
        borderBottom: "0px solid black",
        fontSize: 12,
        position: "relative",
        cursor: "pointer",
        userSelect: "none"
      }}
      ref={ref}
      onMouseMove={hoverCallback}
      onMouseLeave={() => setHoverPos(-1)}
      onClick={() => handleSetPosition(hoverPos)}
    >
      <div style={{
        position: "relative",
        width: 50,
        height: 0,
        borderTop: "1px solid red",
        borderBottom: "1px solid red",
        top: scrollPosition.scrollPosition * height / scriptBreakup.numPages
      }}></div>

      <div style={{
        position: "relative",
        width: 50,
        height: 0,
        borderTop: "1px solid green",
        borderBottom: "1px solid green",
        top: hoverPos * height / scriptBreakup.numPages
      }}></div>

      {
        scriptBreakup.acts.map((act, index) => {
          return act.scenes.map((scene, index) => (
            <div
              style={{
                height: calculateHeightOfScene(act, index),
                width: 50,
                borderTop: "1px solid black",
                position: "absolute",
                top: scene.startPosition * height / scriptBreakup.numPages
              }}
            >
              Scene {scene.sceneNumber}
            </div>
          ))
        })
      }
      <div style={{
            width: 50,
            height: 0,
            borderTop: "1px solid black",
            position: "absolute",
            top: scriptBreakup.numPages * height / scriptBreakup.numPages

          }}>
      </div>
    </div>
  )
}
