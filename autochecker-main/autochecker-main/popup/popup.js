/**
 * Popup Script for OZONturbo Autochecker
 * 
 * This file handles all popup functionality:
 * - UI event listeners for buttons
 * - Order processing functions (give out items)
 * - Container selection functions (тарные ящики)
 * - Update notifications
 * 
 * IMPORTANT: All functions that are injected into web page context
 * via chrome.scripting.executeScript MUST be self-contained.
 * They cannot rely on external variables or imports.
 */

// ============================================================================
// SECTION 1: DOM ELEMENTS
// Get references to all UI elements in popup
// ============================================================================

const startBtn = document.getElementById("startBtn");
const startBtnAll = document.getElementById("startBtnAll");
const emptyContainersButton = document.getElementById("emptyContainersButton");
const emptyContainersButtonFixed = document.getElementById("emptyContainersButtonFixed"); // Новая кнопка
const startBtnCount = document.getElementById("startBtnCount");
const inputNumber = document.getElementById("inputNumber");
const inputContainersNumber = document.getElementById("inputContainersNumber"); // Новое поле ввода
const uncheckGivenOutBtn = document.getElementById("uncheckGivenOutBtn");

// ============================================================================
// SECTION 2: NOTIFICATION FUNCTION
// Shows update notification in popup (works in popup context, not injected)
// ============================================================================

/**
 * Shows update notification in the popup
 * @param {string} version - Version number of the new release
 * @param {string} body - Release notes/description
 */
