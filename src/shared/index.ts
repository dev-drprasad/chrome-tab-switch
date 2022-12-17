export const menuConfig = [
  'Current Sprint',
  'Prev Sprint',
  'My PRs',
  'Other PRs',
  'Logs',
];

export const plugins = {
  'https://bitbucket.org/tekion/tekion-web/pull-requests': 'My PRs',
};

type BitBucketState = {
  reduxStoreState: {
    entities: {
      users: {
        [x: string]: undefined | { display_name: string; uuid: string };
      };
      pullRequests: {
        [x: string]:
          | undefined
          | {
              author: string;
            };
      };
    };
  };
};

export interface BitBucketWindow extends Window {
  __ssr_state__: BitBucketState;
}

export type Config = {
  urlRegex: RegExp;
  title: (arg0: Window) => string;
  filter: (arg: Window) => string;
};

export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const poll = <T>(
  funcToRun: () => T,
  condition: (arg0: any) => boolean,
  intervalBetweenRunsInMS = 0
) => {
  let shouldBreak = false;
  const stopPolling = () => {
    shouldBreak = true;
  };
  const promise = (async () => {
    for (;;) {
      // eslint-disable-next-line no-await-in-loop
      const returnValue = await funcToRun();

      if (shouldBreak) break;

      if (condition(returnValue)) {
        return returnValue;
      }
      // eslint-disable-next-line no-await-in-loop
      await sleep(intervalBetweenRunsInMS);
    }
    return undefined;
  })();
  return { promise, stopPolling };
};

// https://gist.github.com/ca0v/73a31f57b397606c9813472f7493a940?permalink_comment_id=3306762#gistcomment-3306762
export const debounce = <F extends (...args: any[]) => any>(
  func: F,
  waitFor: number
) => {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  const debounced = (...args: Parameters<F>) => {
    if (timeout !== null) {
      clearTimeout(timeout);
      timeout = null;
    }
    timeout = setTimeout(() => func(...args), waitFor);
  };

  return debounced as (...args: Parameters<F>) => ReturnType<F>;
};
