// Старые кнопки (оставляем id и названия)
const startBtn = document.getElementById("startBtn");
const startBtnAll = document.getElementById("startBtnAll");
const emptyContainersButton = document.getElementById("emptyContainersButton");
const startBtnCount = document.getElementById("startBtnCount");
const inputNumber = document.getElementById("inputNumber");

const uncheckGivenOutBtn = document.getElementById("uncheckGivenOutBtn");

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
          func: clickAllGiveOutItemsExceptCheapest,
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
          func: clickAllGiveOutItems,
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
          func: clickAllGiveOutItemsFixed,
          args: [number],
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

if (uncheckGivenOutBtn) {
  uncheckGivenOutBtn.addEventListener("click", () => {
    chrome.tabs.query({ active: true }, function (tabs) {
      var tab = tabs[0];
      if (tab) {
        chrome.scripting.executeScript(
          {
            target: { tabId: tab.id, allFrames: true },
            func: clickAllUncheckGivenOutItems,
          },
        );
      } else {
        alert("There are no active tabs");
      }
    });
  });
}


async function clickAllGiveOutItems() {
  const elements = document.querySelectorAll('[data-testid*="posting"]');

  const filteredElements = Array.from(elements).filter(el => {
    const uinElement = el.querySelector('.ozi__truncate__truncate__7a-6_.ozi__badge__label__Rb41r');
    return !(uinElement && uinElement.textContent.trim() === "УИН");
  });

  console.log(`Найдено ${elements.length} элементов с data-testid, содержащим "posting".`);
  console.log(`После фильтрации осталось ${filteredElements.length} элементов.`);

  for (let i = 0; i < filteredElements.length; i++) {
    const el = filteredElements[i];
    console.log(`🔍 Обработка элемента #${i}:`, el);

    const popoverElement = el.querySelector('.ozi__popover__fixReferenceSize__xaASc');

    if (popoverElement) {
      console.log(`✅ Найден popover элемент в #${i}, кликаю:`, popoverElement);
      popoverElement.click();

      try {
        const targetElement = await new Promise((resolve, reject) => {
          const startTime = Date.now();
          const interval = 100;

          const check = () => {
            const element = document.querySelector('[data-testid="postingDropDownItemToGiveOut"]');
            if (element) {
              resolve(element);
              return;
            }
            if (Date.now() - startTime > 5000) {
              reject(new Error("Timeout: элемент не появился"));
              return;
            }
            setTimeout(check, interval);
          };

          check();
        });

        if (targetElement) {
          console.log(`✅ Найден элемент "Выдать", кликаю...`, targetElement);
          targetElement.click();
        } else {
          console.log(`⚠️ Элемент "Выдать" не найден в элементе #${i}.`);
        }
      } catch (error) {
        console.error(`❌ Ошибка ожидания элемента в #${i}:`, error.message);
      }
      await new Promise(resolve => setTimeout(resolve, 500));

    } else {
      console.log(`❌ popover элемент не найден в элементе #${i}.`);
    }
  }

  console.log("✅ Обработка завершена.");
}