function showUpdateNotification(version, body) {
  const updateDiv = document.createElement("div");
  updateDiv.id = "updateNotification";
  updateDiv.innerHTML = `
    <div style="background: #ffeb3b; color: black; padding: 10px; border-radius: 4px; margin-bottom: 10px;">
      <strong>📦 Доступна новая версия: ${version}</strong><br>
      <p>${body || "Нажмите, чтобы скачать."}</p>
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

// ============================================================================
// SECTION 3: INITIALIZATION
// Check for updates when popup is opened
// ============================================================================

document.addEventListener("DOMContentLoaded", async () => {
  try {
    if (chrome.storage && chrome.storage.local) {
      const result = await chrome.storage.local.get([
        "updateAvailable", 
        "latestVersion", 
        "releaseBody"
      ]);
      
      if (result.updateAvailable) {
        showUpdateNotification(result.latestVersion, result.releaseBody);
      }
    } else {
      if (globalThis.updateAvailable) {
        showUpdateNotification(globalThis.latestVersion, globalThis.releaseBody);
      }
    }
  } catch (error) {
    console.error("❌ Error checking for updates in popup:", error);
  }
});

// ============================================================================
// SECTION 4: HELPER FUNCTION FOR EXECUTING SCRIPTS
// Wrapper around chrome.scripting.executeScript with error handling
// ============================================================================

/**
 * Executes a function in the active tab's context
 * @param {Function} func - Function to execute in the active tab
 * @param {Array} args - Arguments to pass to the function
 * @param {string} buttonId - ID of the button that triggered this action
 */
function executeScriptInActiveTab(func, args = [], buttonId) {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    const tab = tabs[0];
    
    if (!tab) {
      alert("There are no active tabs");
      console.error("❌ No active tab found");
      return;
    }
    
    chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      func: func,
      args: args
    }, (results) => {
      if (chrome.runtime.lastError) {
        console.error(`❌ Error executing script from ${buttonId}:`, 
          chrome.runtime.lastError.message);
      } else {
        console.log(`✅ Script executed successfully from ${buttonId}`);
      }
    });
  });
}

// ============================================================================
// SECTION 5: INJECTED FUNCTIONS
// ALL functions below are injected into web page context
// They MUST be self-contained (no external dependencies)
// ============================================================================

/**
 * Clicks "Give Out" on all order items (excluding УИН)
 * Выдаёт все товары в заказе (кроме УИН)
 */
async function clickAllGiveOutItems() {
  // ============================================================================
  // CONSTANTS
  // ============================================================================

  const SELECTORS = {
    ORDER_POSTING: '[data-testid^="posting-"]',
    MENU_ITEM_GIVE_OUT: '[data-testid="postingDropDownItemToGiveOut"]'
  };

  const TEXT = {
    UIN: "УИН"
  };

  const TIMERS = {
    WAIT_TIMEOUT: 5000,
    WAIT_INTERVAL: 100,
    CLICK_DELAY: 500,
    MENU_OPEN_DELAY: 300
  };

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  /**
   * Checks if an element contains the text "УИН" anywhere in its subtree
   */
  function hasUIN(element) {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null, false);
    let node;
    while ((node = walker.nextNode())) {
      if (node.textContent && node.textContent.trim() === TEXT.UIN) {
        return true;
      }
    }
    return false;
  }

  /**
   * Filters out order elements that contain "УИН"
   */
  function filterOutUINElements(elements) {
    return Array.from(elements).filter(el => !hasUIN(el));
  }

  /**
   * Waits for an element to appear in the DOM
   */
  function waitForElement(selector, timeout = TIMERS.WAIT_TIMEOUT) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const check = () => {
        const element = document.querySelector(selector);
        if (element) {
          resolve(element);
          return;
        }
        if (Date.now() - startTime > timeout) {
          reject(new Error(`Timeout: "${selector}" not found`));
          return;
        }
        setTimeout(check, TIMERS.WAIT_INTERVAL);
      };
      check();
    });
  }

  /**
   * Simulates a delay
   */
  function delay(ms = TIMERS.CLICK_DELAY) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Safe click with visibility check and fallback to dispatchEvent
   */
  async function safeClick(element, description = "element") {
    if (!element) {
      console.warn(`⚠️ Cannot click ${description}: element is null`);
      return false;
    }

    const isVisible = element.offsetParent !== null;
    const isClickable = typeof element.click === "function";

    if (!isVisible) {
      console.warn(`⚠️ ${description} is not visible, scrolling into view...`);
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await delay(200);
    }

    if (!isClickable || element.disabled) {
      console.warn(`⚠️ ${description} is not clickable or disabled`);
      return false;
    }

    try {
      element.click();
      await delay(100);
      element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
      console.log(`✅ Clicked ${description}`);
      return true;
    } catch (error) {
      console.error(`❌ Error clicking ${description}:`, error.message);
      return false;
    }
  }

  /**
   * Finds the "more" (⋮) button, excluding those inside _label_j72dp_76
   */
  function findPopoverButton(orderElement) {
    const allButtons = orderElement.querySelectorAll('button.ozi__button__noContent__5UTJi');
    const validButtons = Array.from(allButtons).filter(btn => !btn.closest('._label_j72dp_76'));
    
    if (validButtons.length > 0) {
      return validButtons[0];
    }

    // Fallback selectors
    const altSelectors = [
      '[data-testid="postingMoreButton"]',
      'button[data-testid*="posting"]',
      '.ozi__button__button__5UTJi.ozi__button__noContent__5UTJi',
      'button._keep_ez18p_19'
    ];

    for (const selector of altSelectors) {
      const btn = orderElement.querySelector(selector);
      if (btn && !btn.closest('._label_j72dp_76')) {
        return btn;
      }
    }

    return null;
  }

  // ============================================================================
  // MAIN LOGIC
  // ============================================================================

  console.log("🚀 Starting clickAllGiveOutItems...");

  const elements = document.querySelectorAll(SELECTORS.ORDER_POSTING);
  if (elements.length === 0) {
    console.error("❌ No orders found!");
    return;
  }

  const filtered = filterOutUINElements(elements);
  console.log(`✅ Found ${filtered.length} items (after УИН filtering)`);

  if (filtered.length === 0) {
    console.warn("⚠️ No suitable items to process");
    return;
  }

  for (let i = 0; i < filtered.length; i++) {
    const el = filtered[i];
    console.log(`\n🔍 Processing item #${i + 1}/${filtered.length}`);

    const popover = findPopoverButton(el);
    if (!popover) {
      console.warn(`⚠️ Popover button not found in item #${i + 1}`);
      continue;
    }

    await safeClick(popover, "popover button (⋮)");
    await delay(TIMERS.MENU_OPEN_DELAY);

    try {
      const menuItem = await waitForElement(SELECTORS.MENU_ITEM_GIVE_OUT, 3000);
      await safeClick(menuItem, '"Give Out" menu item');
    } catch (error) {
      console.error(`❌ ${error.message}`);
      await safeClick(popover, "popover (to close menu)");
    }

    await delay();
  }

  console.log("\n✅ All done!");
}

/**
 * Clicks "Give Out" on all order items except the cheapest one (excluding УИН)
 */
