// const registry = {};

import { configs, deduplicates } from '../../shared/config';

type Config = {
  tabId: number;
  url: string;
  title: string;
};

type State = {
  menu: { [x: string]: Config[] };
};

// const state: State = { menu: {} };

// chrome.tabs.query({ lastFocusedWindow: true }, (tabs) => {
//   for (let i = 0; i < tabs.length; i++) {
//     const tab = tabs[i];
//     if (tab.url) {
//       registry[tab.url] = tab.id;
//     }
//   }
// });

type RegisterPayload = {
  url: string;
  belongTo: string;
  title: string;
  tabId?: number;
};

type TabIDByURL = { [x: string]: string };

const updateURLByTabId = (tabId: number, url: string) => {
  return new Promise((resolve) => {
    chrome.storage.local.get('state', (result) => {
      const state: State = result.state || { menu: {} };
      Object.entries(state.menu).forEach(([menu, configs]) => {
        const config = configs.find((config) => config.tabId === tabId);
        if (config?.url) {
          config.url = url;
          console.log('updating url ', config);
          state.menu[menu] = configs;
          chrome.storage.local.set({ state }, () => resolve(undefined));
        }
      });
    });
  });
};

const removeTabId = (tabId: number) => {
  chrome.storage.local.get('state', (result) => {
    const state: State = result.state;
    Object.entries(state.menu).forEach(([menu, configs]) => {
      const validConfigs = configs.filter((config) => config.tabId !== tabId);

      state.menu[menu] = validConfigs;
      chrome.storage.local.set({ state });
    });
  });
};

chrome.tabs.query({ lastFocusedWindow: true }, (tabs) => {
  const tabIdByURL: TabIDByURL = {};
  tabs.forEach((tab) => {
    console.log('tab :>> ', tab);
    if (!tab.id || !tab.url) return;
    tabIdByURL[tab.id] = tab.url;
  });
  chrome.storage.local.set({ tabIdByURL });
});

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  console.log('data :>> ', request);
  if (request.type === 'CHANGE_ACTIVE_TAB') {
    chrome.tabs.update(request.payload, { active: true });
  }

  if (request.type === 'REGISTER') {
    const {
      url,
      belongTo,
      title,
      tabId: eventTabId,
    } = request.payload as RegisterPayload;

    chrome.storage.local.get('state', (result) => {
      const state: State = result.state || { menu: {} };
      console.log('state :>> ', state);
      console.log('sender.tab?.id :>> ', sender.tab?.id);
      const tabId = sender.tab?.id || eventTabId;
      if (!tabId) {
        console.error('no tab present. request is :>>', request);
        return;
      }
      const configs = state.menu[belongTo] || [];
      const existingTab = configs.find((config) => config.tabId === tabId);
      if (existingTab) {
        existingTab.url = url;
        existingTab.title = title;
      } else {
        configs.push({
          tabId: tabId,
          url,
          title,
        });
      }
      state.menu[belongTo] = configs;
      chrome.storage.local.set({ state });
    });
  }
});

const closeMatchedTab = (
  currentTabId: number,
  regex: RegExp,
  match: string
) => {
  chrome.tabs.query({ currentWindow: true }, (tabs) => {
    const existingTab = tabs.find((tab) => {
      const url = tab.url;
      const tabId = tab.id;
      if (!url || !tabId) return false;
      if (currentTabId === tabId) return false;
      return (regex.exec(url) || [])[1] === match;
    });
    console.log('existingTab :>> ', existingTab);
    if (!existingTab?.id) return;
    chrome.tabs.remove(existingTab.id);
    removeTabId(existingTab.id);
  });
};

const closeDuplicateTab = (tabId: number, url: string) => {
  deduplicates.forEach((deduplicateRegex) => {
    const match = deduplicateRegex.exec(url || '');
    console.log('match :>> ', match);
    if (match) {
      closeMatchedTab(tabId, deduplicateRegex, match[1]);
      return;
    }
  });
};

chrome.tabs.onCreated.addListener((tab) => {
  const url = tab.url || tab.pendingUrl;
  const tabId = tab.id;
  if (!url || !tabId) return;

  closeDuplicateTab(tabId, url);
});

chrome.tabs.onUpdated.addListener(async (tabId, change) => {
  const url = change.url;
  if (url) {
    await updateURLByTabId(tabId, url);
    closeDuplicateTab(tabId, url);
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  console.log('tabId :>> ', tabId);
  removeTabId(tabId);
});

chrome.webNavigation.onHistoryStateUpdated.addListener((event) => {
  console.log('event :>> ', event);
  for (let i = 0; i < configs.length; i++) {
    const config = configs[i];
    const url = event.url;
    if (config.urlRegex.exec(url)) {
      chrome.tabs.sendMessage(event.tabId, { type: 'UPDATE' });
      return;
    }
  }

  removeTabId(event.tabId);
});
