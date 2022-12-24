const send = (payload: any) => {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(payload, (result) => {
      console.log(
        'chrome.runtime.lastError :>> ',
        chrome.runtime.lastError,
        payload
      );
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      }
      resolve(result);
    });
  });
};

const Message = {
  send,
};

export default Message;