async function clickAllGiveOutItemsExceptCheapest() {
  // ============================================================================
  // CONSTANTS
  // ============================================================================

  const SELECTORS = {
    ORDER_POSTING: '[data-testid^="posting-"]',
    MENU_ITEM_GIVE_OUT: '[data-testid="postingDropDownItemToGiveOut"]',
    PRICE_ELEMENT: '._money_j72dp_113.ozi-body-500-true._price_j72dp_121'
  };

  const TEXT = {
    UIN: "УИН"
  };

  const TIMERS = {
    WAIT_TIMEOUT: 5000,
    WAIT_INTERVAL: 100,
    CLICK_DELAY: 500,
    MENU_OPEN_DELAY: 300
  };

  // ============================================================================
  // HELPER FUNCTIONS (те же самые, что и выше)
  // ============================================================================

  function hasUIN(element) {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null, false);
    let node;
    while ((node = walker.nextNode())) {
      if (node.textContent && node.textContent.trim() === TEXT.UIN) {
        return true;
      }
    }
    return false;
  }

  function filterOutUINElements(elements) {
    return Array.from(elements).filter(el => !hasUIN(el));
  }

  function extractPrice(priceElement) {
    if (!priceElement) return null;
    const priceText = priceElement.textContent.trim();
    const match = priceText.match(/[\d\s.,]+/);
    return match ? parseFloat(match[0].replace(/[^\d.]/g, '')) : null;
  }

  function waitForElement(selector, timeout = TIMERS.WAIT_TIMEOUT) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const check = () => {
        const element = document.querySelector(selector);
        if (element) {
          resolve(element);
          return;
        }
        if (Date.now() - startTime > timeout) {
          reject(new Error(`Timeout: "${selector}" not found`));
          return;
        }
        setTimeout(check, TIMERS.WAIT_INTERVAL);
      };
      check();
    });
  }

  function delay(ms = TIMERS.CLICK_DELAY) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async function safeClick(element, description = "element") {
    if (!element) {
      console.warn(`⚠️ Cannot click ${description}: element is null`);
      return false;
    }

    const isVisible = element.offsetParent !== null;
    const isClickable = typeof element.click === "function";

    if (!isVisible) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await delay(200);
    }

    if (!isClickable || element.disabled) {
      return false;
    }

    try {
      element.click();
      await delay(100);
      element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
      console.log(`✅ Clicked ${description}`);
      return true;
    } catch (error) {
      console.error(`❌ Error clicking ${description}:`, error.message);
      return false;
    }
  }

  function findPopoverButton(orderElement) {
    const allButtons = orderElement.querySelectorAll('button.ozi__button__noContent__5UTJi');
    const validButtons = Array.from(allButtons).filter(btn => !btn.closest('._label_j72dp_76'));
    
    if (validButtons.length > 0) {
      return validButtons[0];
    }

    const altSelectors = [
      '[data-testid="postingMoreButton"]',
      'button[data-testid*="posting"]',
      '.ozi__button__button__5UTJi.ozi__button__noContent__5UTJi',
      'button._keep_ez18p_19'
    ];

    for (const selector of altSelectors) {
      const btn = orderElement.querySelector(selector);
      if (btn && !btn.closest('._label_j72dp_76')) {
        return btn;
      }
    }

    return null;
  }

  // ============================================================================
  // MAIN LOGIC
  // ============================================================================

  console.log("🚀 Starting clickAllGiveOutItemsExceptCheapest...");

  const elements = document.querySelectorAll(SELECTORS.ORDER_POSTING);
  if (elements.length === 0) {
    console.error("❌ No orders found!");
    return;
  }

  const filtered = filterOutUINElements(elements);
  console.log(`✅ Found ${filtered.length} items (after УИН filtering)`);

  // Collect prices
  const itemsWithPrice = [];
  for (let i = 0; i < filtered.length; i++) {
    const el = filtered[i];
    const priceEl = el.querySelector(SELECTORS.PRICE_ELEMENT);
    const price = priceEl ? extractPrice(priceEl) : null;

    if (price !== null) {
      itemsWithPrice.push({ originalIndex: i, element: el, price });
    } else {
      console.warn(`⚠️ Price not found in item #${i + 1}`);
    }
  }

  if (itemsWithPrice.length === 0) {
    console.error("❌ No items with price found");
    return;
  }

  // Find cheapest by index (only skip ONE item)
  let cheapestIndex = 0;
  for (let i = 1; i < itemsWithPrice.length; i++) {
    if (itemsWithPrice[i].price < itemsWithPrice[cheapestIndex].price) {
      cheapestIndex = i;
    }
  }

  const cheapest = itemsWithPrice[cheapestIndex];
  console.log(`🎯 Cheapest: ${cheapest.price}₽ (item #${cheapest.originalIndex + 1})`);
  console.log(`🔄 Will process ${itemsWithPrice.length - 1} items`);

  for (let i = 0; i < itemsWithPrice.length; i++) {
    const item = itemsWithPrice[i];

    if (i === cheapestIndex) {
      console.log(`⏭️ Skipping cheapest item #${item.originalIndex + 1}`);
      continue;
    }

    console.log(`\n🔍 Processing item #${item.originalIndex + 1} (${item.price}₽)`);
    const popover = findPopoverButton(item.element);
    if (!popover) {
      console.warn(`⚠️ Popover not found`);
      continue;
    }

    await safeClick(popover, "popover (⋮)");
    await delay(TIMERS.MENU_OPEN_DELAY);

    try {
      const menuItem = await waitForElement(SELECTORS.MENU_ITEM_GIVE_OUT, 3000);
      await safeClick(menuItem, '"Give Out"');
    } catch (error) {
      console.error(`❌ ${error.message}`);
      await safeClick(popover, "popover (close)");
    }

    await delay();
  }

  console.log("\n✅ All done!");
}

