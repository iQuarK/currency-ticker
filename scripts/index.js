"use strict";

const CURRENCIES = ["EUR/USD", "USD/CHF", "USD/JPY"];
const API_KEY = "<here your API key from alphavantage.co>";
const SERVICE = "https://www.alphavantage.co";
const FUNCTION = {
    EXCHANGE: "CURRENCY_EXCHANGE_RATE",
    PRICES: "MIDPRICE"
};
const KEY = {
    SOURCE: "Realtime Currency Exchange Rate",
    FROM: "1. From_Currency Code",
    TO: "3. To_Currency Code",
    RATE: "5. Exchange Rate",
    REFRESHED_AT: "6. Last Refreshed",
    PRICE_SOURCE: "Meta Data",
    PRICE_SYMBOL: "1: Symbol",
    PRICE_DATA: "Technical Analysis: MIDPRICE",
    PRICE_VALUE: "MIDPRICE"
};
const REFRESH_TIME = 4000;
let state = {};

const id = currency => currency.replace("/", "");

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
        `${SERVICE}/query?function=${
            FUNCTION.EXCHANGE
        }&from_currency=${from}&to_currency=${to}&apikey=${API_KEY}`
    );
};

const getPrices = (from, to) => {
    return callAPI(
        `${SERVICE}/query?function=${
            FUNCTION.PRICES
        }&symbol=${from}${to}&interval=60min&time_period=10&apikey=${API_KEY}`
    );
};

const refreshCurrency = index => {
    const [from, to] = CURRENCIES[index].split("/");

    getExchangeRate(from, to)
        .then(updateState)
        .catch(() =>
            console.error("Incorrect data (maybe reached API limit?).")
        );

    const next = (index + 1) % CURRENCIES.length;
    tick(next);
};

const updateState = source => {
    if (!!source && source[KEY.SOURCE]) {
        const data = source[KEY.SOURCE];
        const exchange = `${data[KEY.FROM]}/${data[KEY.TO]}`;
        const current = state[exchange];
        setState({
            [exchange]: {
                value: data[KEY.RATE],
                refreshed: data[KEY.REFRESHED_AT],
                showPrice: !!current ? current.showPrice : false,
                prices: !!current ? current.prices : [],
                change:
                    !!current && !!current.value
                        ? getChange(current, data[KEY.RATE])
                        : "equal"
            }
        });
    } else {
        console.error("incorrect data format", source);
    }
};

const setState = newState => {
    state = { ...state, ...newState };

    const child = document.getElementById("root").childNodes[0];
    document.getElementById("root").replaceChild(drawTicker(), child);
};

const getChange = (current, nextValue) => {
    let change = "equal";

    if (!!current.value && current.value !== nextValue) {
        change = current.value > nextValue ? "down" : "up";
    }

    return change;
};

const showPrice = currency => {
    setState({
        [currency]: {
            ...state[currency],
            showPrice: !state[currency].showPrice
        }
    });

    if (state[currency].showPrice) {
        const [from, to] = currency.split("/");
        getPrices(from, to)
            .then(data => {
                const meta = data[KEY.PRICE_SOURCE];
                const symbol = meta[KEY.PRICE_SYMBOL];
                const timeline = data[KEY.PRICE_DATA];
                setState({
                    [currency]: {
                        ...state[currency],
                        prices: _.map(timeline, (value, key) => ({
                            date: new Date(key),
                            value: +value[KEY.PRICE_VALUE]
                        }))
                    }
                });
            })
            .catch(data => console.error(data));
    }
};

// returns the template according to the current state
const drawTicker = () => {
    const length = CURRENCIES.length;
    let root = document.createElement("div");
    root.id = "ticker";
    root.className = "ticker";

    if (API_KEY === "<here your API key from alphavantage.co>") {
        root.appendChild(drawMissingAPIKEY());
    } else {
        for (let i = 0; i < length; i++) {
            const currency = CURRENCIES[i];
            if (state[currency]) {
                root.appendChild(drawCell(currency));
            } else {
                root.appendChild(drawLoading(currency));
            }
        }
    }
    return root;
};
const drawMissingAPIKEY = () => {
    let cell = document.createElement("div");
    cell.className = "error";
    cell.innerText =
        "Missing API KEY, please add yours in the constant API_KEY";
    return cell;
};

const drawCell = currency => {
    let cell = document.createElement("div");
    cell.id = id(currency);
    cell.className = "currency-cell";
    cell.appendChild(drawRow(currency));
    cell.appendChild(drawBottom(currency));
    if (state[currency].showPrice) {
        cell.appendChild(drawPrices(currency));
    }
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

const drawPrices = currency => {
    const length = state[currency].prices.length;
    let prices = document.createElement("ul");
    prices.className = "currency-prices";
    if (!length) {
        prices.innerText = "Loading...";
    } else {
        for (let i = 0; i < length; i++) {
            prices.appendChild(drawPrice(state[currency].prices[i]));
        }
    }
    return prices;
};

const drawPrice = price => {
    let row = document.createElement("li");
    row.className = "currency-price";
    row.innerText = `${price.date}: ${price.value}`;
    return row;
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
    value.className += ` ${state[currency].change}`;
    value.innerHTML =
        Math.round(state[currency].value * 100) / 100 +
        parseChange(state[currency].change);
    return value;
};

const drawRefreshed = currency => {
    let refreshed = document.createElement("div");
    refreshed.className = "currency-refreshed";
    refreshed.innerText = `Last refreshed: ${state[currency].refreshed}`;
    return refreshed;
};

const parseChange = change => {
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

// Only one currency is requested each time, because of limits in the API
const tick = index => {
    setTimeout(() => refreshCurrency(index), REFRESH_TIME);
};

// draws the first screen, and initialises all the timeouts to request data
const init = () => {
    document.getElementById("root").appendChild(drawTicker());
    refreshCurrency(0);
};

init();
