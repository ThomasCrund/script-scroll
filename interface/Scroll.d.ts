import { UID } from "./User";

export type ScrollMode = "Driving" | "Following" | "Inspecting";

// Client to server update on scroll information
export interface ScrollUpdate {
    timeStampClient: number;
    timeStampServer: number;
    scrollMode: ScrollMode;
    // Driving: controlling the master
    // Following: Following the master won't have a current position
    // Inspecting: scrolling through script independently of master
    newScrollPosition: number;
    lastScrollPosition: number;
    lastScrollServerTimeStamp: number;
}

export interface ScrollMaster {
    timeStampServer: number;
    controllers: UID[];
    scrollPosition: number;
    scrollUpdate: ScrollUpdate | undefined;
}

export interface ScrollInformation {
    master: ScrollMaster;
    users: { [index: UID]: UserScroll };
}

export interface UserScroll {
    scrollMode: ScrollMode;
    scrollPosition: number;
    uid: UID;

}

export interface UserScrollExtended extends UserScroll {
    pastUpdates: ScrollUpdate[];
    
}