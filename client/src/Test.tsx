import React, { useEffect, useState, WheelEvent } from "react";
import { pdfjs, Document, Page } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { socket } from './socket';
import { ScrollInformation, ScrollMode, ScrollUpdate } from "../../interface/Scroll";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.js',
    import.meta.url,
).toString();

const options = {
    cMapUrl: '/cmaps/',
    standardFontDataUrl: '/standard_fonts/',
};

interface ScrollData {
    scrollPosition: number;
    timeStampClient: number;
    timeStampServer?: number;
    clientDriving: boolean;
    sentToServer?: boolean;
}

function Test() {
    const [scrollPosition, setScrollPosition] = useState<ScrollData>({scrollPosition: 0, timeStampClient: Date.now(), clientDriving: false});
    const [scrollMode, setScrollMode] = useState<ScrollMode>("Following");
    const [lastSentUpdate, setLastSentUpdate] = useState<ScrollUpdate | undefined>();

    useEffect(() => {
        function onScrollUpdate(scroll: ScrollInformation) {
            console.log(scroll);
            console.log(socket);
            if (scrollMode === "Following") {
                setScrollPosition({
                    scrollPosition: scroll.master.scrollPosition,
                    timeStampClient: Date.now(),
                    timeStampServer: scroll.master.timeStampServer,
                    clientDriving: scroll.master.scrollUpdate?.uid === socket.id
                })
            } else if (scrollMode === "Driving") {
                console.log(scrollPosition.timeStampClient, Date.now(), scroll.master.scrollUpdate?.uid === socket.id);
                if (scrollPosition.timeStampClient < Date.now() - 100 && !(scroll.master.scrollUpdate?.uid === socket.id)) {
                    console.log("update")
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

        return () => {
            socket.off('scrollInformation', onScrollUpdate);
        };
    })

    function onDocumentLoadSuccess(proxy: PDFDocumentProxy): void {
        console.log("number of pages", proxy.numPages);
    }

    const handleScroll = (e: WheelEvent<HTMLDivElement>) => {
        const newScroll = scrollPosition.scrollPosition + e.deltaY;
        let scrollUpdate: ScrollUpdate = {
            timeStampClient: Date.now(),
            scrollMode: scrollMode,
            newScrollPosition: newScroll,
            lastScrollPosition: scrollPosition.scrollPosition,
            lastScrollServerTimeStamp: scrollPosition.timeStampServer ?? 0
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
        setScrollPosition(scrollPosition => {
            console.log(scrollUpdate.timeStampClient);
            socket.emit("scrollUpdate", scrollUpdate);
            console.log(newScroll);
            return { sentToServer: false, ...newScrollPosition };
        });
        setLastSentUpdate(scrollUpdate);

        // setScrollPosition(position);
    };

    const getOffsetForPage = (pageNumber: number) => {
        console.log(scrollPosition.scrollPosition);
        return -(scrollPosition.scrollPosition - (pageNumber * 1035.290))
    }

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
                <Document file={'./sample.pdf'} onLoadSuccess={onDocumentLoadSuccess} options={options}>
                    {Array.from(new Array(5), (el, index) => (
                        <div key={`page_${index + 1}`} style={{ width: 800, position: "absolute", top: getOffsetForPage(index) }}>
                            <Page

                                pageNumber={index + 1}
                                width={800}
                            />

                        </div>
                    ))}
                </Document>
            </div>
        </div>
    );
}

export default Test;