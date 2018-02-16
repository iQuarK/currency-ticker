"use strict";

// const CURRENCIES = ["EUR/USD", "USD/CHF", "USD/JPY"];
const CURRENCIES = ["CHF/USD", "CHF/EUR", "CHF/GBP"];
const API_KEY = "NNFLQ241C666YNWL"; //"<here your API key from alphavantage.co>";
const SERVICE = "https://www.alphavantage.co";
const FUNCTION = "CURRENCY_EXCHANGE_RATE";
const KEY = {
    SOURCE: "Realtime Currency Exchange Rate",
    FROM: "1. From_Currency Code",
    TO: "3. To_Currency Code",
    RATE: "5. Exchange Rate",
    REFRESHED_AT: "6. Last Refreshed"
};
const REFRESH_TIME = 7000;
let state = {};

const callAPI = url => {
    return new Promise((resolve, reject) => {
        let xhttp = new XMLHttpRequest();
        xhttp.onreadystatechange = function() {
            if (xhttp.readyState === XMLHttpRequest.DONE) {
                if (xhttp.status === 200) {
                    const json = JSON.parse(this.responseText);
                    resolve(json);
                } else {
                    reject(this.responseText);
                }
            }
        };

        xhttp.open("GET", url, true);
        xhttp.send();
    });
};

const getExchangeRate = (from, to) => {
    return callAPI(
        `${SERVICE}/query?function=${FUNCTION}&from_currency=${from}&to_currency=${to}&apikey=${API_KEY}`
    );
};

const refreshCurrencies = () => {
    console.log("refreshing currencies");
    const length = CURRENCIES.length;

    for (let i = 0; i < length; i++) {
        const [from, to] = CURRENCIES[i].split("/");
        getExchangeRate(from, to)
            .then(updateState)
            .catch(() =>
                console.error("Incorrect data (maybe reached API limit?).")
            );
    }

    tick();
};

const updateState = source => {
    console.log("updatestate");
    if (!!source && source[KEY.SOURCE]) {
        const data = source[KEY.SOURCE];
        console.log("updating status of ", data, "rate", data[KEY.RATE]);
        const exchange = `${data[KEY.FROM]}/${data[KEY.TO]}`;
        const current = state[exchange];
        state[exchange] = {
            value: data[KEY.RATE],
            refreshed: data[KEY.REFRESHED_AT],
            change:
                !!current && !!current.value
                    ? getChange(current, data[KEY.RATE])
                    : "equal"
        };
        const child = document.getElementById("root").childNodes[0];
        console.log("replacing child", child);
        document.getElementById("root").replaceChild(drawTicker(), child);
    } else {
        console.error("incorrect data format");
    }
};

const getChange = (current, nextValue) => {
    console.log("getting change of", current, nextValue);
    let change = "equal";

    if (!!current.value && current.value !== nextValue) {
        change = current.value > nextValue ? "down" : "up";
    }

    return change;
};

const showPrice = currency => {};

// returns the template according to the current state
const drawTicker = () => {
    console.log("drawing");
    const length = CURRENCIES.length;
    let root = document.createElement("div");
    root.id = "ticker";
    root.className = "ticker";

    for (let i = 0; i < length; i++) {
        const currency = CURRENCIES[i];
        if (state[currency]) {
            root.appendChild(drawCell(currency));
        } else {
            root.appendChild(drawLoading(currency));
        }
    }
    console.log("returning root", root);
    return root;
};

const drawCell = currency => {
    let cell = document.createElement("div");
    cell.id = currency;
    cell.className = "currency-cell";
    cell.appendChild(drawRow(currency));
    cell.appendChild(drawBottom(currency));
    return cell;
};

const drawRow = currency => {
    let row = document.createElement("div");
    row.className = "currency";
    row.appendChild(drawName(currency));
    row.appendChild(drawValue(currency));
    return row;
};

const drawBottom = currency => {
    let bottom = document.createElement("div");
    bottom.className = "currency-bottom";
    bottom.appendChild(drawButton(currency));
    bottom.appendChild(drawRefreshed(currency));
    return bottom;
};

const drawButton = currency => {
    let button = document.createElement("button");
    button.className = "currency-button";
    button.innerText = "get price";
    button.onclick = () => showPrice(currency);
    return button;
};

const drawLoading = currency => {
    let name = document.createElement("div");
    name.innerText = `Loading ${currency}...`;
    name.className = "currency-loading";
    return name;
};
const drawName = currency => {
    let name = document.createElement("span");
    name.innerText = currency;
    name.className = "currency-name";
    return name;
};

const drawValue = currency => {
    let value = document.createElement("span");
    value.className = "currency-value";
    console.log(`state ${currency}? ${JSON.stringify(state[currency])}`);
    console.log("rounding", Math.round(state[currency].value * 100) / 100);
    value.className += ` ${state[currency].change}`;
    value.innerHTML =
        Math.round(state[currency].value * 100) / 100 +
        formatChange(state[currency].change);
    return value;
};

const drawRefreshed = currency => {
    let refreshed = document.createElement("div");
    refreshed.className = "currency-refreshed";
    refreshed.innerHTML = state[currency].refreshed;
    return refreshed;
};

const formatChange = change => {
    let code = "=";

    switch (change) {
        case "up":
            code = "&#9650;";
            break;
        case "down":
            code = "&#9660;";
            break;
    }

    return code;
};

const tick = () => {
    console.log("tick");
    setTimeout(refreshCurrencies, REFRESH_TIME);
};
// draws the first screen, and initialises all the timeouts to request data
const init = () => {
    document.getElementById("root").appendChild(drawTicker());
    refreshCurrencies();
};

init();