async function clickAllGiveOutItemsExceptCheapest() {
  const elements = document.querySelectorAll('[data-testid*="posting"]');

  const filteredElements = Array.from(elements).filter(el => {
    const uinElement = el.querySelector('.ozi__truncate__truncate__7a-6_.ozi__badge__label__Rb41r');
    return !(uinElement && uinElement.textContent.trim() === "УИН");
  });

  if (filteredElements.length === 0) {
    console.log("❌ Нет подходящих элементов для обработки.");
    return;
  }

  const itemsWithPrice = [];

  for (let i = 0; i < filteredElements.length; i++) {
    const el = filteredElements[i];

    const priceElement = el.querySelector('._money_1vf2o_108.ozi-body-500-true._price_1vf2o_116');
    let price = null;

    if (priceElement) {
      const priceText = priceElement.textContent.trim();
      const match = priceText.match(/[\d\s.,]+/);
      if (match) {
        price = parseFloat(match[0].replace(/[^\d.]/g, ''));
      }
    }

    if (price === null) {
      console.log(`⚠️ Цена не найдена в элементе #${i}, будет пропущен.`);
      continue;
    }

    itemsWithPrice.push({
      index: i,
      element: el,
      price: price,
    });
  }

  if (itemsWithPrice.length === 0) {
    console.log("❌ Ни один товар не подошёл для обработки (нет цены).");
    return;
  }

  let minPriceItem = itemsWithPrice[0];
  for (let i = 1; i < itemsWithPrice.length; i++) {
    if (itemsWithPrice[i].price < minPriceItem.price) {
      minPriceItem = itemsWithPrice[i];
    }
  }

  console.log(`💰 Минимальная цена: ${minPriceItem.price}, элемент #${minPriceItem.index}.`);

  for (let i = 0; i < itemsWithPrice.length; i++) {
    const item = itemsWithPrice[i];

    if (item.index === minPriceItem.index) {
      console.log(`⏭️ Пропущен элемент #${item.index} (минимальная цена).`);
      continue;
    }

    console.log(`🔍 Обработка элемента #${item.index}:`, item.element);

    const popoverElement = item.element.querySelector('.ozi__popover__fixReferenceSize__xaASc');

    if (popoverElement) {
      console.log(`✅ Найден popover элемент в #${item.index}, кликаю:`, popoverElement);
      popoverElement.click();

      try {
        // Ждём появление элемента data-testid="postingDropDownItemToGiveOut"
        const targetElement = await new Promise((resolve, reject) => {
          const startTime = Date.now();
          const interval = 100; // Проверяем каждые 100мс

          const check = () => {
            const element = document.querySelector('[data-testid="postingDropDownItemToGiveOut"]');
            if (element) {
              resolve(element);
              return;
            }
            if (Date.now() - startTime > 5000) { // 5 секунд
              reject(new Error("Timeout: элемент не появился"));
              return;
            }
            setTimeout(check, interval);
          };

          check();
        });

        if (targetElement) {
          console.log(`✅ Найден элемент "Выдать", кликаю...`, targetElement);
          targetElement.click();
        } else {
          console.log(`⚠️ Элемент "Выдать" не найден в элементе #${item.index}.`);
        }
      } catch (error) {
        console.error(`❌ Ошибка ожидания элемента в #${item.index}:`, error.message);
      }

      // Небольшая пауза перед следующим элементом
      await new Promise(resolve => setTimeout(resolve, 500));

    } else {
      console.log(`❌ popover элемент не найден в элементе #${item.index}.`);
    }
  }

  console.log("✅ Обработка завершена.");
}

async function clickAllGiveOutItemsFixed(number) {
  // Найти все элементы, у которых data-testid содержит "posting"
  const elements = document.querySelectorAll('[data-testid*="posting"]');

  // Отфильтровать: исключить элементы, внутри которых есть div с классом и текстом "УИН"
  const filteredElements = Array.from(elements).filter(el => {
    const uinElement = el.querySelector('.ozi__truncate__truncate__7a-6_.ozi__badge__label__Rb41r');
    return !(uinElement && uinElement.textContent.trim() === "УИН");
  });

  if (number > filteredElements.length) {
    alert("Число больше количества позиций");
    return;
  }

  console.log(`Найдено ${elements.length} элементов с data-testid, содержащим "posting".`);
  console.log(`После фильтрации осталось ${filteredElements.length} элементов.`);
  console.log(`Будет обработано ${number} элементов.`);

  // Обработать только N первых
  for (let i = 0; i < number; i++) {
    const el = filteredElements[i];
    console.log(`🔍 Обработка элемента #${i}:`, el);

    // Найти внутри него элемент с классом ozi__popover__fixReferenceSize__xaASc
    const popoverElement = el.querySelector('.ozi__popover__fixReferenceSize__xaASc');

    if (popoverElement) {
      console.log(`✅ Найден popover элемент в #${i}, кликаю:`, popoverElement);
      popoverElement.click();

      try {
        // Ждём появление элемента data-testid="postingDropDownItemToGiveOut"
        const targetElement = await new Promise((resolve, reject) => {
          const startTime = Date.now();
          const interval = 100; // Проверяем каждые 100мс

          const check = () => {
            const element = document.querySelector('[data-testid="postingDropDownItemToGiveOut"]');
            if (element) {
              resolve(element);
              return;
            }
            if (Date.now() - startTime > 5000) { // 5 секунд
              reject(new Error("Timeout: элемент не появился"));
              return;
            }
            setTimeout(check, interval);
          };

          check();
        });

        if (targetElement) {
          console.log(`✅ Найден элемент "Выдать", кликаю...`, targetElement);
          targetElement.click();
        } else {
          console.log(`⚠️ Элемент "Выдать" не найден в элементе #${i}.`);
        }
      } catch (error) {
        console.error(`❌ Ошибка ожидания элемента в #${i}:`, error.message);
      }

      // Небольшая пауза перед следующим элементом
      await new Promise(resolve => setTimeout(resolve, 500));

    } else {
      console.log(`❌ popover элемент не найден в элементе #${i}.`);
    }
  }

  console.log("✅ Обработка завершена.");
}

