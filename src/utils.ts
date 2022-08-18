export function debounce<F extends (...params: any[]) => void>(
  fn: F,
  delay: number
) {
  // from github
  let timeoutID: NodeJS.Timeout;
  return function (this: any, ...args: any[]) {
    clearTimeout(timeoutID);
    timeoutID = setTimeout(() => fn.apply(this, args), delay);
  } as F;
}

export const isValidURL = (string: string): boolean => {
  let url;

  try {
    // throws exception if invalid
    url = new URL(string);
  } catch (_) {
    return false;
  }

  return url.protocol === "http:" || url.protocol === "https:";
};
