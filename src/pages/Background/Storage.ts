const save = (key: string, data: any) => {
  console.log(`saving ${key} with`, data);
  return chrome.storage.local.set({ [key]: data });
};

const get = async <T>(key: string) => {
  const result = await chrome.storage.local.get(key);
  return result[key] as T;
};

const Storage = {
  save,
  get,
};

export default Storage;
