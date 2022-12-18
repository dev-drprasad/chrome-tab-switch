const save = (key: string, data: any) => {
  console.log(`saving ${key} with`, data);
  chrome.storage.local.set({ [key]: data });
};

const Storage = {
  save,
};

export default Storage;