/**
 * Clicks "Give Out" on a fixed number of order items (excluding УИН)
 * Выдаёт указанное количество товаров (кроме УИН)
 * @param {number} number - Number of items to give out
 */
async function clickAllGiveOutItemsFixed(number) {
  // ============================================================================
  // CONSTANTS
  // ============================================================================

  const SELECTORS = {
    ORDER_POSTING: '[data-testid^="posting-"]',
    MENU_ITEM_GIVE_OUT: '[data-testid="postingDropDownItemToGiveOut"]'
  };

  const TEXT = {
    UIN: "УИН"
  };

  const TIMERS = {
    WAIT_TIMEOUT: 5000,
    WAIT_INTERVAL: 100,
    CLICK_DELAY: 500,
    MENU_OPEN_DELAY: 300
  };

  const ALERT_MESSAGES = {
    NUMBER_TOO_LARGE: (requested, available) =>
      `Число (${requested}) больше количества позиций (${available})`
  };

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  /**
   * Checks if an element contains the text "УИН" anywhere in its subtree
   */
  function hasUIN(element) {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null, false);
    let node;
    while ((node = walker.nextNode())) {
      if (node.textContent && node.textContent.trim() === TEXT.UIN) {
        return true;
      }
    }
    return false;
  }

  /**
   * Filters out order elements that contain "УИН"
   */
  function filterOutUINElements(elements) {
    return Array.from(elements).filter(el => !hasUIN(el));
  }

  /**
   * Waits for an element to appear in the DOM
   */
  function waitForElement(selector, timeout = TIMERS.WAIT_TIMEOUT) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const check = () => {
        const element = document.querySelector(selector);
        if (element) {
          resolve(element);
          return;
        }
        if (Date.now() - startTime > timeout) {
          reject(new Error(`Timeout: "${selector}" not found`));
          return;
        }
        setTimeout(check, TIMERS.WAIT_INTERVAL);
      };
      check();
    });
  }

  /**
   * Simulates a delay
   */
  function delay(ms = TIMERS.CLICK_DELAY) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Safe click with visibility check and fallback to dispatchEvent
   */
  async function safeClick(element, description = "element") {
    if (!element) {
      console.warn(`⚠️ Cannot click ${description}: element is null`);
      return false;
    }

    const isVisible = element.offsetParent !== null;
    const isClickable = typeof element.click === "function";

    if (!isVisible) {
      console.warn(`⚠️ ${description} is not visible, scrolling into view...`);
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await delay(200);
    }

    if (!isClickable || element.disabled) {
      console.warn(`⚠️ ${description} is not clickable or disabled`);
      return false;
    }

    try {
      element.click();
      await delay(100);
      element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
      console.log(`✅ Clicked ${description}`);
      return true;
    } catch (error) {
      console.error(`❌ Error clicking ${description}:`, error.message);
      return false;
    }
  }

  /**
   * Finds the "more" (⋮) button, excluding those inside _label_j72dp_76
   */
  function findPopoverButton(orderElement) {
    const allButtons = orderElement.querySelectorAll('button.ozi__button__noContent__5UTJi');
    const validButtons = Array.from(allButtons).filter(btn => !btn.closest('._label_j72dp_76'));
    
    if (validButtons.length > 0) {
      return validButtons[0];
    }

    // Fallback selectors
    const altSelectors = [
      '[data-testid="postingMoreButton"]',
      'button[data-testid*="posting"]',
      '.ozi__button__button__5UTJi.ozi__button__noContent__5UTJi',
      'button._keep_ez18p_19'
    ];

    for (const selector of altSelectors) {
      const btn = orderElement.querySelector(selector);
      if (btn && !btn.closest('._label_j72dp_76')) {
        return btn;
      }
    }

    return null;
  }

  // ============================================================================
  // MAIN LOGIC
  // ============================================================================

  console.log(`🚀 Starting clickAllGiveOutItemsFixed with number: ${number}`);

  const elements = document.querySelectorAll(SELECTORS.ORDER_POSTING);
  if (elements.length === 0) {
    console.error("❌ No orders found!");
    return;
  }

  const filtered = filterOutUINElements(elements);
  
  if (number > filtered.length) {
    alert(ALERT_MESSAGES.NUMBER_TOO_LARGE(number, filtered.length));
    console.warn(ALERT_MESSAGES.NUMBER_TOO_LARGE(number, filtered.length));
    return;
  }

  console.log(`✅ Found ${filtered.length} items (after УИН filtering)`);
  console.log(`🎯 Will process ${number} items`);

  for (let i = 0; i < number; i++) {
    const el = filtered[i];
    console.log(`\n🔍 Processing item #${i + 1}/${number}`);

    const popover = findPopoverButton(el);
    if (!popover) {
      console.warn(`⚠️ Popover button not found in item #${i + 1}`);
      continue;
    }

    await safeClick(popover, "popover button (⋮)");
    await delay(TIMERS.MENU_OPEN_DELAY);

    try {
      const menuItem = await waitForElement(SELECTORS.MENU_ITEM_GIVE_OUT, 3000);
      await safeClick(menuItem, '"Give Out" menu item');
    } catch (error) {
      console.error(`❌ ${error.message}`);
      await safeClick(popover, "popover (to close menu)");
    }

    await delay();
  }

  console.log("\n✅ All done!");
}