async function clickAllUncheckGivenOutItems() {
  const elements = document.querySelectorAll('[data-testid*="posting"]');

  const filteredElements = Array.from(elements).filter(el => {
    const uinElement = el.querySelector('.ozi__truncate__truncate__7a-6_.ozi__badge__label__Rb41r');
    return !(uinElement && uinElement.textContent.trim() === "УИН");
  });

  console.log(`Найдено ${elements.length} элементов с data-testid, содержащим "posting".`);
  console.log(`После фильтрации осталось ${filteredElements.length} элементов.`);

  for (let i = 0; i < filteredElements.length; i++) {
    const el = filteredElements[i];
    console.log(`🔍 Обработка элемента #${i}:`, el);

    // Найти внутри него элемент с классом ozi__popover__fixReferenceSize__xaASc
    const popoverElement = el.querySelector('.ozi__popover__fixReferenceSize__xaASc');

    if (popoverElement) {
      console.log(`✅ Найден popover элемент в #${i}, кликаю:`, popoverElement);
      popoverElement.click();

      try {
        // Ждём появление элемента с классом ozi__dropdown-item__dropdownItem__cDZcD.ozi__dropdown-item__size-500__cDZcD
        const targetElement = await new Promise((resolve, reject) => {
          const startTime = Date.now();
          const interval = 100; // Проверяем каждые 100мс

          const check = () => {
            const element = document.querySelector('.ozi__dropdown-item__dropdownItem__cDZcD.ozi__dropdown-item__size-500__cDZcD');
            if (element) {
              resolve(element);
              return;
            }
            if (Date.now() - startTime > 5000) { // 5 секунд
              reject(new Error("Timeout: элемент 'ozi__dropdown-item__dropdownItem__cDZcD.ozi__dropdown-item__size-500__cDZcD' не появился"));
              return;
            }
            setTimeout(check, interval);
          };

          check();
        });

        if (targetElement) {
          const targetText = targetElement.textContent.trim();
          console.log(`✅ Найден элемент с классом 'ozi__dropdown-item__dropdownItem__cDZcD ozi__dropdown-item__size-500__cDZcD'. Текст: "${targetText}"`);

          if (targetText === "Оставить на хранении") {
            console.log(`✅ Текст совпадает с "Оставить на хранении", кликаю...`, targetElement);
            targetElement.click();
          } else {
            console.log(`⏭️ Текст "${targetText}" не совпадает с "Оставить на хранении", кликаю по popover элементу #${i} для закрытия меню.`, popoverElement);
            // Клик по popoverElement, чтобы закрыть меню
            popoverElement.click();
          }
        } else {
          console.log(`⚠️ Элемент с классом 'ozi__dropdown-item__dropdownItem__cDZcD ozi__dropdown-item__size-500__cDZcD' не найден в элементе #${i}.`);
          // Если элемент не появился, попробуем кликнуть по popoverElement, чтобы закрыть меню, если оно как-то открылось
          console.log(`ℹ️ Попытка закрыть меню кликом по popover элементу #${i}.`, popoverElement);
          if (popoverElement) {
            popoverElement.click();
          }
        }
      } catch (error) {
        console.error(`❌ Ошибка ожидания элемента с классом 'ozi__dropdown-item__dropdownItem__cDZcD ozi__dropdown-item__size-500__cDZcD' в #${i}:`, error.message);
        // Если ожидание завершилось ошибкой, тоже попробуем кликнуть по popoverElement, чтобы закрыть меню
        console.log(`ℹ️ Попытка закрыть меню кликом по popover элементу #${i} после ошибки.`, popoverElement);
        if (popoverElement) {
          popoverElement.click();
        }
      }
    } else {
      console.log(`❌ popover элемент (ozi__popover__fixReferenceSize__xaASc) не найден в элементе #${i}.`);
    }

    // Небольшая пауза перед следующим элементом
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log("✅ Обработка завершена.");
}

function getAllEmptyContainerBoxes() {
  const allBlocks = document.querySelectorAll("div._block_1b09z_1");

  // Найти среди них тот, внутри которого есть элемент с классом _breadcrumbsTitle_1014z_8 и текстом "Добавьте содержимое в перевозку"
  let targetBlock = null;
  for (const block of allBlocks) {
    const titleElement = block.querySelector("._breadcrumbsTitle_1014z_8");
    if (titleElement && titleElement.textContent.includes("Добавьте содержимое в перевозку")) {
      targetBlock = block;
      break;
    }
  }

  if (!targetBlock) {
    console.error("❌ Блок с заголовком 'Добавьте содержимое в перевозку' не найден.");
    return;
  }

  console.log("✅ Найден целевой блок для поиска тарных ящиков.");

  const items = Array.from(targetBlock.querySelectorAll("div._element_aug7a_1 _list_aug7a_20, div._itemsElement_1b09z_17"));

  console.log(`🔍 Найдено ${items.length} потенциальных элементов в целевом блоке.`);

  // Фильтруем элементы по содержанию "ВТ" или "%301%" или "BT"
  const filteredItems = items.filter(item => {
    // Проверяем _titleWrap_1dwqc_13 на "ВТ" или "BT" (предполагаем, что _titleWrap_1ailj_14 это и есть _titleWrap_1dwqc_13)
    const titleWrapElement = item.querySelector("._titleWrap_1ailj_14, ._titleWrap_1dwqc_13"); // Попробуем оба селектора
    const hasVTOrBT = titleWrapElement && (titleWrapElement.textContent.includes("ВТ") || titleWrapElement.textContent.includes("BT"));

    // Проверяем _row_1dwqc_6 на "%301%" (предполагаем, что _barcode_1ailj_7 это и есть _row_1dwqc_6)
    const rowElement = item.querySelector("._row_1dwqc_6"); // Попробуем оба селектора
    const has301 = rowElement && rowElement.textContent.includes("%301%");

    // Возвращаем true, если хотя бы одно условие выполнено
    return hasVTOrBT || has301;
  });

  console.log(`🔍 Найдено ${filteredItems.length} элементов, подходящих под критерии ("ВТ", "BT" или "%301%").`);

  let clickedCount = 0;
  filteredItems.forEach(item => {
    // Используем селектор для чекбокса, указанный вами
    const input = item.querySelector("input.ozi__checkbox__checkbox__LJWlw");
    if (input && typeof input.click === "function") {
      input.click();
      clickedCount++;
      console.log(`✅ Клик по чекбоксу в элементе:`, item);
    } else {
      // Если не нашли по LJWlw, попробуем dsZ5H (на случай, если структура различается)
      const inputAlt = item.querySelector("input.ozi__checkbox__checkbox__dsZ5H");
      if (inputAlt && typeof inputAlt.click === "function") {
        inputAlt.click();
        clickedCount++;
        console.log(`✅ Клик по альтернативному чекбоксу в элементе:`, item);
      } else {
        console.warn(`⚠️ Ни один из ожидаемых чекбоксов не найден или недоступен в элементе:`, item);
      }
    }
  });

  console.log(`✅ Выбрано ${clickedCount} тарных ящиков (${filteredItems.length} найдено).`);
}