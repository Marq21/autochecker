const startBtn = document.getElementById("startBtn");
const startBtnAll = document.getElementById("startBtnAll");
const emptyContainersButton = document.getElementById("emptyContainersButton");
const startBtnCount = document.getElementById("startBtnCount");
const inputNumber = document.getElementById("inputNumber");

const checkBoxesQuerySelector = "#__nuxt > div > div._container_hevb3_17._containerFull_hevb3_24 > div:nth-child(2) > div > div > div._order_py5g5_53 > div > table > tbody > tr > td:nth-child(1) > label > div > input";

startBtn.addEventListener("click", () => {
    chrome.tabs.query({ active: true }, function (tabs) {
        var tab = tabs[0];
        if (tab) {
            chrome.scripting.executeScript(
                {
                    target: { tabId: tab.id, allFrames: true },
                    func: getAllCheckBoxesExceptOne,
                    args: [checkBoxesQuerySelector],
                },
            )
        } else {
            alert("There are no active tabs")
        }
    })
})

startBtnAll.addEventListener("click", () => {
    chrome.tabs.query({ active: true }, function (tabs) {
        var tab = tabs[0];
        if (tab) {
            chrome.scripting.executeScript(
                {
                    target: { tabId: tab.id, allFrames: true },
                    func: getAllCheckBoxes,
                    args: [checkBoxesQuerySelector],
                },
            )
        } else {
            alert("There are no active tabs")
        }
    })
})

startBtnCount.addEventListener("click", () => {
    chrome.tabs.query({ active: true }, function (tabs) {
        var tab = tabs[0];
        if (tab) {
            chrome.scripting.executeScript(
                {
                    target: { tabId: tab.id, allFrames: true },
                    func: getFixedCheckBoxes,
                    args: [parseInt(inputNumber.value), checkBoxesQuerySelector],
                },
            )
        } else {
            alert("There are no active tabs")
        }
    })
})

emptyContainersButton.addEventListener("click", () => {
    chrome.tabs.query({ active: true }, function (tabs) {
        var tab = tabs[0];
        if (tab) {
            chrome.scripting.executeScript(
                {
                    target: { tabId: tab.id, allFrames: true },
                    func: getAllEmptyContainerBoxes,
                },
            )
        } else {
            alert("There are no active tabs")
        }
    })
})

function getAllCheckBoxes(elementsQuerySelector) {
    elems = document.querySelectorAll(elementsQuerySelector);
    for (let index = 0; index < elems.length; index++) {
        const element = elems[index];
        setTimeout(() => { element.click(); }, 500);
    }
}

function getAllCheckBoxesExceptOne(elementsQuerySelector) {
    elems = document.querySelectorAll(elementsQuerySelector);
    for (let index = 1; index < elems.length; index++) {
        const element = elems[index];
        setTimeout(() => { element.click(); }, 500);
    }
}

function getAllEmptyContainerBoxes() {
    var topElements = document.querySelector("#__nuxt > div > div._container_hevb3_17._containerFull_hevb3_24 > div:nth-child(2) > div > div > div._outboundLayout_o3j3w_1 > div._outboundCommander_1014z_1 > div:nth-child(2) > div:nth-child(5) > div");
    if (topElements === null) {
        alert('Нет тарных ящиков на отправление');
        return;
    }
    var containersChildNodes = topElements.childNodes;
    for (let index = 0; index < containersChildNodes.length; index++) {
        let node = containersChildNodes[index];
        if (node !== null && node.nodeType === 1)
            node.querySelector("label > div > input").click();
    }
}

function getFixedCheckBoxes(number, checkBoxesQuerySelector) {
    elems = document.querySelectorAll(checkBoxesQuerySelector);
    if (number > elems.length) {
        alert("Число больше количества позиций");
        return;
    }
    for (let index = 0; index < number; index++) {
        const element = elems[index];
        setTimeout(() => { element.click(); }, 500);
    }
}
