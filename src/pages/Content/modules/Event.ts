import Message from './Message';

const registerTab = ({
  url,
  menu,
  title,
}: {
  url: string;
  menu: string;
  title: string;
}) => {
  const payload = {
    type: 'REGISTER',
    payload: {
      url,
      belongTo: menu,
      title,
    },
  };
  return Message.send(payload);
};

const switchToTab = (tabId: number) => {
  return Message.send({
    type: 'CHANGE_ACTIVE_TAB',
    payload: tabId,
  });
};

const removeTab = (tabId: number) => {
  return Message.send({
    type: 'DELETE',
    payload: tabId,
  });
};

const Event = {
  registerTab,
  switchToTab,
  removeTab,
};

export default Event;
