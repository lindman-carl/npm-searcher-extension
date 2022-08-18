import { debounce, isValidUrl } from "./utils";

// the code was inspired by the Chrome Extension MDN Search

// env variables
const CX = process.env.CX || "";
const API_KEY = process.env.API_KEY || "";

// global constants
const SEARCH_QUERY_URL = "https://www.npmjs.com/search?q=";
const NO_OF_RESULTS = 5;

// globals
let currentQueryString: string;
let lastDefault: any = null;
const resultCache: any = {};

const clearDefault = (queryText: string | undefined) => {
  // clears default suggestion
  lastDefault = null;
  const suggestion = queryText
    ? `Search npmjs.com for: <match>${queryText}</match>`
    : "Start typing to search NPM";

  chrome.omnibox.setDefaultSuggestion({ description: suggestion });
};

const setDefaultSuggestion = (result: any) => {
  lastDefault = result;
  chrome.omnibox.setDefaultSuggestion({ description: result.description });
};

chrome.omnibox.onInputEntered.addListener((queryText: string) => {
  // when a user submits a string "presses enter"
  let url;
  const isUrl = isValidUrl(queryText);

  // make sure query is a url
  // TODO: Regex
  // const isUrl =
  //   queryText.indexOf("http://") === 0 || queryText.indexOf("https://") === 0;

  // check if queryText is url

  if (isUrl) {
    url = queryText;
  } else if (queryText === currentQueryString && !!lastDefault) {
    url = lastDefault.content;
  } else {
    const query =
      queryText.indexOf("[mdn]") == -1
        ? queryText
        : queryText.slice("[mdn]".length);
    url = SEARCH_QUERY_URL + encodeURIComponent(query);
  }

  // navigate to url
  chrome.tabs.update({ url: url });
});

chrome.omnibox.onInputChanged.addListener(
  debounce((queryText: string, suggestCallback: any) => {
    currentQueryString = queryText;

    function dataHandler(data: any) {
      if (data && !data.error) {
        // set cache
        resultCache[queryText] = data;
      }

      if (currentQueryString !== queryText) {
        // went past this query
        return;
      }

      if (!data.items) {
        // no packages found with query
        chrome.omnibox.setDefaultSuggestion({
          description: `No results found for: <match>${queryText}</match>`,
        });
        return;
      }

      const results = data.items.map((el: any) => {
        // format results with omnibox tags.
        const description = `<url>${el.htmlFormattedUrl}</url><dim> - ${el.htmlTitle}</dim>`;
        const formattedDescription = description
          .replace(/<b>/gi, "<match>")
          .replace(/<\/b>/gi, "</match>");

        return {
          content: el.link,
          description: formattedDescription,
        };
      });

      // add link to npmjs search results page
      results.push({
        content: "[npm]" + queryText,
        description: `Search npmjs.com for: <match>${queryText}</match>`,
      });

      setDefaultSuggestion(results[0]);
      suggestCallback(results.slice(1));
    }

    // if the user has cleared the string
    if (!queryText) {
      clearDefault(queryText);
      return;
    }

    // check cache
    if (resultCache[queryText]) {
      dataHandler(resultCache[queryText]);
      return;
    } else {
      clearDefault(queryText);
    }

    // get data from Google custom search engine
    // this could get expensive if there are many users
    const data = fetch(
      "https://www.googleapis.com/customsearch/v1?" +
        new URLSearchParams({
          key: API_KEY,
          cx: CX,
          num: NO_OF_RESULTS.toString(),
          lr: "lang_en",
          q: queryText,
        })
    )
      .then((res) => res.json())
      .then((data) => dataHandler(data));
  }, 250)
);