/**
 * Unchecks all items that were marked as "Given Out"
 * Снимает выделение со всех товаров, помеченных как "К выдаче"
 */
async function clickAllUncheckGivenOutItems() {
  // ============================================================================
  // CONSTANTS
  // ============================================================================

  const SELECTORS = {
    ORDER_POSTING: '[data-testid^="posting-"]',
    // ✅ Обновлённый селектор для пункта "Оставить на хранении"
    MENU_ITEM_KEEP_STORAGE: '.ozi__dropdown-item__dropdownItem__cDZcD.ozi__dropdown-item__size-500__cDZcD'
  };

  const TEXT = {
    UIN: "УИН",
    KEEP_STORAGE: "Оставить на хранении"
  };

  const TIMERS = {
    WAIT_TIMEOUT: 5000,
    WAIT_INTERVAL: 100,
    CLICK_DELAY: 500,
    MENU_OPEN_DELAY: 300
  };

  // ============================================================================
  // HELPER FUNCTIONS (identical to above)
  // ============================================================================

  function hasUIN(element) {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null, false);
    let node;
    while ((node = walker.nextNode())) {
      if (node.textContent && node.textContent.trim() === TEXT.UIN) {
        return true;
      }
    }
    return false;
  }

  function filterOutUINElements(elements) {
    return Array.from(elements).filter(el => !hasUIN(el));
  }

  function waitForElement(selector, timeout = TIMERS.WAIT_TIMEOUT) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const check = () => {
        const element = document.querySelector(selector);
        if (element) {
          resolve(element);
          return;
        }
        if (Date.now() - startTime > timeout) {
          reject(new Error(`Timeout: "${selector}" not found`));
          return;
        }
        setTimeout(check, TIMERS.WAIT_INTERVAL);
      };
      check();
    });
  }

  function delay(ms = TIMERS.CLICK_DELAY) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async function safeClick(element, description = "element") {
    if (!element) {
      console.warn(`⚠️ Cannot click ${description}: element is null`);
      return false;
    }

    const isVisible = element.offsetParent !== null;
    const isClickable = typeof element.click === "function";

    if (!isVisible) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await delay(200);
    }

    if (!isClickable || element.disabled) {
      return false;
    }

    try {
      element.click();
      await delay(100);
      element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
      console.log(`✅ Clicked ${description}`);
      return true;
    } catch (error) {
      console.error(`❌ Error clicking ${description}:`, error.message);
      return false;
    }
  }

  function findPopoverButton(orderElement) {
    const allButtons = orderElement.querySelectorAll('button.ozi__button__noContent__5UTJi');
    const validButtons = Array.from(allButtons).filter(btn => !btn.closest('._label_j72dp_76'));
    
    if (validButtons.length > 0) {
      return validButtons[0];
    }

    const altSelectors = [
      '[data-testid="postingMoreButton"]',
      'button[data-testid*="posting"]',
      '.ozi__button__button__5UTJi.ozi__button__noContent__5UTJi',
      'button._keep_ez18p_19'
    ];

    for (const selector of altSelectors) {
      const btn = orderElement.querySelector(selector);
      if (btn && !btn.closest('._label_j72dp_76')) {
        return btn;
      }
    }

    return null;
  }

  // ============================================================================
  // MAIN LOGIC
  // ============================================================================

  console.log("🚀 Starting clickAllUncheckGivenOutItems...");

  const elements = document.querySelectorAll(SELECTORS.ORDER_POSTING);
  if (elements.length === 0) {
    console.error("❌ No orders found!");
    return;
  }

  const filtered = filterOutUINElements(elements);
  console.log(`✅ Found ${filtered.length} items (after УИН filtering)`);

  if (filtered.length === 0) {
    console.warn("⚠️ No suitable items to process");
    return;
  }

  for (let i = 0; i < filtered.length; i++) {
    const el = filtered[i];
    console.log(`\n🔍 Processing item #${i + 1}/${filtered.length}`);

    const popover = findPopoverButton(el);
    if (!popover) {
      console.warn(`⚠️ Popover button not found in item #${i + 1}`);
      continue;
    }

    await safeClick(popover, "popover button (⋮)");
    await delay(TIMERS.MENU_OPEN_DELAY);

    try {
      const menuItem = await waitForElement(SELECTORS.MENU_ITEM_KEEP_STORAGE, 3000);
      const menuText = menuItem.textContent.trim();
      console.log(`✅ Menu item text: "${menuText}"`);

      if (menuText.includes(TEXT.KEEP_STORAGE) || menuText.includes("хранени")) {
        console.log(`✅ Text matches "Оставить на хранении", clicking...`);
        await safeClick(menuItem, '"Keep Storage" menu item');
      } else {
        console.log(`⏭️ Text doesn't match expected, closing menu...`);
        await safeClick(popover, "popover (to close menu)");
      }
    } catch (error) {
      console.error(`❌ ${error.message}`);
      await safeClick(popover, "popover (to close menu)");
    }

    await delay();
  }

  console.log("\n✅ All done!");
}


