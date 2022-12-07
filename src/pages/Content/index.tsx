import React from 'react';
import { render } from 'react-dom';

import Content from './Content';
// import styles from './content.module.scss';
import { styleTags } from '../../styles';

console.log('styleTags :>> ', styleTags);

const shadowHost = document.createElement('div');
// shadowHost.classList.add(styles.host);
// shadowHost.style.position = 'fixed';
// shadowHost.style.top = '0';
// shadowHost.style.width = '100%';

const shadowContainer = shadowHost?.attachShadow({ mode: 'open' });

const reactRoot = document.createElement('div');
shadowContainer?.append(...styleTags, reactRoot);

render(<Content />, reactRoot);

document.body.appendChild(shadowHost);

if (module.hot) module.hot.accept();
