import Storage from './Storage';

type Config = {
  tabId: number;
  url: string;
  title: string;
};

export type TState = {
  menu: { [x: string]: Config[] };
};

const STATE_KEY = 'state';

const INITIAL_STATE: TState = {
  menu: {},
};

const get = () => {
  return Storage.get<TState>(STATE_KEY);
};

const set = (state: TState) => {
  return Storage.save(STATE_KEY, state);
};

const reset = () => {
  return Storage.save(STATE_KEY, INITIAL_STATE);
};

const State = {
  get,
  set,
  reset,
};

export default State;
