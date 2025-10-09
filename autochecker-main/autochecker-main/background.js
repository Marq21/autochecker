const owner = "Marq21";
const repo = "autochecker";
const GITHUB_API_URL = `https://api.github.com/repos/${owner}/${repo}/releases/latest`;

// Получаем текущую версию из манифеста
const currentVersion = chrome.runtime.getManifest().version;

async function checkForUpdate() {
  try {
    const response = await fetch(GITHUB_API_URL);
    const release = await response.json();

    if (release.tag_name && isNewerVersion(release.tag_name, currentVersion)) {
      console.log(`📦 Доступна новая версия: ${release.tag_name}`);
      
      // Сохраняем информацию о новой версии
      if (chrome.storage && chrome.storage.local) {
        await chrome.storage.local.set({ 
          updateAvailable: true,
          latestVersion: release.tag_name,
          downloadUrl: release.zipball_url,
          releaseBody: release.body || "Нажмите, чтобы скачать."
        });
      } else {
        console.warn("❌ chrome.storage не доступен, сохраняем в память.");
        globalThis.updateAvailable = true;
        globalThis.latestVersion = release.tag_name;
        globalThis.downloadUrl = release.zipball_url;
        globalThis.releaseBody = release.body || "Нажмите, чтобы скачать.";
      }
    } else {
      console.log("🔄 Нет новых обновлений.");
      if (chrome.storage && chrome.storage.local) {
        await chrome.storage.local.set({ updateAvailable: false });
      } else {
        globalThis.updateAvailable = false;
      }
    }
  } catch (error) {
    console.error("❌ Ошибка при проверке обновления:", error);
  }
}

function isNewerVersion(remote, current) {
  const cleanRemote = remote.replace(/^v/, '');
  const cleanCurrent = current.replace(/^v/, '');

  const rParts = cleanRemote.split('.').map(Number);
  const cParts = cleanCurrent.split('.').map(Number);

  const maxLength = Math.max(rParts.length, cParts.length);

  for (let i = 0; i < maxLength; i++) {
    const r = rParts[i] || 0;
    const c = cParts[i] || 0;

    if (r > c) return true;
    if (r < c) return false;
  }

  return false;
}

// Проверяем каждые 30 минут
setInterval(checkForUpdate, 30 * 60 * 1000);

// Проверяем при запуске
checkForUpdate();