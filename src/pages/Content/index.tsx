import React from 'react';
import { render } from 'react-dom';

import Content from './Content';
import styles from './content.module.scss';

const root = document.createElement('div');
root.classList.add(styles.root);
window.document.querySelector('body')?.appendChild(root);

render(<Content />, root);

if (module.hot) module.hot.accept();
