// Click the toolbar icon on a Pinterest board -> scan -> open layout.html
const PIN_RE = /^https:\/\/([a-z0-9-]+\.)?pinterest\.[a-z.]+\//i;

function flag(text, title) {
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color: "#c0392b" });
  chrome.action.setTitle({ title });
  setTimeout(() => chrome.action.setBadgeText({ text: "" }), 6000);
}

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab?.id || !PIN_RE.test(tab.url || "")) {
    return flag("!", "Open a Pinterest board first");
  }
  try {
    // Make sure the content script is present (tab opened before install)
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["vendor/jszip.min.js", "content.js"]
    }).catch(() => {});
    const res = await chrome.tabs.sendMessage(tab.id, {
      type: "START_DOWNLOAD",
      exportMode: "layout"
    });
    if (!res?.ok) flag("!", res?.reason || "Could not start");
  } catch (e) {
    flag("!", "Refresh the Pinterest tab and try again");
  }
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type !== "LOCALBOARD_OPEN_LAYOUT") return false;
  chrome.storage.local
    .set({
      a4Session: {
        boardName: msg.boardName,
        boardUrl: msg.boardUrl,
        records: msg.records,
        createdAt: Date.now()
      }
    })
    .then(() => chrome.tabs.create({ url: chrome.runtime.getURL("layout.html") }))
    .then(() => sendResponse({ ok: true }))
    .catch((e) => sendResponse({ ok: false, reason: e.message }));
  return true;
});