function getAllEmptyContainerBoxes() {
  // ============================================================================
  // CONSTANTS
  // ============================================================================
  
  const SELECTORS = {
    CONTAINER_BLOCK: 'div._block_1b09z_1',
    CONTAINER_TITLE: '._breadcrumbsTitle_1014z_8',
    CONTAINER_ITEMS: 'div._element_aug7a_1._list_aug7a_20, div._itemsElement_1b09z_17, div._element_aug7a_1',
    CONTAINER_TITLE_WRAP: '._titleWrap_1ailj_14, ._titleWrap_1dwqc_13',
    CONTAINER_BARCODE_ROW: '._row_1dwqc_6, ._barcode_1ailj_7',
    CONTAINER_CHECKBOX: 'input.ozi__checkbox__checkbox__LJWlw'
  };
  
  const TEXT = {
    CONTAINER_PAGE_TITLE: "Добавьте содержимое в перевозку",
    CONTAINER_VT: "ВТ",
    CONTAINER_BT: "BT",
    CONTAINER_BARCODE_301: "%301%"
  };
  
  // ============================================================================
  // HELPER FUNCTION: Show notification on page
  // ============================================================================
  
  function showNotification(message, type = 'success', duration = 3000) {
    // Create notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      background: ${type === 'success' ? '#4CAF50' : '#F44336'};
      color: white;
      border-radius: 4px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.3);
      z-index: 9999;
      font-size: 14px;
      transition: all 0.3s ease;
      animation: slideIn 0.3s ease;
    `;
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Auto-close after duration
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => {
        notification.remove();
      }, 300);
    }, duration);
    
    // Add CSS animation styles if not exists
    if (!document.getElementById('notification-styles')) {
      const style = document.createElement('style');
      style.id = 'notification-styles';
      style.textContent = `
        @keyframes slideIn {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes slideOut {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(400px);
            opacity: 0;
          }
        }
      `;
      document.head.appendChild(style);
    }
  }
  
  // ============================================================================
  // MAIN LOGIC
  // ============================================================================
  
  console.log("🚀 Starting getAllEmptyContainerBoxes...");
  
  // Step 1: Find the target block
  const allBlocks = document.querySelectorAll(SELECTORS.CONTAINER_BLOCK);
  console.log(`🔍 Found ${allBlocks.length} blocks on page`);
  
  let targetBlock = null;
  for (const block of allBlocks) {
    const titleElement = block.querySelector(SELECTORS.CONTAINER_TITLE);
    if (titleElement && titleElement.textContent.includes(TEXT.CONTAINER_PAGE_TITLE)) {
      targetBlock = block;
      console.log(`✅ Found target block: "${titleElement.textContent}"`);
      break;
    }
  }
  
  if (!targetBlock) {
    console.error("❌ Block with title 'Добавьте содержимое в перевозку' not found");
    showNotification("❌ Блок с тарниками не найден", 'error');
    return;
  }
  
  // Step 2: Find all container items
  const items = Array.from(targetBlock.querySelectorAll(SELECTORS.CONTAINER_ITEMS));
  console.log(`🔍 Found ${items.length} potential items in target block`);
  
  // Step 3: Filter by container criteria
  const filteredItems = items.filter(item => {
    const titleWrapElement = item.querySelector(SELECTORS.CONTAINER_TITLE_WRAP);
    const hasVTOrBT = titleWrapElement && (
      titleWrapElement.textContent.includes(TEXT.CONTAINER_VT) ||
      titleWrapElement.textContent.includes(TEXT.CONTAINER_BT)
    );
    
    const rowElement = item.querySelector(SELECTORS.CONTAINER_BARCODE_ROW);
    const has301 = rowElement && rowElement.textContent.includes(TEXT.CONTAINER_BARCODE_301);
    
    return hasVTOrBT || has301;
  });
  
  console.log(`✅ Found ${filteredItems.length} container boxes by criteria`);
  
  // Step 4: Click checkboxes
  let clickedCount = 0;
  for (const item of filteredItems) {
    let input = item.querySelector('input.ozi__checkbox__checkbox__LJWlw');
    if (!input) {
      input = item.querySelector('input.ozi__checkbox__checkbox__dsZ5H');
    }
    
    if (input && typeof input.click === "function") {
      input.click();
      clickedCount++;
      console.log(`✅ Clicked checkbox #${clickedCount}`);
    } else {
      console.warn(`⚠️ Checkbox not found or not clickable in item`, item);
    }
  }
  
  console.log(`✅ Selected ${clickedCount} container boxes out of ${filteredItems.length} found`);
  
  // Show notification (auto-closes after 3 seconds)
  if (clickedCount > 0) {
    showNotification(`✅ Выбрано ${clickedCount} тарных ящиков`, 'success');
  } else {
    showNotification(`⚠️ Не найдено подходящих тарных ящиков`, 'error');
  }
}

