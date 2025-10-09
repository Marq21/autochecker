const startBtn = document.getElementById("startBtn");
const startBtnAll = document.getElementById("startBtnAll");
const emptyContainersButton = document.getElementById("emptyContainersButton");
const startBtnCount = document.getElementById("startBtnCount");
const inputNumber = document.getElementById("inputNumber");

const tableRowsQuerySelector = "div._order_1ba5m_53 table tbody tr";

document.addEventListener("DOMContentLoaded", async () => {
  try {
    if (chrome.storage && chrome.storage.local) {
      const result = await chrome.storage.local.get(["updateAvailable", "latestVersion", "releaseBody"]);
      if (result.updateAvailable) {
        showUpdateNotification(result.latestVersion, result.releaseBody);
      }
    } else {
      if (globalThis.updateAvailable) {
        showUpdateNotification(globalThis.latestVersion, globalThis.releaseBody);
      }
    }
  } catch (error) {
    console.error("❌ Ошибка при проверке обновления в popup:", error);
  }
});

function showUpdateNotification(version, body) {
  const updateDiv = document.createElement("div");
  updateDiv.id = "updateNotification";
  updateDiv.innerHTML = `
    <div style="background: #ffeb3b; color: black; padding: 10px; border-radius: 4px; margin-bottom: 10px;">
      <strong>📦 Доступна новая версия: ${version}</strong><br>
      <p>${body}</p>
      <button id="downloadUpdateBtn" style="margin-top: 5px; padding: 5px 10px; cursor: pointer;">Скачать ZIP</button>
    </div>
  `;

  document.body.prepend(updateDiv);

  document.getElementById("downloadUpdateBtn").addEventListener("click", () => {
    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(["downloadUrl"], (res) => {
        if (res.downloadUrl) {
          chrome.tabs.create({ url: res.downloadUrl });
        }
      });
    } else {
      if (globalThis.downloadUrl) {
        chrome.tabs.create({ url: globalThis.downloadUrl });
      }
    }
  });
}

startBtn.addEventListener("click", () => {
    chrome.tabs.query({ active: true }, function (tabs) {
        var tab = tabs[0];
        if (tab) {
            chrome.scripting.executeScript(
                {
                    target: { tabId: tab.id, allFrames: true },
                    func: getAllCheckBoxesExceptOne,
                    args: [tableRowsQuerySelector],
                },
            );
        } else {
            alert("There are no active tabs");
        }
    });
});

startBtnAll.addEventListener("click", () => {
    chrome.tabs.query({ active: true }, function (tabs) {
        var tab = tabs[0];
        if (tab) {
            chrome.scripting.executeScript(
                {
                    target: { tabId: tab.id, allFrames: true },
                    func: getAllCheckBoxes,
                    args: [tableRowsQuerySelector],
                },
            );
        } else {
            alert("There are no active tabs");
        }
    });
});

startBtnCount.addEventListener("click", () => {
    const number = parseInt(inputNumber.value, 10);
    if (isNaN(number) || number <= 0) {
        alert("Введите корректное число");
        return;
    }

    chrome.tabs.query({ active: true }, function (tabs) {
        var tab = tabs[0];
        if (tab) {
            chrome.scripting.executeScript(
                {
                    target: { tabId: tab.id, allFrames: true },
                    func: getFixedCheckBoxes,
                    args: [number, tableRowsQuerySelector],
                },
            );
        } else {
            alert("There are no active tabs");
        }
    });
});

emptyContainersButton.addEventListener("click", () => {
    chrome.tabs.query({ active: true }, function (tabs) {
        var tab = tabs[0];
        if (tab) {
            chrome.scripting.executeScript(
                {
                    target: { tabId: tab.id, allFrames: true },
                    func: getAllEmptyContainerBoxes,
                },
            );
        } else {
            alert("There are no active tabs");
        }
    });
});

// ✅ Внутри каждой функции — логика ожидания элементов
function getAllCheckBoxes(tableRowsQuerySelector) {
  const rows = document.querySelectorAll(tableRowsQuerySelector);
  const inputs = [];

  rows.forEach(row => {
    const input = row.querySelector("td:nth-child(1) > label > div > input[type='checkbox']");
    if (input && !input.disabled && input.offsetParent !== null) inputs.push(input);
  });

  console.log(`🔍 Найдено ${inputs.length} доступных чекбоксов.`);

  inputs.forEach((input, index) => {
    setTimeout(() => {
      // Проверяем снова, что элемент всё ещё доступен
      if (input && !input.disabled && input.offsetParent !== null) {
        const event = new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          view: window,
          button: 0,
        });
        input.dispatchEvent(event);
      } else {
        console.log(`❌ Пропущен элемент #${index} при клике:`, {
          input: input,
          disabled: input?.disabled || 'n/a',
          offsetParent: input?.offsetParent || 'n/a',
        });
      }
    }, index * 50); // 50 мс задержка между кликами
  });

  console.log(`✅ Запланировано ${inputs.length} кликов.`);
}

