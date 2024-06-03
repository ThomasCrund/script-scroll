import React, { useEffect, useState, WheelEvent } from "react";
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import { socket } from '../socket';
import { ScrollInformation, ScrollMode, ScrollUpdate } from "../../../interface/Scroll";
import PdfViewer from "./PdfViewer";
import OverviewBar from "./OverviewBar";
import { Script } from "../../../interface/Script";

export interface ScrollData {
    scrollPosition: number;
    timeStampClient: number;
    timeStampServer?: number;
    clientDriving: boolean;
    sentToServer?: boolean;
}

function ScrollWindow() {
    
    const [latestServerScrollInformation, setLatestScrollInformation] = useState<ScrollInformation | undefined>(undefined);
    const [clientCurrentScrollPosition, setCurrentScrollPosition] = useState<ScrollData>({scrollPosition: 0, timeStampClient: Date.now(), clientDriving: false});
    const [scrollControlMode, setControlScrollMode] = useState<ScrollMode>("Following");
    const [lastSentUpdate, setLastSentUpdate] = useState<ScrollUpdate | undefined>();
    const [scriptBreakup, setScriptBreakup] = useState<Script>({numPages: 0, acts: []});
    const pageHeight = 1000

    // Return to following mode
    const returnToMaster = () => {
        if (latestServerScrollInformation == null) return;
        setControlScrollMode("Following");
        setCurrentScrollPosition({
            scrollPosition: latestServerScrollInformation.master.scrollPosition,
            timeStampClient: Date.now(),
            timeStampServer: latestServerScrollInformation.master.timeStampServer,
            clientDriving: latestServerScrollInformation.master.scrollUpdate?.uid === socket.id
        })
    }

    // Handle incoming scroll updates from the server 
    useEffect(() => {
        function onScrollUpdate(scroll: ScrollInformation) {
            setLatestScrollInformation(scroll);
            if (scrollControlMode === "Following") {
                setCurrentScrollPosition({
                    scrollPosition: scroll.master.scrollPosition,
                    timeStampClient: Date.now(),
                    timeStampServer: scroll.master.timeStampServer,
                    clientDriving: scroll.master.scrollUpdate?.uid === socket.id
                })
            } else if (scrollControlMode === "Driving") {
                if (clientCurrentScrollPosition.timeStampClient < Date.now() - 100 && !(scroll.master.scrollUpdate?.uid === socket.id)) {
                    setCurrentScrollPosition({
                        scrollPosition: scroll.master.scrollPosition,
                        timeStampClient: Date.now(),
                        timeStampServer: scroll.master.timeStampServer,
                        clientDriving: scroll.master.scrollUpdate?.uid === socket.id
                    })
                }

            }
        }

        function onScriptUpdate(script: Script) {
            console.log(script);
            setScriptBreakup(script);
        }
        
        socket.on('scrollInformation', onScrollUpdate);
        socket.on('scriptBreakup', onScriptUpdate);

        return () => {
            socket.off('scrollInformation', onScrollUpdate);
            socket.off('scriptBreakup', onScriptUpdate);
        };
    })

    // Connect key binds
    useEffect(() => {
        function keyCheck(e: KeyboardEvent) {
            if (e.key === " ") {
                returnToMaster();
            }
        } 
        document.addEventListener("keydown", keyCheck);

        return () => {
            document.removeEventListener("keydown", keyCheck);   
        }
    })

    // Handle Scroll information from the user
    const handleScroll = (e: WheelEvent<HTMLDivElement>) => {

        // Calculate new scroll position
        const newScroll = clientCurrentScrollPosition.scrollPosition + e.deltaY / pageHeight;

        setPosition(newScroll)

    };

    const setPosition = (position: number) => {
        
        // create update to send to server
        let scrollUpdate: ScrollUpdate = {
            timeStampClient: Date.now(),
            scrollMode: scrollControlMode,
            newScrollPosition: position,
            lastScrollPosition: clientCurrentScrollPosition.scrollPosition,
            lastScrollServerTimeStamp: clientCurrentScrollPosition.timeStampServer ?? 0
        }

        // If User was following and they scroll, change them to inspecting
        if (scrollUpdate.scrollMode === 'Following') {
            scrollUpdate.scrollMode = 'Inspecting';
            setControlScrollMode("Inspecting");
        }

        // Create new position for client side state (this will update PdfViewer component and other scrolling components)
        let newScrollPosition = { 
            scrollPosition: position, 
            timeStampClient: scrollUpdate.timeStampClient,
            clientDriving: true
        }

        // Check whether a update was recently and skip if needed to reduce network traffic when not needed
        if (lastSentUpdate?.timeStampClient !== undefined && lastSentUpdate?.timeStampClient + 100 >= scrollUpdate.timeStampClient) {
            console.log("Skipped Update");
            setCurrentScrollPosition({ sentToServer: false, ...newScrollPosition});
            return;
        }

        // Send all updates to server and update state 
        socket.emit("scrollUpdate", scrollUpdate);
        setCurrentScrollPosition({ sentToServer: true, ...newScrollPosition });
        setLastSentUpdate(scrollUpdate);
    }

    return (
        <div>
            <div>
                <button onClick={e => setControlScrollMode(mode => mode === "Driving" ? "Following" : "Driving")}>Control Mode: {scrollControlMode}</button>
            </div>
            <div
                style={{
                    height: "100vh",
                    overflowY: "hidden",
                    display: "flex"
                }}
                onWheel={handleScroll}
            >
                <OverviewBar 
                    scrollPosition={clientCurrentScrollPosition} 
                    height={700} 
                    scriptBreakup={scriptBreakup} 
                    handleSetPosition={setPosition}
                />
                <div
                    className="scrollable-element"
                    style={{
                        height: "100vh",
                        overflowY: "hidden",
                        border: "1px solid #ccc",
                        width: 800,
                        position: "relative"
                    }}
                >
                    <PdfViewer pageHeight={pageHeight} handleScroll={handleScroll} scrollPosition={clientCurrentScrollPosition} />
                </div>
            </div>
            
        </div>
    );
}

export default ScrollWindow;