/**
 * Selects a fixed number of empty container boxes for transport
 * Выделяет указанное количество пустых тарных ящиков для отправки
 * @param {number} number - Number of container boxes to select
 */
function getAllEmptyContainerBoxesFixed(number) {
  // ============================================================================
  // CONSTANTS
  // ============================================================================
  
  const SELECTORS = {
    CONTAINER_BLOCK: 'div._block_1b09z_1',
    CONTAINER_TITLE: '._breadcrumbsTitle_1014z_8',
    CONTAINER_ITEMS: 'div._element_aug7a_1._list_aug7a_20, div._itemsElement_1b09z_17, div._element_aug7a_1',
    CONTAINER_TITLE_WRAP: '._titleWrap_1ailj_14, ._titleWrap_1dwqc_13',
    CONTAINER_BARCODE_ROW: '._row_1dwqc_6, ._barcode_1ailj_7',
    CONTAINER_CHECKBOX: 'input.ozi__checkbox__checkbox__LJWlw'
  };
  
  const TEXT = {
    CONTAINER_PAGE_TITLE: "Добавьте содержимое в перевозку",
    CONTAINER_VT: "ВТ",
    CONTAINER_BT: "BT",
    CONTAINER_BARCODE_301: "%301%"
  };
  
  // ============================================================================
  // HELPER FUNCTION: Show notification on page
  // ============================================================================
  
  function showNotification(message, type = 'success', duration = 3000) {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      background: ${type === 'success' ? '#4CAF50' : '#F44336'};
      color: white;
      border-radius: 4px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.3);
      z-index: 9999;
      font-size: 14px;
      transition: all 0.3s ease;
      animation: slideIn 0.3s ease;
    `;
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => {
        notification.remove();
      }, 300);
    }, duration);
    
    if (!document.getElementById('notification-styles')) {
      const style = document.createElement('style');
      style.id = 'notification-styles';
      style.textContent = `
        @keyframes slideIn {
          from { transform: translateX(400px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(400px); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }
  }
  
  // ============================================================================
  // MAIN LOGIC
  // ============================================================================
  
  console.log(`🚀 Starting getAllEmptyContainerBoxesFixed with number: ${number}`);
  
  // Step 1: Find the target block
  const allBlocks = document.querySelectorAll(SELECTORS.CONTAINER_BLOCK);
  console.log(`🔍 Found ${allBlocks.length} blocks on page`);
  
  let targetBlock = null;
  for (const block of allBlocks) {
    const titleElement = block.querySelector(SELECTORS.CONTAINER_TITLE);
    if (titleElement && titleElement.textContent.includes(TEXT.CONTAINER_PAGE_TITLE)) {
      targetBlock = block;
      console.log(`✅ Found target block: "${titleElement.textContent}"`);
      break;
    }
  }
  
  if (!targetBlock) {
    console.error("❌ Block with title 'Добавьте содержимое в перевозку' not found");
    showNotification("❌ Блок с тарниками не найден", 'error');
    return;
  }
  
  // Step 2: Find all container items
  const items = Array.from(targetBlock.querySelectorAll(SELECTORS.CONTAINER_ITEMS));
  console.log(`🔍 Found ${items.length} potential items in target block`);
  
  // Step 3: Filter by container criteria
  const filteredItems = items.filter(item => {
    const titleWrapElement = item.querySelector(SELECTORS.CONTAINER_TITLE_WRAP);
    const hasVTOrBT = titleWrapElement && (
      titleWrapElement.textContent.includes(TEXT.CONTAINER_VT) ||
      titleWrapElement.textContent.includes(TEXT.CONTAINER_BT)
    );
    
    const rowElement = item.querySelector(SELECTORS.CONTAINER_BARCODE_ROW);
    const has301 = rowElement && rowElement.textContent.includes(TEXT.CONTAINER_BARCODE_301);
    
    return hasVTOrBT || has301;
  });
  
  console.log(`✅ Found ${filteredItems.length} container boxes by criteria`);
  
  // Step 4: Validate number
  if (number > filteredItems.length) {
    const errorMsg = `Число (${number}) больше количества тарников (${filteredItems.length})`;
    console.warn(errorMsg);
    showNotification(`❌ ${errorMsg}`, 'error');
    return;
  }
  
  console.log(`🎯 Will process ${number} container boxes`);
  
  // Step 5: Click checkboxes for first N items
  let clickedCount = 0;
  for (let i = 0; i < number; i++) {
    const item = filteredItems[i];
    
    let input = item.querySelector('input.ozi__checkbox__checkbox__LJWlw');
    if (!input) {
      input = item.querySelector('input.ozi__checkbox__checkbox__dsZ5H');
    }
    
    if (input && typeof input.click === "function") {
      input.click();
      clickedCount++;
      console.log(`✅ Clicked checkbox #${clickedCount} of ${number}`);
    } else {
      console.warn(`⚠️ Checkbox not found or not clickable in item`, item);
    }
  }
  
  console.log(`✅ Selected ${clickedCount} container boxes out of ${number} requested`);
  
  // Show notification (auto-closes after 3 seconds)
  if (clickedCount > 0) {
    showNotification(`✅ Выбрано ${clickedCount} тарных ящиков из ${number} запрошенных`, 'success');
  } else {
    showNotification(`⚠️ Не найдено подходящих тарных ящиков`, 'error');
  }
}

// ============================================================================
// SECTION 6: EVENT LISTENERS
// Button click handlers
// ============================================================================

startBtn.addEventListener("click", () => {
  executeScriptInActiveTab(
    clickAllGiveOutItemsExceptCheapest,
    [],
    "startBtn (Выдать отделение)"
  );
});

startBtnAll.addEventListener("click", () => {
  executeScriptInActiveTab(
    clickAllGiveOutItems,
    [],
    "startBtnAll (Выдать заказ полностью)"
  );
});

startBtnCount.addEventListener("click", () => {
  const number = parseInt(inputNumber.value, 10);
  
  if (isNaN(number) || number <= 0) {
    alert("Введите корректное число");
    return;
  }
  
  executeScriptInActiveTab(
    clickAllGiveOutItemsFixed,
    [number],
    `startBtnCount (Выдать ${number} отделений)`
  );
});

emptyContainersButton.addEventListener("click", () => {
  executeScriptInActiveTab(
    getAllEmptyContainerBoxes,
    [],
    "emptyContainersButton (Тарники)"
  );
});

emptyContainersButtonFixed.addEventListener("click", () => {
  const number = parseInt(inputContainersNumber.value, 10);
  
  if (isNaN(number) || number <= 0) {
    alert("Введите корректное число");
    return;
  }
  
  executeScriptInActiveTab(
    getAllEmptyContainerBoxesFixed,
    [number],
    `emptyContainersButtonFixed (Тарники ${number} шт.)`
  );
});

if (uncheckGivenOutBtn) {
  uncheckGivenOutBtn.addEventListener("click", () => {
    executeScriptInActiveTab(
      clickAllUncheckGivenOutItems,
      [],
      "uncheckGivenOutBtn (Снять выделение)"
    );
  });
}