function getAllCheckBoxesExceptOne(tableRowsQuerySelector) {
  const rows = document.querySelectorAll(tableRowsQuerySelector);

  if (rows.length === 0) {
    console.log("❌ Не найдено строк товаров.");
    return;
  }

  const items = [];

  rows.forEach((row, index) => {
    const input = row.querySelector("td:nth-child(1) > label > div > input[type='checkbox']");
    if (!input || input.disabled || input.offsetParent === null) {
      console.log(`❌ Пропущена строка #${index}: чекбокс недоступен.`);
      return;
    }

    // 🆕 Находим цену относительно строки
    const priceCell = row.querySelector("td.ozi__table-cell-base__cell__n2QEE._innerTable_nakzj_104 th:nth-child(2) div.ozi__data-content__label__TA_HC");
    let price = null;

    if (priceCell) {
      const priceText = priceCell.textContent.trim();
      // Извлекаем число из строки (например, "1 234 руб." → 1234)
      const match = priceText.match(/[\d\s.,]+/);
      if (match) {
        price = parseFloat(match[0].replace(/[^\d.]/g, ''));
      }
    }

    if (price === null) {
      console.log(`⚠️ Цена не найдена в строке #${index}, будет пропущена.`);
      return;
    }

    items.push({
      index,
      input,
      price,
    });
  });

  if (items.length === 0) {
    console.log("❌ Ни один товар не подошёл для обработки (нет цены или чекбокса).");
    return;
  }

  // Находим товар с минимальной ценой
  let minPriceItem = items[0];
  for (let i = 1; i < items.length; i++) {
    if (items[i].price < minPriceItem.price) {
      minPriceItem = items[i];
    }
  }

  console.log(`💰 Минимальная цена: ${minPriceItem.price}, строка #${minPriceItem.index}.`);

  // Кликаем по всем, кроме строки с минимальной ценой
  items.forEach(item => {
    if (item.index === minPriceItem.index) {
      console.log(`⏭️ Пропущена строка #${item.index} (минимальная цена).`);
      return;
    }

    setTimeout(() => {
      if (item.input && !item.input.disabled && item.input.offsetParent !== null) {
        const event = new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          view: window,
          button: 0,
        });
        item.input.dispatchEvent(event);
      }
    }, item.index * 50);
  });

  console.log(`✅ Выбрано ${items.length - 1} товаров (все, кроме минимальной цены).`);
}

function getFixedCheckBoxes(number, tableRowsQuerySelector) {
  const rows = document.querySelectorAll(tableRowsQuerySelector);
  const inputs = [];

  rows.forEach(row => {
    const input = row.querySelector("td:nth-child(1) > label > div > input[type='checkbox']");
    if (input && !input.disabled && input.offsetParent !== null) inputs.push(input);
  });

  if (number > inputs.length) {
    alert("Число больше количества позиций");
    return;
  }

  console.log(`🔍 Найдено ${inputs.length} доступных чекбоксов.`);

  for (let i = 0; i < number; i++) {
    const input = inputs[i];
    setTimeout(() => {
      if (input && !input.disabled && input.offsetParent !== null) {
        const event = new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          view: window,
          button: 0,
        });
        input.dispatchEvent(event);
      } else {
        console.log(`❌ Пропущен элемент #${i} (фиксированное количество) при клике:`, {
          input: input,
          disabled: input?.disabled || 'n/a',
          offsetParent: input?.offsetParent || 'n/a',
        });
      }
    }, i * 50);
  }

  console.log(`✅ Запланировано ${number} кликов.`);
}

function getAllEmptyContainerBoxes() {
    const rightColumnSelector = "#__nuxt > div > div._container_hevb3_17._containerFull_hevb3_24 > div:nth-child(2) > div > div > div._outboundLayout_les3l_1 > div._outboundCommander_1014z_1 > div:nth-child(2)";
    const rightColumn = document.querySelector(rightColumnSelector);

    if (!rightColumn) {
        console.error("❌ Правый блок не найден.");
        return;
    }

    const items = Array.from(rightColumn.querySelectorAll("div._itemsElement_1b09z_17"));

    const filteredItems = items.filter(item => {
        const text = item.textContent;
        return text.includes("%301%") || text.includes("ВТ") || text.includes("BT");
    });

    let clickedCount = 0;
    filteredItems.forEach(item => {
        const input = item.querySelector("input[type='checkbox']");
        if (input && typeof input.click === "function") {
            input.click();
            clickedCount++;
        }
    });

    console.log(`✅ Выбрано ${clickedCount} тарных ящиков (${filteredItems.length} найдено).`);
}