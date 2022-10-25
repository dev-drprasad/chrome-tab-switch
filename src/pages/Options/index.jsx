import React from 'react';
import { render } from 'react-dom';

import Options from './Options';
import './index.css';

const root = document.createElement('div');
window.document.querySelector('body')?.appendChild(root);

render(<Options title={'Settings'} />, root);

if (module.hot) module.hot.accept();
