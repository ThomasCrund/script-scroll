import React, { KeyboardEvent, useState } from 'react'

export interface AddRecordingProps {
    addRecording: (text: string) => void
}

export default function AddRecording({
  addRecording
}: AddRecordingProps) {
  const [ text, setText ] = useState("");

  const buttonPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "enter") {
      addRecording(text);
    }
  }

  return (
    <div style={{
      display: "flex"
    }}>
        Add Recording
        <textarea value={text} onChange={e => setText(e.target.value)} onKeyDown={buttonPress}></textarea>
        <button onClick={() => addRecording(text)}>Add</button>
    </div>
  )
}
