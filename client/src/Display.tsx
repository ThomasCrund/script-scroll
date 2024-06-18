import React, { useEffect, useState } from 'react'
import { ScriptPosition } from '../../interface/Script';
import { socket } from './socket';

export default function Display() {
  const [ scriptPosition, setScriptPosition] = useState<ScriptPosition>({ actNumber: 0, sceneNumber: 0, elementNumber: 0, scrollPosition: 0, timestamp: Date.now() });

  
  useEffect(() => {
    function onScriptPosition(position: ScriptPosition) {
      setScriptPosition(position);
    }

    socket.on('scriptPosition', onScriptPosition);
    socket.emit('joinAdminDisplayRoom');

    return () => {
      socket.off('scriptPosition', onScriptPosition);
    };
  }, []);


  return (
    <div>
      <div></div> 
      <div style={{
        position: "absolute",
        right: 40,
        top: 40,
        fontSize: 50
      }}>
        <div>Act: {scriptPosition.actNumber}</div>
        <div>Scene: {scriptPosition.sceneNumber}</div>
      </div>
    </div>
  )
}
