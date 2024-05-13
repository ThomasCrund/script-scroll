import { ScrollInformation, ScrollMaster, ScrollUpdate, UserScrollExtended } from "../../interface/Scroll";
import { UID } from "../../interface/User";


export default class ScrollManager {
    master: ScrollMaster;
    users: { [index: UID]: UserScrollExtended }
    constructor() {
        this.master = {
            timeStampServer: Date.now(),
            controllers: [],
            scrollPosition: 0,
            scrollUpdate: undefined
        };
        this.users = {};
    }

    toScrollInformation(): ScrollInformation {
        return {
            master: this.master,
            users: this.users
        }
    }

    updateScroll(uid: UID, scrollData: ScrollUpdate) {
        scrollData.uid = uid;
        scrollData.timeStampServer = scrollData.timeStampServer ?? Date.now();
        switch (scrollData.scrollMode) {
            case "Driving":
                this.updateMasterScroll(uid, scrollData);
                this.updateUserScrollInfo(uid, scrollData);
                break;
            case "Following":
            case "Inspecting":
                if (this.users[uid]?.pastUpdates[-1].scrollMode == "Driving") {
                    this.master.controllers = this.master.controllers.slice(this.master.controllers.indexOf(uid), 1);
                }
                this.updateUserScrollInfo(uid, scrollData);
                break;
        }

        // console.log(`${uid} has sent a scroll update`);
    }

    updateMasterScroll(uid: UID, scrollData: ScrollUpdate) {
        if (scrollData.force ?? false) {
            this.setMasterScroll(uid, scrollData);
            return;
        }
        const currentPosition = this.master.scrollPosition;
        if (scrollData.newScrollPosition > currentPosition && scrollData.newScrollPosition < (currentPosition + 15)) {
            this.setMasterScroll(uid, scrollData);
            return;
        }
        if (scrollData.newScrollPosition < currentPosition 
            && scrollData.newScrollPosition > (currentPosition + 30) 
            && this.master.scrollUpdate?.uid == uid) {
            this.setMasterScroll(uid, scrollData);
            return;
        }
    }

    setMasterScroll(uid: UID, scrollData: ScrollUpdate) {
        if (this.master.controllers.indexOf(uid) == -1) {
            this.master.controllers.push(uid);
        }
        this.master.scrollPosition = scrollData.lastScrollPosition;
        this.master.timeStampServer = scrollData.timeStampServer ?? Date.now();
        this.master.scrollUpdate = scrollData;
    }

    updateUserScrollInfo(uid: UID, scrollData: ScrollUpdate) {
        if (this.users[uid] == undefined) {
            this.users[uid] = {
                scrollMode: scrollData.scrollMode,
                scrollPosition: scrollData.newScrollPosition,
                pastUpdates: [scrollData],
                uid
            }
        } else {
            this.users[uid].scrollMode = scrollData.scrollMode;
            this.users[uid].scrollPosition = scrollData.newScrollPosition;
            this.users[uid].pastUpdates.push(scrollData);
        }
    }

}