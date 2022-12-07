import React from 'react';

import styles from './menuLeaf.module.scss';

type Props = {
  title: string;
  onClick: () => void;
  onRemove: () => void;
};

const MenuLeaf = ({ title, onClick, onRemove }: Props) => {
  return (
    <>
      <button className={styles.menuLeaft} role={'button'} onClick={onClick}>
        <h4 className={styles.title}>{title}</h4>
      </button>
      <button className={styles.removeBtn} onClick={onRemove}>
        X
      </button>
    </>
  );
};

export default MenuLeaf;
