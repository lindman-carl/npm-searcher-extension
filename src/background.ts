import { debounce } from "./utils";

// env variables
const CX = process.env.CX || "";
const API_KEY = process.env.API_KEY || "";

// global constants
const SEARCH_QUERY_URL = "https://www.npmjs.com/search?q=";
const NO_OF_RESULTS = 5;

let currentQueryString: string;
let latestDefault: any = null;
const resultCache: any = {};

const clearDefault = (queryText: string | undefined) => {
  latestDefault = null;
  const suggestion = queryText
    ? `Search NPM ss for: <match>${queryText}</match>`
    : "Start typing to search NPM";
  chrome.omnibox.setDefaultSuggestion({ description: suggestion });
};

const setDefaultSuggestion = (result: any) => {
  latestDefault = result;
  chrome.omnibox.setDefaultSuggestion({ description: result.description });
};

chrome.omnibox.onInputEntered.addListener((queryText: string) => {
  let url;

  const isUrl =
    queryText.indexOf("http://") === 0 || queryText.indexOf("https://") === 0;

  if (isUrl) {
    url = queryText;
  } else if (queryText == currentQueryString && !!latestDefault) {
    url = latestDefault.content;
  } else {
    const query =
      queryText.indexOf("[mdn]") == -1
        ? queryText
        : queryText.slice("[mdn]".length);
    url = SEARCH_QUERY_URL + encodeURIComponent(query);
  }

  chrome.tabs.update({ url: url });
});

chrome.omnibox.onInputChanged.addListener(
  debounce((queryText: string, suggestCallback: any) => {
    currentQueryString = queryText;

    function dataHandler(data: any) {
      console.log(data);
      if (data && !data.error) {
        resultCache[queryText] = data;
      }

      if (currentQueryString !== queryText) {
        // We went past this query
        return;
      }

      if (!data.items) {
        chrome.omnibox.setDefaultSuggestion({
          description: `No results found for: <match>${queryText}</match>`,
        });
        return;
      }

      const results = data.items.map((el: any) => {
        const description = `<url>${el.htmlFormattedUrl}</url><dim> - ${el.htmlTitle}</dim>`;
        const formattedDescription = description
          .replace(/<b>/gi, "<match>")
          .replace(/<\/b>/gi, "</match>");

        return {
          content: el.link,
          description: formattedDescription,
        };
      });

      results.push({
        content: "[npm]" + queryText,
        description: `Search npmjs.com for: <match>${queryText}</match>`,
      });

      setDefaultSuggestion(results[0]);
      suggestCallback(results.slice(1));
    }

    if (!queryText) {
      clearDefault(queryText);
      return;
    }

    // Check if we cached results for this query
    if (resultCache[queryText]) {
      dataHandler(resultCache[queryText]);
      return;
    } else {
      clearDefault(queryText);
    }

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
  }, 200)
);
