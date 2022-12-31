import React, { useCallback, useEffect, useRef, useState } from 'react';
import { poll, sleep } from '../../shared';
import { configs } from '../../shared/config';

import './content.styles.css';
import styles from './content.module.scss';
import MenuLeaf from './MenuLeaf';
import Event from './modules/Event';

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

const modifierKeys = new Set(['Alt', 'Meta', 'Control', 'Shift']);

const checkIfModifierKeyPressed = (event: KeyboardEvent) =>
  modifierKeys.has(event.key);

const useDoublePressHold = true;
const shortcutKey = ['Alt'];

const checkIfShouldShow = (keysPressed: Set<string>) => {
  return (
    keysPressed.size === shortcutKey.length &&
    shortcutKey.find(keysPressed.has.bind(keysPressed))
  );
};

const getMenu = async (): Promise<State> => {
  const result = await chrome.storage.local.get('state');
  return result.state;
};

const Content = () => {
  const [state, setState] = useState<State>();
  const [visible, setVisible] = useState<boolean>();
  const errorsRef = useRef<Error[]>([]);
  const keysPressed = useRef(new Set<string>());
  const pressCountRef = useRef(0);

  const handleClick = (tabId: number) => () => {
    Event.switchToTab(tabId).catch(console.error);
  };

  const handleDelete = (tabId: number) => () => {
    Event.removeTab(tabId).catch(console.error);
  };

  const showOrHide = useCallback(async (isSecondPress: boolean) => {
    // const check = !useDoublePressHold || isSecondPress;

    if (checkIfShouldShow(keysPressed.current)) {
      const s = await getMenu();
      setState(s);
      setVisible(true);
    } else {
      setVisible(false);
    }
  }, []);

  const update = useCallback(() => {
    console.log('updating menu... :>>');
    configs.forEach(async (config) => {
      const url = window.location.href;
      console.log('checking any config matching with url :>>', url);
      if (config.urlRegex.exec(url)) {
        const menu = config.filter(window);
        if (menu) {
          try {
            console.log('polling for title :>>');
            const title = await poll<Promise<string>>(
              async () => config.title(window),
              (title) => !!title,
              3000
            ).promise;
            console.log('registering tab :>>');
            await Event.registerTab({ menu, title: title || '', url });
            console.log('tab registered :>>');
          } catch (error) {
            console.log('error :>>', error);
            errorsRef.current.push(error as Error);
          }
        }
      } else {
        console.log('url is not match with config :>>', url, config);
      }
    });
  }, []);

  useEffect(() => {
    update();
  }, [update]);

  // useEffect(() => {
  //   const s = getMenu().then((s) => setState(s));
  // }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      console.log('event.key :>> ', event.key);
      // const isSecondPress = keysPressed.current.has(event.key);
      // if (isSecondPress) {
      //   showOrHide(true);
      //   return;
      // }

      if (checkIfModifierKeyPressed(event)) {
        keysPressed.current.add(event.key);
        pressCountRef.current += 1;
      }
      console.log('pressCountRef.current :>> ', pressCountRef.current);
      if (!useDoublePressHold || pressCountRef.current === 2) {
        showOrHide(false);
      }
    };

    document.addEventListener('keydown', onKeyDown);

    const onKeyUp = async (event: KeyboardEvent) => {
      if (checkIfModifierKeyPressed(event)) {
        const timeout =
          pressCountRef.current === 1 && useDoublePressHold ? 500 : 0;

        await sleep(timeout);

        // -1 can happen if we had hold in one tab, released in other tab
        if (pressCountRef.current !== 0) {
          pressCountRef.current -= 1;
        }
      }
      console.log('pressCountRef.current :>> ', pressCountRef.current);
      if (pressCountRef.current === 0) {
        keysPressed.current.delete(event.key);
        showOrHide(false);
      }
    };
    document.addEventListener('keyup', onKeyUp);

    const onWindowBlur = (event: FocusEvent) => {
      keysPressed.current.clear();
      pressCountRef.current = 0;
      setVisible(false);
    };

    window.addEventListener('blur', onWindowBlur, false);
    window.addEventListener('focusout', onWindowBlur, false);

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
    const handler = async (
      event: { type: string },
      sender: chrome.runtime.MessageSender
    ) => {
      if (event.type === 'UPDATE') {
        console.log('update event received :>>');
        update();
        return;
      }
    };
    chrome.runtime.onMessage.addListener(handler);
    return () => {
      chrome.runtime.onMessage.removeListener(handler);
    };
  }, [update]);

  if (!state) return null;

  return (
    <div
      style={{ visibility: visible ? 'visible' : 'hidden' }}
      className={styles.container}
    >
      <ul className={styles.menu}>
        {Object.entries(state.menu).map(([menuTitle, menuConfig]) => (
          <li className={styles.menuItemContainer} key={menuTitle}>
            <button className={styles.menuBtn}>{menuTitle}</button>
            <ul className={styles.leafs}>
              {menuConfig.map(({ tabId, title }) => (
                <li className={styles.leaftContainer} key={tabId}>
                  <MenuLeaf
                    title={title}
                    onClick={handleClick(tabId)}
                    onRemove={handleDelete(tabId)}
                  />
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
