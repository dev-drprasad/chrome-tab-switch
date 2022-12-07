export const styleTags: HTMLLinkElement[] = [];

const collectStyleTags = (linkTag: HTMLLinkElement) => {
  styleTags.push(linkTag);
};

export default collectStyleTags;
