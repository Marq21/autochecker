// Старые кнопки (оставляем id и названия)
const startBtn = document.getElementById("startBtn");
const startBtnAll = document.getElementById("startBtnAll");
const emptyContainersButton = document.getElementById("emptyContainersButton");
const startBtnCount = document.getElementById("startBtnCount");
const inputNumber = document.getElementById("inputNumber");

// Новая кнопка: Снять выделение с "К выдаче"
const uncheckGivenOutBtn = document.getElementById("uncheckGivenOutBtn");

// Новые функции (как раньше) — но обновлённые селекторы
const rightColumnSelector = "#__nuxt > div > div._container_hevb3_17._containerFull_hevb3_24 > div:nth-child(2) > div > div > div._outboundLayout_les3l_1 > div._outboundCommander_1014z_1 > div:nth-child(2)";

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

// ✅ Старая кнопка: Выдать все, кроме дешёвого (новая логика)
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

// ✅ Старая кнопка: Выдать всё (новая логика)
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

// ✅ Старая кнопка: Выдать N штук (новая логика)
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

// ✅ Возвращённая кнопка: Выбрать тарные ящики (старая логика, обновлённые селекторы)
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

// ✅ Новая кнопка: Снять выделение с "К выдаче"
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

// ===================================================================
// НОВЫЕ ФУНКЦИИ (встроенные waitForElement)
// ===================================================================

// ✅ Функция: Выдать все элементы (новая логика)
async function clickAllGiveOutItems() {
  // Найти все элементы, у которых data-testid содержит "posting"
  const elements = document.querySelectorAll('[data-testid*="posting"]');

  // Отфильтровать: исключить элементы, внутри которых есть div с классом и текстом "УИН"
  const filteredElements = Array.from(elements).filter(el => {
    const uinElement = el.querySelector('.ozi__truncate__truncate__7a-6_.ozi__badge__label__Rb41r');
    return !(uinElement && uinElement.textContent.trim() === "УИН");
  });

  console.log(`Найдено ${elements.length} элементов с data-testid, содержащим "posting".`);
  console.log(`После фильтрации осталось ${filteredElements.length} элементов.`);

  // Для каждого отфильтрованного элемента:
  for (let i = 0; i < filteredElements.length; i++) {
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

// ✅ Функция: Выдать все, кроме дешёвого (новая логика)
async function clickAllGiveOutItemsExceptCheapest() {
  // Найти все элементы, у которых data-testid содержит "posting"
  const elements = document.querySelectorAll('[data-testid*="posting"]');

  // Отфильтровать: исключить элементы, внутри которых есть div с классом и текстом "УИН"
  const filteredElements = Array.from(elements).filter(el => {
    const uinElement = el.querySelector('.ozi__truncate__truncate__7a-6_.ozi__badge__label__Rb41r');
    return !(uinElement && uinElement.textContent.trim() === "УИН");
  });

  if (filteredElements.length === 0) {
    console.log("❌ Нет подходящих элементов для обработки.");
    return;
  }

  // Найти цены для каждого элемента
  const itemsWithPrice = [];

  for (let i = 0; i < filteredElements.length; i++) {
    const el = filteredElements[i];

    // Найти внутри него цену по классу "_money_1vf2o_108 ozi-body-500-true _price_1vf2o_116"
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

  // Найти товар с минимальной ценой
  let minPriceItem = itemsWithPrice[0];
  for (let i = 1; i < itemsWithPrice.length; i++) {
    if (itemsWithPrice[i].price < minPriceItem.price) {
      minPriceItem = itemsWithPrice[i];
    }
  }

  console.log(`💰 Минимальная цена: ${minPriceItem.price}, элемент #${minPriceItem.index}.`);

  // Обработать все, кроме дешёвого
  for (let i = 0; i < itemsWithPrice.length; i++) {
    const item = itemsWithPrice[i];

    if (item.index === minPriceItem.index) {
      console.log(`⏭️ Пропущен элемент #${item.index} (минимальная цена).`);
      continue;
    }

    console.log(`🔍 Обработка элемента #${item.index}:`, item.element);

    // Найти внутри него элемент с классом ozi__popover__fixReferenceSize__xaASc
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

// ✅ Функция: Выдать N штук (новая логика)
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

// ✅ Функция: Снять выделение с "К выдаче" (новая логика)
// ✅ Функция: Снять выделение с "К выдаче" (новая логика)
async function clickAllUncheckGivenOutItems() {
  // Найти все элементы, у которых data-testid содержит "posting"
  const elements = document.querySelectorAll('[data-testid*="posting"]');

  // Отфильтровать: исключить элементы, внутри которых есть div с классом и текстом "УИН"
  const filteredElements = Array.from(elements).filter(el => {
    const uinElement = el.querySelector('.ozi__truncate__truncate__7a-6_.ozi__badge__label__Rb41r');
    return !(uinElement && uinElement.textContent.trim() === "УИН");
  });

  console.log(`Найдено ${elements.length} элементов с data-testid, содержащим "posting".`);
  console.log(`После фильтрации осталось ${filteredElements.length} элементов.`);

  // Для каждого отфильтрованного элемента:
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

// ✅ Функция: Выбрать тарные ящики (старая логика, обновлённые селекторы)
function getAllEmptyContainerBoxes() {
  const rightColumn = document.querySelector(rightColumnSelector);

  if (!rightColumn) {
    console.error("❌ Правый блок не найден.");
    return;
  }

  // Используем новый класс элемента
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