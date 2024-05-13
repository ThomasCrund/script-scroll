import { ScrollInformation, ScrollMaster, ScrollUpdate, UserScrollExtended } from "../interface/Scroll";
import { UID } from "../interface/User";


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

    updateScroll(uid, scrollData: ScrollUpdate) {
        console.log(`${uid} has sent a scroll update`);
    }
}