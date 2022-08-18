"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const underscore_esm_1 = __importDefault(require("./underscore-esm"));
const SEARCH_QUERY_URL = "https://www.npmjs.com/search?q=";
const NO_OF_RESULTS = 5;
const CX = "717121682ed87481d";
const API_KEY = "AIzaSyD-Q-sJIOezGErSiBYiMkwOEJKAX2BTOno";
let currentQueryString;
let latestDefault = null;
const resultCache = {};
const clearDefault = (queryText) => {
    latestDefault = null;
    const suggestion = queryText
        ? `Search NPM for: <match>${queryText}</match>`
        : "Start typing to search NPM";
    chrome.omnibox.setDefaultSuggestion({ description: suggestion });
};
const setDefaultSuggestion = (result) => {
    latestDefault = result;
    chrome.omnibox.setDefaultSuggestion({ description: result.description });
};
chrome.omnibox.onInputEntered.addListener((queryText) => {
    // Navigate user to selected page or the search page
    console.log("Entered:", queryText);
    let url;
    const isUrl = queryText.indexOf("http://") === 0 || queryText.indexOf("https://") === 0;
    if (isUrl) {
        url = queryText;
    }
    else if (queryText == currentQueryString && !!latestDefault) {
        url = latestDefault.content;
    }
    else {
        var query = queryText.indexOf("[mdn]") == -1
            ? queryText
            : queryText.slice("[mdn]".length);
        url = SEARCH_QUERY_URL + encodeURIComponent(query);
    }
    chrome.tabs.update({ url: url });
});
chrome.omnibox.onInputChanged.addListener(underscore_esm_1.default.debounce((queryText, suggestCallback) => {
    console.log("Changed");
    currentQueryString = queryText;
    function dataHandler(data) {
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
        var results = (0, underscore_esm_1.default)(data.items)
            .chain()
            .first(NO_OF_RESULTS)
            .map(function (item) {
            var description = "<url>" +
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
    }
    else {
        clearDefault(queryText);
    }
    const data = fetch(`https://www.googleapis.com/customsearch/v1?key=${API_KEY}&cx=${CX}&num=${NO_OF_RESULTS}&lr="lang_en"&q=${queryText}`)
        .then((res) => {
        console.log(res);
        return res.json();
    })
        .then((data) => dataHandler(data));
}, 200));
chrome.omnibox.onInputStarted.addListener(() => {
    console.log("Started");
});
chrome.omnibox.onInputCancelled.addListener(() => {
    console.log("Cancelled");
});
