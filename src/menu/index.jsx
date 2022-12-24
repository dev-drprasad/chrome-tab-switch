import { copyToClipboard } from '../utils';

const Menu = ({ close, tab }: Props): JSX.Element => (
    <MenuWrapper>
        <MenuItem onClick={close}>Close</MenuItem>
        <MenuItem onClick={() => copyToClipboard(tab.url)}>Copy URL</MenuItem>
        <MenuItem>{tab.title}</MenuItem>
        <MenuItem>{tab.url}</MenuItem>
    </MenuWrapper>
);
