import React from 'react'
import { ScrollData } from './ScrollWindow'

interface CursorLineProps {
  scrollPosition: ScrollData
  setPosition: number
  offset: number
  colour: string
  lineWidth?: number
  pageHeight: number
}

export default function CursorLine({
  scrollPosition,
  setPosition,
  offset,
  colour,
  lineWidth = 2,
  pageHeight
}: CursorLineProps) {

  const getOffsetForPage = (position: number) => {
    return offset -((scrollPosition.scrollPosition - position) * pageHeight)
  }

  return (
    <div style={{
      position: "absolute",
      width: "100%",
      height: 0,
      borderTop: `${lineWidth/2}px solid ${colour}`,
      borderBottom: `${lineWidth/2}px solid ${colour}`,
      top: getOffsetForPage(setPosition),
      transition: scrollPosition.clientDriving ? "top 0.05s" : "top 0.2s"
    }}></div>
  )
}
