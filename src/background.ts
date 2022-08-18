import _ from "underscore";

const SEARCH_QUERY_URL = "https://www.npmjs.com/search?q=";
const NO_OF_RESULTS = 5;

const CX = process.env.CX || "";
const API_KEY = process.env.API_KEY || "";

let currentQueryString: string;
let latestDefault: any = null;
const resultCache: any = {};

const clearDefault = (queryText: string | undefined) => {
  latestDefault = null;
  const suggestion = queryText
    ? `Search NPM for: <match>${queryText}</match>`
    : "Start typing to search NPM";
  chrome.omnibox.setDefaultSuggestion({ description: suggestion });
};

const setDefaultSuggestion = (result: any) => {
  latestDefault = result;
  chrome.omnibox.setDefaultSuggestion({ description: result.description });
};

chrome.omnibox.onInputEntered.addListener((queryText: string) => {
  // Navigate user to selected page or the search page
  let url;

  const isUrl =
    queryText.indexOf("http://") === 0 || queryText.indexOf("https://") === 0;

  if (isUrl) {
    url = queryText;
  } else if (queryText == currentQueryString && !!latestDefault) {
    url = latestDefault.content;
  } else {
    var query =
      queryText.indexOf("[mdn]") == -1
        ? queryText
        : queryText.slice("[mdn]".length);
    url = SEARCH_QUERY_URL + encodeURIComponent(query);
  }

  chrome.tabs.update({ url: url });
});

chrome.omnibox.onInputChanged.addListener(
  _.debounce((queryText: string, suggestCallback: any) => {
    currentQueryString = queryText;

    function dataHandler(data: any) {
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

      var results = _(data.items)
        .chain()
        .first(NO_OF_RESULTS)
        .map(function (item: any) {
          var description =
            "<url>" +
            item.htmlFormattedUrl +
            "</url><dim> - " +
            item.htmlTitle +
            "</dim>";
          description = description
            .replace(/<b>/gi, "<match>")
            .replace(/<\/b>/gi, "</match>");
          return {
            content: item.link,
            description: description,
          };
        })
        .push({
          content: "[npm]" + queryText,
          description: `Search NPM for: <match>${queryText}</match>`,
        })
        .value();

      setDefaultSuggestion(results.shift());
      suggestCallback(results);
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
