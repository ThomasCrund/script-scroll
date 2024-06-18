import React, { useEffect, useState } from 'react'
import ScrollWindow from './scroll/ScrollWindow';
import { socket } from './socket';
import { Script } from '../../interface/Script';

export default function Admin() {
  const [ name, setName ] = useState("Recording1");
  const [scriptBreakup, setScriptBreakup] = useState<Script>({ numPages: 0, acts: [] });
    
  useEffect(() => {

    function onScriptUpdate(script: Script) {
      console.log(script);
      setScriptBreakup(script);
    }

    socket.on('scriptBreakup', onScriptUpdate);
    socket.emit('joinAdminDisplayRoom');

    return () => {
        socket.off('scriptBreakup', onScriptUpdate);
    };
  })

  return (
    <div style={{
      display: "flex"
    }}>
      <ScrollWindow />
      <div>
        <div>
          <div>
            <span>
              Show name 
              <input type="text" value={name} onChange={e => setName(e.target.value)} />
            </span>
            <div>
              <div onClick={() => socket.emit("recordingStart")}>Start Recording</div>
              <div onClick={() => socket.emit("recordingStop")}>Stop Recording</div>
            </div>
          </div>
        </div>
        <div style={{
          overflowY: "scroll",
          border: "1px solid black", 
          width: 600
        }}>
          {/* <table>
            <tr>
              <td>Act</td>
              <td>Scene</td>
              <td>Element</td>
              <td>Start Time</td>
              <td>Length</td>
            </tr>
            <tr>
              <td>1</td>
              <td>2</td>
              <td>Ancestors</td>
              <td>7:32 pm</td>
              <td>5s</td>
            </tr>
          </table> */}
          <div>
            {JSON.stringify(scriptBreakup)}
          </div>
        </div>
      </div>
    </div>
  )
}
