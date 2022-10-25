import React from 'react';

import { menuConfig } from '../../shared';

import './Popup.css';

const Popup = () => {
  const handleClick = (index, menu) => () => {
    chrome.tabs.query(
      { active: true, lastFocusedWindow: true },
      function (tabs) {
        const tabId = tabs[0]?.id;
        chrome.runtime.sendMessage({
          type: 'REGISTER',
          payload: {
            url: window.location.href,
            belongTo: menu,
            tabId,
            title: menu,
          },
        });
      }
    );
  };
  return (
    <ul>
      {menuConfig.map((menu, index) => (
        <li>
          <button onClick={handleClick(index, menu)}>{menu}</button>
        </li>
      ))}
    </ul>
  );
};

export default Popup;
