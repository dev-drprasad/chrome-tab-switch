// const registry = {};

import { deduplicates } from '../../shared/config';
import State, { TState } from './State';

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

type DeletePayload = {
  tabId: number;
};

type TabIDByURL = { [x: string]: string };

const reloadAllTabs = (windowId: number | undefined) => {
  return new Promise((resolve, reject) => {
    chrome.windows.getAll((windows) => {
      chrome.tabs.query({ windowId: windowId }).then((tabs) => {
        const reloadPromises = tabs.map((tab) => {
          return tab.id ? chrome.tabs.reload(tab.id) : Promise.resolve();
        });
        Promise.all(reloadPromises).then(resolve).catch(reject);
        // chrome.storage.local.get('state', (result) => {
        //   const state: State = result.state;
        //   if (tabs.length === state.tabs.length) {

        //   }
        // })
      });
    });
  });
};

const handleWindowCreated = (window: chrome.windows.Window) => {
  reloadAllTabs(window.id);
};

(async () => {
  console.log('script initialized :>>');
  await State.reset();
  console.log('reloading tabs :>>');
  await reloadAllTabs(undefined);
  chrome.windows.onCreated.addListener(handleWindowCreated);
})();

const updateURLByTabId = async (tabId: number, url: string) => {
  let state: TState = { menu: {} };
  state = await State.get();

  let isURLUpdated = false;
  Object.entries(state.menu).forEach(([menu, configs]) => {
    const config = configs.find((config) => config.tabId === tabId);
    if (config?.url) {
      config.url = url;
      config.title = ''; // if URL changes, then title might change, resetting here. we get new title by sending event to content script
      console.log('updating url ', config);
      state.menu[menu] = configs;
      isURLUpdated = true;
    }
  });

  await State.set(state);
  return isURLUpdated;
};

const removeTabId = async (tabId: number) => {
  console.log(`removing tab with id ${tabId}`);
  let state: TState;
  try {
    state = await State.get();
  } catch (error) {
    console.log('error :>> ', error);
    return;
  }

  Object.entries(state.menu).forEach(([menu, configs]) => {
    const validConfigs = configs.filter((config) => config.tabId !== tabId);
    state.menu[menu] = validConfigs;
  });

  try {
    State.set(state);
  } catch (error) {
    console.log('error :>> ', error);
  }
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
    chrome.tabs.update(request.payload, { active: true }).then(sendResponse);
    return;
  }

  if (request.type === 'REGISTER') {
    const {
      url,
      belongTo,
      title,
      tabId: eventTabId,
    } = request.payload as RegisterPayload;

    chrome.storage.local.get('state', (result) => {
      const state: TState = result.state || { menu: {} };
      console.log('state :>> ', state);
      console.log('sender.tab?.id :>> ', sender.tab?.id);
      const tabId = sender.tab?.id || eventTabId;
      if (!tabId) {
        console.error('no tab present. request is :>>', request);
        sendResponse(new Error(`no tab present with ${tabId}`));
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
      State.set(state).then(sendResponse);
      return;
    });
  }

  if (request.type === 'DELETE') {
    const eventTabId = request.payload as number;
    removeTabId(eventTabId);
    sendResponse();
    return;
  }

  sendResponse(new Error(`not valid event ${JSON.stringify(request)}`));
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
  console.log('tab created');
  const url = tab.url || tab.pendingUrl;
  const tabId = tab.id;
  if (!url || !tabId) return;

  closeDuplicateTab(tabId, url);
});

chrome.tabs.onUpdated.addListener(async (tabId, change) => {
  console.log('tab updated', change);
  const url = change.url;

  // if URL present, it means navigation. else there is navigation
  if (url) {
    try {
      const isURLUpdated = await updateURLByTabId(tabId, url);
      console.log('isURLUpdated :>> ', isURLUpdated);
    } catch (error) {
      console.log('error :>> ', error);
    }

    // if page reloads completely, the we are lucky. content script runs and REGISTER the tab
    // if page just updates history, then we need to send event to REGISTER again
    chrome.tabs.sendMessage(tabId, { type: 'UPDATE' }, () => {
      if (chrome.runtime.lastError) {
        console.log(
          'failed to send UPDATE to content script :>> ',
          chrome.runtime.lastError
        );
      }
    });

    closeDuplicateTab(tabId, url);
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  removeTabId(tabId);
});

// chrome.webNavigation.onHistoryStateUpdated.addListener((event) => {
// console.log('event :>> ', event.transitionType);
//   for (let i = 0; i < configs.length; i++) {
//     const config = configs[i];
//     const url = event.url;
//     if (config.urlRegex.exec(url)) {
//       chrome.tabs.sendMessage(event.tabId, { type: 'UPDATE' });
//       return;
//     }
//   }

// removeTabId(event.tabId);
// });
