/**
 * Background Service Worker for OZONturbo Autochecker
 * 
 * Этот файл работает в фоне расширения и отвечает за:
 * - Периодическую проверку новых версий на GitHub
 * - Сравнение версий
 * - Сохранение информации об обновлениях в chrome.storage
 * 
 * Файл использует Manifest V3 (service worker) и работает независимо от popup.
 */

// ============================================================================
// КОНСТАНТЫ РЕПОЗИТОРИЯ
// ============================================================================

// Информация о репозитории на GitHub
const GITHUB_REPO = {
  owner: "Marq21",
  repo: "autochecker",
  apiUrl: "https://api.github.com/repos/Marq21/autochecker/releases/latest"
};

// Интервал проверки обновлений (30 минут в миллисекундах)
const UPDATE_CHECK_INTERVAL = 30 * 60 * 1000; // 30 минут

// ============================================================================
// ОСНОВНЫЕ ФУНКЦИИ
// ============================================================================

/**
 * Проверяет наличие обновлений на GitHub
 */
async function checkForUpdate() {
  try {
    console.log("🔄 Проверка обновлений...");
    
    // Получаем текущую версию из манифеста расширения
    const currentVersion = chrome.runtime.getManifest().version;
    
    // Запрашиваем последний релиз с GitHub
    const response = await fetch(GITHUB_REPO.apiUrl);
    
    // Проверяем успешность запроса
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const release = await response.json();
    
    // Проверяем, что получили корректные данные о релизе
    if (release.tag_name && isNewerVersion(release.tag_name, currentVersion)) {
      console.log(`📦 Доступна новая версия: ${release.tag_name}`);
      
      // Сохраняем информацию об обновлении
      await saveUpdateInfo({
        updateAvailable: true,
        latestVersion: release.tag_name,
        downloadUrl: release.zipball_url,
        releaseBody: release.body || "Нажмите, чтобы скачать."
      });
    } else {
      console.log("✅ Нет новых обновлений.");
      
      // Очищаем флаг обновления
      await saveUpdateInfo({ updateAvailable: false });
    }
  } catch (error) {
    console.error("❌ Ошибка при проверке обновления:", error.message);
  }
}

/**
 * Сравнивает две версии и определяет, является ли удалённая новее текущей
 * Поддерживает форматы: "1.2.3", "v1.2.3", "1.2", "1"
 * 
 * @param {string} remoteVersion - Версия с GitHub (например, "v1.3.0")
 * @param {string} currentVersion - Текущая версия (например, "1.2.2")
 * @returns {boolean} true если remoteVersion > currentVersion
 */
function isNewerVersion(remoteVersion, currentVersion) {
  // Удаляем префикс 'v' если он есть
  const cleanRemote = remoteVersion.replace(/^v/, '');
  const cleanCurrent = currentVersion.replace(/^v/, '');
  
  // Разбиваем на части и конвертируем в числа
  const remoteParts = cleanRemote.split('.').map(Number);
  const currentParts = cleanCurrent.split('.').map(Number);
  
  // Сравниваем по частям (major.minor.patch)
  const maxLength = Math.max(remoteParts.length, currentParts.length);
  
  for (let i = 0; i < maxLength; i++) {
    const remotePart = remoteParts[i] || 0;
    const currentPart = currentParts[i] || 0;
    
    if (remotePart > currentPart) return true;
    if (remotePart < currentPart) return false;
  }
  
  return false;
}

/**
 * Сохраняет информацию об обновлении в хранилище расширения
 * 
 * @param {Object} updateData - Данные для сохранения
 */
async function saveUpdateInfo(updateData) {
  if (chrome.storage && chrome.storage.local) {
    try {
      await chrome.storage.local.set(updateData);
    } catch (storageError) {
      console.error("❌ Ошибка сохранения в chrome.storage:", storageError);
      Object.assign(globalThis, updateData);
    }
  } else {
    console.warn("⚠️ chrome.storage недоступен, используем глобальные переменные");
    Object.assign(globalThis, updateData);
  }
}

// ============================================================================
// ЗАПУСК ПРОВЕРКИ ОБНОВЛЕНИЙ
// ============================================================================

// Проверяем обновления сразу при запуске
checkForUpdate();

// Планируем периодические проверки каждые 30 минут
setInterval(checkForUpdate, UPDATE_CHECK_INTERVAL);

console.log("✅ Background service worker запущен. Проверка обновлений каждые 30 минут.");