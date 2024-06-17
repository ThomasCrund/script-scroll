import React, { TouchEvent, useEffect, useState, WheelEvent } from "react";
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import { socket } from '../socket';
import { ScrollInformation, ScrollMode, ScrollUpdate } from "../../../interface/Scroll";
import PdfViewer from "./PdfViewer";
import OverviewBar from "./OverviewBar";
import { Script } from "../../../interface/Script";
import CursorLine from "./CursorLine";

export interface ScrollData {
    scrollPosition: number;
    timeStampClient: number;
    timeStampServer?: number;
    clientDriving: boolean;
    sentToServer?: boolean;
}

function ScrollWindow() {

    const [latestServerScrollInformation, setLatestScrollInformation] = useState<ScrollInformation | undefined>(undefined);
    const [clientCurrentScrollPosition, setCurrentScrollPosition] = useState<ScrollData>({ scrollPosition: 0, timeStampClient: Date.now(), clientDriving: false });
    const [scrollControlMode, setControlScrollMode] = useState<ScrollMode>("Following");
    const [lastSentUpdate, setLastSentUpdate] = useState<ScrollUpdate | undefined>();
    const [scriptBreakup, setScriptBreakup] = useState<Script>({ numPages: 0, acts: [] });
    const [scriptFIle, setScriptFIle] = useState<string>("normal");
    const [touchId, setTouchId] = useState({ id: -1, yLast: 0 });
    const pageHeight = 1000;
    const offset = 400;

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

    const touchStart = (e: globalThis.TouchEvent) => {
        console.log("touchStart", e);
        setTouchId({ id: e.touches[0].identifier, yLast: e.touches[0].pageY });
    }

    const touchEnd = () => {
        setTouchId({ id: -1, yLast: 0 });
    }

    const touchMove = (e: globalThis.TouchEvent) => {
        if (touchId.id !== -1) {
            const delta = e.touches[0].pageY - touchId.yLast
            console.log(touchId, delta)
            setPosition(clientCurrentScrollPosition.scrollPosition - delta / pageHeight)
            setTouchId(touch => ({ id: touch.id, yLast: e.touches[0].pageY }));
        }
    }

    useEffect(() => {
        window.addEventListener('touchend', touchEnd);
        window.addEventListener('touchmove', touchMove)
        window.addEventListener('touchstart', touchStart)
        return () => {
            window.removeEventListener('touchend', touchEnd);
            window.removeEventListener('touchmove', touchMove);
            window.removeEventListener('touchstart', touchStart)
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
            setCurrentScrollPosition({ sentToServer: false, ...newScrollPosition });
            return;
        }

        // Send all updates to server and update state 
        socket.emit("scrollUpdate", scrollUpdate);
        setCurrentScrollPosition({ sentToServer: true, ...newScrollPosition });
        setLastSentUpdate(scrollUpdate);
    }

    let changeScriptFile = () => {
        setScriptFIle(fileName => {
            if (fileName === "normal") return "sound";
            if (fileName === "sound") return "lighting";
            if (fileName === "lighting") return "normal";
            return "normal"
        })
    }

    let changeControlMode = () => {
        switch (scrollControlMode) {
            case "Driving":
                setControlScrollMode("Following");
                break;
            case "Inspecting":
                returnToMaster()
                break;
            case "Following":
                setControlScrollMode("Driving");
                break;

            default:
                break;
        }
    }

    let redPosition = clientCurrentScrollPosition.scrollPosition;
    if (latestServerScrollInformation !== undefined && scrollControlMode !== "Driving") {
        redPosition = latestServerScrollInformation.master.scrollPosition ?? redPosition
    }

    return (
        <div>
            <div style={{
                display: "flex"
            }}>
                <div
                    style={{
                        border: "0px",
                        height: "100%",
                        width: 200,
                        cursor: "pointer",
                        fontSize: 25,
                        zIndex: 101,
                        padding: 10,
                        userSelect: "none",
                        marginLeft: 2,
                        backgroundColor: "#f9e6ff",
                    }}
                    onClick={changeScriptFile}>
                    Script: {scriptFIle}
                </div>
                <div
                    style={{
                        border: "0px",
                        height: "100%",
                        width: 150,
                        cursor: "pointer",
                        fontSize: 25,
                        zIndex: 101,
                        padding: 10,
                        userSelect: "none",
                        marginLeft: 2,
                        backgroundColor: scrollControlMode === "Driving" ? "red" : (scrollControlMode === "Inspecting" ? "orange" : "#ffc9c9"),
                    }}
                    onClick={changeControlMode}
                >
                    {scrollControlMode}
                </div>
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
                    scrollInformation={latestServerScrollInformation}
                    scrollMode={scrollControlMode}
                />
                <div
                    className="scrollable-element"
                    style={{
                        height: "100vh",
                        overflowY: "hidden",
                        border: `2px solid ${scrollControlMode === "Driving" ? "red" : (scrollControlMode === "Inspecting" ? "orange" : "black")}`,
                        width: 800,
                        position: "relative"
                    }}
                >
                    <PdfViewer
                        pageHeight={pageHeight}
                        handleScroll={handleScroll}
                        scrollPosition={clientCurrentScrollPosition}
                        offset={offset}
                        pdfFileName={"./" + scriptFIle + ".pdf"}
                    />
                    <CursorLine setPosition={redPosition} scrollPosition={clientCurrentScrollPosition} offset={offset} colour="Red" pageHeight={pageHeight} lineWidth={4} />
                    {scrollControlMode === "Inspecting" ?
                        <CursorLine setPosition={clientCurrentScrollPosition.scrollPosition} scrollPosition={clientCurrentScrollPosition} offset={offset} colour="Orange " pageHeight={pageHeight} lineWidth={4} />
                        : null
                    }
                    <div
                        style={{
                            position: "absolute",
                            top: 0,
                            right: 0
                        }}
                    >
                    </div>
                </div>
            </div>

        </div>
    );
}

export default ScrollWindow;