import React, { useEffect, useState, WheelEvent } from "react";
import { pdfjs, Document, Page } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { socket } from './socket';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.js',
  import.meta.url,
).toString();

const options = {
    cMapUrl: '/cmaps/',
    standardFontDataUrl: '/standard_fonts/',
  };

function Test() {
    const [scrollPosition, setScrollPosition] = useState(0);

    useEffect(() => {
        function onScrollUpdate(scroll: Object) {
            console.log(scroll);
            // @ts-ignore
            setScrollPosition(scroll.master)
        }
        socket.on('scroll', onScrollUpdate);

        return () => {
        socket.off('scroll', onScrollUpdate);
        };
    })

    function onDocumentLoadSuccess(proxy: PDFDocumentProxy): void {
        console.log("number of pages", proxy.numPages);
    }

    const handleScroll = (e: WheelEvent<HTMLDivElement>) => {
        setScrollPosition(scrollPosition => {
            const newScroll = scrollPosition + e.deltaY;
            socket.emit("scroll", newScroll);
            console.log(newScroll);
            return newScroll;
        });
        

        // setScrollPosition(position);
    };
 
    return (
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
                    <div key={`page_${index + 1}`} style={{ width: 800, position: "absolute", top: -(scrollPosition - (index * 1035.290))}}>
                        <Page
                            
                            pageNumber={index + 1}
                            width={800}
                        />
                            
                    </div>
                ))}      
            </Document>
        </div>
    );
}
 
export default Test;