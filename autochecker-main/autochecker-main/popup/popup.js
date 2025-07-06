const startBtn = document.getElementById("startBtn");
const startBtnAll = document.getElementById("startBtnAll");
const emptyContainersButton = document.getElementById("emptyContainersButton");
const startBtnCount = document.getElementById("startBtnCount");
const inputNumber = document.getElementById("inputNumber");

const checkBoxesQuerySelector = "#__nuxt > div > div._container_hevb3_17._containerFull_hevb3_24 > div:nth-child(2) > div > div > div._order_19vq7_53 > div > table > tbody > tr > td:nth-child(1) > label > div > input";

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

    const rightColumnSelector = "#__nuxt > div > div._container_hevb3_17._containerFull_hevb3_24 > div:nth-child(2) > div > div > div._outboundLayout_1pbda_1 > div._outboundCommander_1014z_1 > div:nth-child(2)";

    const rightColumn = document.querySelector(rightColumnSelector);

    if (!rightColumn) {
        console.error("❌ Правая колонка не найдена.");
        return;
    }

    const items = Array.from(rightColumn.querySelectorAll("div._itemsElement_4j0aa_17"));

    const filteredItems = items.filter(item => {
        const text = item.textContent;
        return text.includes("%301%") || text.includes("ВТ");
    });

    filteredItems.forEach(item => {
        const input = item.querySelector("input[type='checkbox'], input[type='radio']");
        if (input && typeof input.click === "function") {
            input.click();
        }
    });
    console.log(`✅ Проставлено ${filteredItems.length} галочек через click().`);
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
