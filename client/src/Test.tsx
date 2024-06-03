import React, { useEffect, useState, WheelEvent } from "react";
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import { socket } from './socket';
import { ScrollInformation, ScrollMode, ScrollUpdate } from "../../interface/Scroll";
import PdfViewer from "./PdfViewer";

export interface ScrollData {
    scrollPosition: number;
    timeStampClient: number;
    timeStampServer?: number;
    clientDriving: boolean;
    sentToServer?: boolean;
}

function Test() {
    const [scrollInformation, setScrollInformation] = useState<ScrollInformation | undefined>(undefined);
    const [scrollPosition, setScrollPosition] = useState<ScrollData>({scrollPosition: 0, timeStampClient: Date.now(), clientDriving: false});
    const [scrollMode, setScrollMode] = useState<ScrollMode>("Following");
    const [lastSentUpdate, setLastSentUpdate] = useState<ScrollUpdate | undefined>();
    const pageHeight = 1000

    const returnToMaster = () => {
        if (scrollInformation == null) return;
        setScrollMode("Following");
        setScrollPosition({
            scrollPosition: scrollInformation.master.scrollPosition,
            timeStampClient: Date.now(),
            timeStampServer: scrollInformation.master.timeStampServer,
            clientDriving: scrollInformation.master.scrollUpdate?.uid === socket.id
        })
    }

    useEffect(() => {
        function onScrollUpdate(scroll: ScrollInformation) {
            setScrollInformation(scroll);
            if (scrollMode === "Following") {
                setScrollPosition({
                    scrollPosition: scroll.master.scrollPosition,
                    timeStampClient: Date.now(),
                    timeStampServer: scroll.master.timeStampServer,
                    clientDriving: scroll.master.scrollUpdate?.uid === socket.id
                })
            } else if (scrollMode === "Driving") {
                if (scrollPosition.timeStampClient < Date.now() - 100 && !(scroll.master.scrollUpdate?.uid === socket.id)) {
                    setScrollPosition({
                        scrollPosition: scroll.master.scrollPosition,
                        timeStampClient: Date.now(),
                        timeStampServer: scroll.master.timeStampServer,
                        clientDriving: scroll.master.scrollUpdate?.uid === socket.id
                    })
                }

            }
        }
        socket.on('scrollInformation', onScrollUpdate);

        function keyCheck(e: KeyboardEvent) {
            if (e.key === " ") {
                returnToMaster();
            }
        } 
        document.addEventListener("keydown", keyCheck);


        return () => {
            socket.off('scrollInformation', onScrollUpdate);
            document.removeEventListener("keydown", keyCheck);
    };
    })

    const handleScroll = (e: WheelEvent<HTMLDivElement>) => {
        const newScroll = scrollPosition.scrollPosition + e.deltaY / pageHeight;
        let scrollUpdate: ScrollUpdate = {
            timeStampClient: Date.now(),
            scrollMode: scrollMode,
            newScrollPosition: newScroll,
            lastScrollPosition: scrollPosition.scrollPosition,
            lastScrollServerTimeStamp: scrollPosition.timeStampServer ?? 0
        }
        if (scrollUpdate.scrollMode === 'Following') {
            scrollUpdate.scrollMode = 'Inspecting';
            setScrollMode("Inspecting");
        }
        let newScrollPosition = { 
            scrollPosition: newScroll, 
            timeStampClient: scrollUpdate.timeStampClient,
            clientDriving: true
        }
        if (lastSentUpdate?.timeStampClient !== undefined && lastSentUpdate?.timeStampClient + 100 >= scrollUpdate.timeStampClient) {
            console.log("Skipped Update");
            setScrollPosition({ sentToServer: false, ...newScrollPosition});
            return;
        }
        socket.emit("scrollUpdate", scrollUpdate);
        setScrollPosition({ sentToServer: false, ...newScrollPosition });
        setLastSentUpdate(scrollUpdate);

        // setScrollPosition(position);
    };

    return (
        <div>
            <div>
                <button onClick={e => setScrollMode(mode => mode === "Driving" ? "Following" : "Driving")}>Control Mode: {scrollMode}</button>
            </div>
            <div
                className="scrollable-element"
                style={{
                    height: "100vh",
                    overflowY: "hidden",
                    border: "1px solid #ccc",
                    width: 800,
                    position: "relative"
                }}
                onWheel={handleScroll}
            >
                <PdfViewer pageHeight={pageHeight} handleScroll={handleScroll} scrollPosition={scrollPosition} />
            </div>
        </div>
    );
}

export default Test;