import React, { useEffect, useState } from 'react';
import { socket } from './socket';
import Sample from './Sample';
import Test from './Test';

function App(): React.JSX.Element {
  const [isConnected, setIsConnected] = useState(socket.connected);
  
  useEffect(() => {
    function onConnect() {
      setIsConnected(true);
    }

    function onDisconnect() {
      setIsConnected(false);
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  return (
    <div className="App">
      Server is {isConnected ? "Connected": "Not Connected"}
      {/* <Sample /> */}
      <Test />
    </div>
  );
}

export default App;
