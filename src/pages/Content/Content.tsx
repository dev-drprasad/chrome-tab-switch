import React, { useCallback, useEffect, useRef, useState } from 'react';
import { debounce, poll } from '../../shared';
import { configs } from '../../shared/config';

import styles from './content.module.scss';

type Config = {
  tabId: number;
  url: string;
  title: string;
};
type State = {
  menu: { [x: string]: Config[] };
};

type PushStateFn = (
  data: any,
  unused: string,
  url?: string | URL | null
) => void;

let pustateListeners: PushStateFn[] = [];
var pushState = window.history.pushState;
window.history.pushState = function (...args) {
  pushState.apply(window.history, args);
  pustateListeners.forEach((fn) => fn(...args));
};

const updateMenu = async (menu: string, title: string, url: string) => {
  const payload = {
    type: 'REGISTER',
    payload: {
      url,
      belongTo: menu,
      title,
    },
  };
  return new Promise((resolve, rej) => {
    const timerId = setTimeout(rej, 2000, new Error('Timeout'));
    chrome.runtime.sendMessage(payload, (result) => {
      clearTimeout(timerId);
      resolve(result);
    });
  });
};

const modifierKeys = new Set(['Alt', 'Meta', 'Control', 'Shift']);

const checkIfModifierKeyPressed = (event: KeyboardEvent) =>
  modifierKeys.has(event.key);

const checkIfShouldShow = (keysPressed: Set<string>) => {
  return (
    keysPressed.size === 2 && keysPressed.has('Alt') && keysPressed.has('Shift')
  );
};

const Content = () => {
  const [state, setState] = useState<State>();
  const errorsRef = useRef<Error[]>([]);
  const keysPressed = useRef(new Set<string>());

  const getMenu = async (): Promise<State> => {
    const result = await chrome.storage.local.get('state');
    return result.state;
  };

  const handleClick = (tabId: number) => () => {
    chrome.runtime.sendMessage({
      type: 'CHANGE_ACTIVE_TAB',
      payload: tabId,
    });
  };

  const showOrHide = debounce(async () => {
    if (checkIfShouldShow(keysPressed.current)) {
      const s = await getMenu();
      setState(s);
    } else {
      setState(undefined);
    }
  }, 250);

  const update = useCallback(() => {
    configs.forEach(async (config) => {
      const url = window.location.href;
      if (config.urlRegex.exec(url)) {
        const menu = config.filter(window);
        console.log('menu :>> ', menu);
        if (menu) {
          try {
            const title = await poll<Promise<string>>(
              async () => config.title(window),
              (title) => !!title,
              3000
            ).promise;
            await updateMenu(menu, title || '', url);
          } catch (error) {
            errorsRef.current.push(error as Error);
          }
        }
      }
    });
  }, []);

  useEffect(() => {
    update();
  }, [update]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      console.log('event.key :>> ', event.key);
      if (checkIfModifierKeyPressed(event)) {
        keysPressed.current.add(event.key);
      }
      showOrHide();
    };

    document.addEventListener('keydown', onKeyDown);

    const onKeyUp = (event: KeyboardEvent) => {
      if (checkIfModifierKeyPressed(event)) {
        keysPressed.current.delete(event.key);
      }
      showOrHide();
    };
    document.addEventListener('keyup', onKeyUp);

    const onWindowBlur = (event: FocusEvent) => {
      keysPressed.current.clear();
      setState(undefined);
    };

    window.addEventListener('blur', onWindowBlur, false);

    return () => {
      document.removeEventListener('keydown', onKeyDown, false);
      document.removeEventListener('keyup', onKeyUp, false);
    };
  }, [showOrHide]);

  // useEffect(() => {
  //   pustateListeners.push(() => {
  //     update();
  //   });
  // const handler = (
  //   event: chrome.webNavigation.WebNavigationTransitionCallbackDetails
  // ) => {
  //   update();
  // };
  // chrome.webNavigation.onHistoryStateUpdated.addListener(handler);

  // return () => {
  // chrome.webNavigation.onHistoryStateUpdated.removeListener(handler);
  //     pustateListeners = [];
  //   };
  // }, []);

  useEffect(() => {
    const handler = (event: { type: string }) => {
      if (event.type === 'UPDATE') {
        update();
      }
    };
    chrome.runtime.onMessage.addListener(handler);
    return () => {
      chrome.runtime.onMessage.removeListener(handler);
    };
  }, [update]);

  if (!state) return null;

  return (
    <div className={styles.container}>
      <ul>
        {Object.entries(state.menu).map(([menuTitle, menuConfig]) => (
          <li key={menuTitle}>
            <button>{menuTitle}</button>
            <ul>
              {menuConfig.map(({ tabId, title }) => (
                <li key={tabId}>
                  <button onClick={handleClick(tabId)}>{title}</button>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
      {errorsRef.current.map((error) => error.message)}
    </div>
  );
};

export default Content;
