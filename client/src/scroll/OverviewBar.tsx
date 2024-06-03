import React, { MouseEvent, useRef, useState } from 'react'
import { ScrollData } from './ScrollWindow'
import { Act, Script } from '../../../interface/Script'
import { ScrollInformation, ScrollMode } from '../../../interface/Scroll'

interface OverviewBarProps {
  scrollPosition: ScrollData,
  scriptBreakup: Script
  handleSetPosition: (position: number) => void
  height: number,
  scrollInformation: ScrollInformation | undefined
  scrollMode: ScrollMode
}

export default function OverviewBar({
  scrollPosition,
  height,
  scriptBreakup,
  handleSetPosition,
  scrollInformation,
  scrollMode
}: OverviewBarProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [hoverPos, setHoverPos] = useState(-1);

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

  const calculatePosition = (pagePos: number) => {
    return pagePos * height / ((scriptBreakup.numPages === 0) ? 1 : scriptBreakup.numPages)
  }

  let redPosition = scrollPosition.scrollPosition;
  if (scrollInformation !== undefined && scrollMode !== "Driving") {
    console.log(scrollInformation)
    redPosition = scrollInformation.master.scrollPosition ?? redPosition
  }
  console.log(scriptBreakup.numPages, redPosition)

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
        top: calculatePosition(redPosition)
      }}></div>

      {scrollMode === "Inspecting" ?
        <div style={{
          position: "relative",
          width: 50,
          height: 0,
          borderTop: "1px solid orange",
          borderBottom: "1px solid orange",
          top: calculatePosition(scrollPosition.scrollPosition)
        }}></div> : null}

      <div style={{
        position: "relative",
        width: 50,
        height: 0,
        borderTop: "1px solid green",
        borderBottom: "1px solid green",
        top: calculatePosition(hoverPos)
      }}></div>

      {
        scriptBreakup.acts.map((act, index) => {
          return act.scenes.map((scene, index) => (
            <div
              key={`${act.actNumber}.${scene.sceneNumber}`}
              style={{
                height: calculateHeightOfScene(act, index),
                width: 50,
                borderTop: "1px solid black",
                position: "absolute",
                top: calculatePosition(scene.startPosition)
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
        top: calculatePosition(scriptBreakup.numPages)

      }}>
      </div>
    </div>
  )
}
