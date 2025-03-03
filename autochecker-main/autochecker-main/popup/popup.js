const startBtn = document.getElementById("startBtn");
startBtn.addEventListener("click", () => {
    chrome.tabs.query({ active: true }, function (tabs) {
        var tab = tabs[0];
        if (tab) {
            chrome.scripting.executeScript(
                {
                    target: { tabId: tab.id, allFrames: true },
                    func: getAllCheckBoxes
                },
            )
        } else {
            alert("There are no active tabs")
        }
    })
})

const emptyContainersButton = document.getElementById("emptyContainersButton");
emptyContainersButton.addEventListener("click", () => {
    chrome.tabs.query({ active: true }, function (tabs) {
        var tab = tabs[0];
        if (tab) {
            chrome.scripting.executeScript(
                {
                    target: { tabId: tab.id, allFrames: true },
                    func: getAllEmptyContainerBoxes
                },
            )
        } else {
            alert("There are no active tabs")
        }
    })
})

function getAllCheckBoxes() {
    elems = document.querySelectorAll('input[type=checkbox]');
    for (let index = 2; index < elems.length; index++) {
        const element = elems[index];
        setTimeout(() => { element.click(); }, 2000);
    }
}

function getAllEmptyContainerBoxes() {
    const substring = "%301%";
    const topLvlString = 'Тарные ящики';
    topLvlElements = Array.from(document.getElementsByClassName('_groupTitle_100lb_28'))
        .find(el => el.innerText === topLvlString).parentElement;
    elems = topLvlElements.getElementsByClassName("_element_uwum7_1 _list_uwum7_20");
    console.log(elems);
    for (let index = 0; index < elems.length; index++) {
        let elem = elems[index];
        let elWithText = elem.querySelector('div:nth-child(2) > div:nth-child(1) > div:nth-child(1)');
        if (elWithText.innerText.includes(substring)) {
            let inputElement = elem.querySelector('label > div > input[type=checkbox]');
            inputElement.click();
        }
    }
}
