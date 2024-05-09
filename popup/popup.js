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

function getAllCheckBoxes() {
    elems = document.querySelectorAll('input[type=checkbox]');
    for (let index = 2; index < elems.length; index++) {
        const element = elems[index];
        setTimeout(() => { element.click(); }, 2000);
    }
}