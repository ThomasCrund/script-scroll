import React, { WheelEvent, useEffect, useState } from 'react'
import { pdfjs, Document, Page } from 'react-pdf';
import { ScrollData } from './ScrollWindow';
import type { PDFDocumentProxy } from 'pdfjs-dist';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.js',
    import.meta.url,
).toString();

const options = {
    cMapUrl: '/cmaps/',
    standardFontDataUrl: '/standard_fonts/',
};


interface PdfViewerProps {
    handleScroll: (e: WheelEvent<HTMLDivElement>) => void,
    scrollPosition: ScrollData,
    pageHeight?: number
    pageBufferSize?: number
}

const getPageNumberOnScreen = (scrollPosition: ScrollData) => {
    return Math.floor(scrollPosition.scrollPosition)
}

export default function PdfViewer({
    handleScroll,
    scrollPosition,
    pageHeight = 1000,
    pageBufferSize = 3
}: PdfViewerProps) {
    const [ numPages, setNumPages ] = useState(0);
    const [ currentPageNum, setPageNum ] = useState(0);
    const [ showingPages, setShowingPages ] = useState([0, 1, 2, 3, 4, 5]);

    // To update which pages are being rendered so only a few pages need to be rendered
    useEffect(() => {
        const newPageNum = getPageNumberOnScreen(scrollPosition)
        // const oldPageNum = currentPageNum;
        if (numPages === 0) {
            return;
        }

        if (newPageNum !== currentPageNum || showingPages.length === 0) {
            const newArray = []

            console.log(newPageNum, currentPageNum)

            for (let i = newPageNum - pageBufferSize; i <= newPageNum + pageBufferSize; i++) {
                if (!(i < 0) && !(i >= numPages)) {
                    newArray.push(i);
                }
            }
            
            setShowingPages(newArray);
            setPageNum(newPageNum);

        }

    }, [scrollPosition, currentPageNum, numPages, pageBufferSize, showingPages])

    const getOffsetForPage = (pageNumber: number) => {
        return -((scrollPosition.scrollPosition - pageNumber) * pageHeight)
    }

    const onDocumentLoadSuccess = (proxy: PDFDocumentProxy): void => {
        setNumPages(proxy.numPages);
        console.log("number of pages", proxy.numPages);
    }

    console.log(numPages, showingPages)

    return (
        <Document file={'./sample.pdf'} onLoadSuccess={onDocumentLoadSuccess} options={options}>
            {Array.from(showingPages, (el, index) => (
                <div key={`page_${el + 1}`} style={{ width: 800, position: "absolute", top: getOffsetForPage(el), transition: scrollPosition.clientDriving ? "top 0.05s" : "top 0.2s" }}>
                    <Page
                        pageNumber={el + 1}
                        height={pageHeight}
                    />
                </div>
            ))}
        </Document>
    );
}
