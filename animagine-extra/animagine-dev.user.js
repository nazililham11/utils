// ==UserScript==
// @name         Animagine Extra
// @namespace    https://github.com/nazililham11/animagine-extra
// @version      0.5.0
// @description  Additional features for Animagine Space
// @author       nazililham11
// @match        *://*-animagine-xl-3-1.hf.space/*
// @match        *://*-animagine-xl-4-0.hf.space/*
// @grant        none
// ==/UserScript==

import 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getDatabase, ref, query, limitToLast, set, onValue, onChildAdded } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';
import { reactive, createApp, ref as ref$1, computed } from 'https://cdn.jsdelivr.net/npm/vue@3.5.13/dist/vue.esm-browser.js';

//
// Utils
//

const isNumber = (n) => typeof n === "number";
const isObject = (n) => typeof n === "object";
const isArray = (n) => Array.isArray(n);

const createEl = (tagName) => el(document.createElement(tagName));
const queryEl = (query) => el(document.querySelector(query));
function zeroLead(value, digit) {
    return (Array(digit).fill("0").join("") + value).slice(-2)
}
function currentDate() {
    const date = new Date();
    const dateStr = [date.getFullYear(), zeroLead(date.getMonth() + 1, 2), zeroLead(date.getDate(), 2)].join("-");
    const timeStr = [
        zeroLead(date.getHours(), 2),
        zeroLead(date.getMinutes(), 2),
        zeroLead(date.getSeconds(), 2),
        date.getMilliseconds()
    ].join(":");

    return dateStr + " " + timeStr
}
function sanitaizePrompts(prompt) {
    return (prompt + "")
        .split("\n")
        .map((p) => p.trim())
        .filter((p) => p.length > 0)
        .map((p) => (p.endsWith(",") ? p : p + ","))
        .join(" ")
}
function loadExternal(url, timeout = 5000) {
    return new Promise((resolve, reject) => {
        // https://stackoverflow.com/questions/32461271/nodejs-timeout-a-promise-if-failed-to-complete-in-time
        const timer = setTimeout(() => {
            reject(new Error(`load ${url.split("/").pop()} timed out after ${timeout} ms`));
        }, timeout);

        const onLoadCallback = (e) => {
            clearTimeout(timer);
            resolve(e);
        };

        if (url.endsWith(".css")) {
            const style = createEl("link").attrs({ type: "text/css", rel: "stylesheet", href: url }).get();
            style.onload = onLoadCallback;
            document.head.appendChild(style);
        } else if (url.endsWith(".js")) {
            const script = createEl("script").attrs({ defer: "", src: url }).get();
            script.onload = onLoadCallback;
            document.body.appendChild(script);
        }
    })
}
function appendStyle(styleStr, parent = document.head) {
    const style = document.createElement("style");
    style.innerHTML += styleStr;
    parent.appendChild(style);
    return style
}
function inputFile(callback, accept) {
    const fileInput = document.createElement("input");
    fileInput.accept = accept ?? fileInput.accept;
    fileInput.type = "file";
    fileInput.onchange = (e) => readSingleFile(e, callback);
    fileInput.click();
}
// https://stackoverflow.com/questions/3582671/how-to-open-a-local-disk-file-with-javascript
function readSingleFile(e, callback) {
    const file = e.target.files[0];
    if (!file) return

    const reader = new FileReader();
    reader.onload = (e) => callback(e.target.result);
    reader.readAsText(file);
}
function isMobileBrowser() {
    // prettier-ignore
    const phones = "phone|pad|pod|iPhone|iPod|ios|iPad|Android|Mobile|IEMobile|wOSBrowser|BrowserNG|WebOS|Windows Phone".split("|");

    for (const phone of phones) {
        if (navigator.userAgent.indexOf(phone) > -1) return true
    }
    return false
}
function getTimeStr(dateStr) {
    return toDate(dateStr)?.toTimeString().split(" ").shift() ?? "invalid date"
}
function toDate(dateStr) {
    const date = new Date(dateStr);
    return date !== "Invalid Date" && !isNaN(date) ? date : undefined
}
function stringLimit(string, options = {}) {
    let sliced = false;
    if (isNumber(options.maxLine) && string.split("\n").length >= options.maxLine) {
        string = string.split("\n").slice(0, options.maxLine).join("\n");
        sliced = true;
    }
    if (isNumber(options.maxCharacters) && string.length >= options.maxCharacters) {
        string = string.substr(0, options.maxCharacters);
        sliced = true;
    }
    if (sliced) {
        string = string + (options.endStr ?? "...");
    }

    return string
}
const dateComparator = (a, b, dec) => (dec ? -1 : 1 * (new Date(a) - new Date(b)));
const stringComparator = (a, b, dec) => (dec ? -1 : 1 * (a + "").localeCompare(b + ""));
const numberComparator = (a, b, dec) => (dec ? -1 : 1 * ((parseInt(a) || 0) - (parseInt(b) || 0)));

function sort(list, sort_cmd) {
    if (!isArray(list) || list.length < 1) return []

    const [propType, propName] = sort_cmd.split(":");
    const descending = propType.startsWith("-");

    if (propType === "date") return list.sort((a, b) => dateComparator(a[propName], b[propName], descending))
    else if (propType === "num") return list.sort((a, b) => numberComparator(a[propName], b[propName], descending))
    else return list.sort((a, b) => stringComparator(a[propName], b[propName], descending))
}

function el(element) {
    const $this = { get, attrs, styles, html, text, on, copyClassFrom, copyStyleFrom };

    function get() {
        return element
    }
    function attrs(props) {
        for (const prop in props) {
            element.setAttribute(prop, props[prop]);
        }
        return $this
    }
    function styles(styles) {
        for (const style in styles) {
            element.style[style] = styles[style];
        }
        return $this
    }
    function html(value) {
        element.innerHTML = value;
        return $this
    }
    function text(value) {
        element.innerText = value;
        return $this
    }
    function on(eventKey, callback) {
        element.addEventListener(eventKey, callback);
        return $this
    }
    function copyClassFrom(el) {
        element.classList.add(...el.classList);
        return $this
    }
    function copyStyleFrom(el, styleList) {
        const refrences = window.getComputedStyle(el);
        for (const style of styleList) {
            element.style[style] = refrences[style];
        }
        return $this
    }

    return $this
}
function objectExtract(obj, keys) {
    const result = {};
    for (const key of keys) {
        if (typeof obj[key] === "undefined") continue
        result[key] = obj[key];
    }
    return result
}

//
// Animagine
//

function Animagine() {
    const defaultValue = {};
    const elements = {};
    const components = {};
    const version = gradio_config.space_id.split("-").pop() || "unknown";
    const $this = {
        version,
        defaultValue,
        components,
        elements,
        on,
        refresh,
        fillInputs,
        readInputs,
        generate,
        SetDarkMode,
        isDarkMode
    };
    console.log($this);
    console.log(this);

    const callbacks = { onload: function () {}, onrefresh: function () {}, ongenerate: function () {} };

    if (version !== "unknown") console.log("detect animagine version", version);

    function on(eventKey, callback) {
        if (eventKey in callbacks) {
            callbacks[eventKey] = callback;
        }

        if (eventKey === "onload") startPageLoadInspector();
    }

    // prettier-ignore
    function bindComponent(){
        const gc = gradio_config.components;
        const comp = {};

        comp.prompt            = gc.filter((c) => /textbox/.test(c.props.name)  && /^prompt$/i.test(c.props.label)).shift();
        comp.negative_prompt   = gc.filter((c) => /textbox/.test(c.props.name)  && /^negative prompt$/i.test(c.props.label)).shift();
        comp.quality           = gc.filter((c) => /dropdown/.test(c.props.name) && /^quality tags presets$/i.test(c.props.label)).shift(); // only 3.1
        comp.style             = gc.filter((c) => /dropdown|radio/.test(c.props.name) && /^style preset$/i.test(c.props.label)).shift();
        comp.aspec_ratio       = gc.filter((c) => /radio/.test(c.props.name)    && /^aspect ratio$/i.test(c.props.label)).shift();
        comp.width             = gc.filter((c) => /slider/.test(c.props.name)   && /^width$/i.test(c.props.label)).shift();
        comp.height            = gc.filter((c) => /slider/.test(c.props.name)   && /^height$/i.test(c.props.label)).shift();
        comp.upscaler          = gc.filter((c) => /checkbox/.test(c.props.name) && /^use upscaler$/i.test(c.props.label)).shift();
        comp.upscaler_strength = gc.filter((c) => /slider/.test(c.props.name)   && /^strength$/i.test(c.props.label)).shift();
        comp.upscaler_value    = gc.filter((c) => /slider/.test(c.props.name)   && /^upscale by$/i.test(c.props.label)).shift();
        comp.sampler           = gc.filter((c) => /dropdown/.test(c.props.name) && /^sampler$/i.test(c.props.label)).shift();
        comp.seed              = gc.filter((c) => /slider/.test(c.props.name)   && /^seed$/i.test(c.props.label)).shift();
        comp.randomize_seed    = gc.filter((c) => /checkbox/.test(c.props.name) && /^randomize seed$/i.test(c.props.label)).shift();
        comp.guidance_scale    = gc.filter((c) => /slider/.test(c.props.name)   && /^guidance scale$/i.test(c.props.label)).shift();
        comp.steps             = gc.filter((c) => /slider/.test(c.props.name)   && /^number of inference steps$/i.test(c.props.label)).shift();
        comp.images            = gc.filter((c) => /gallery/.test(c.props.name)  && /^result$/i.test(c.props.label)).shift();

        for (const key in comp){
            if (!comp[key]) continue

            const component = comp[key].props;
            component.id = comp[key].id; 
            component.elementId = `#component-${comp[key].id}`;
            
            components[key] = component;
        }
        console.log("props", components);
        
    }
    function bindUI() {
        if (version === "3.1") {
            const [tab1Container, tab2Container] = [...document.querySelectorAll(".tabitem")];
            elements.tab1Container = tab1Container;
            elements.tab2Container = tab2Container;

            const [tab1Button, tab2Button] = [...document.querySelectorAll("button[role=tab")];
            elements.tab1Button = tab1Button;
            elements.tab2Button = tab2Button;

            elements.editorArea = tab1Container;
        } else if (version === "4.0") {
            elements.editorArea = document.querySelector("#component-3");
        }

        elements.generate = [...document.querySelectorAll("button")].filter((el) => el.innerText === "Generate").shift();
        elements.generate.addEventListener("click", () => callbacks.ongenerate());

        for (const key in components) {
            const query = components[key].elementId + (components[key].name === "textbox" ? " textarea" : "");
            elements[key] = [...document.querySelectorAll(query)].shift();
        }

        console.log(elements);
    }
    function refresh() {
        if (version === "3.1") {
            // switch tab to re render the ui :)
            elements.tab2Button?.click();
            setTimeout(() => {
                elements.tab1Button?.click();
                callbacks.onrefresh();
            }, 500);
        }
    }
    function fillInputs(data) {
        for (const key in data) {
            if (key in components) {
                components[key].value = data[key];
            }
        }
    }
    function readInputs() {
        const result = {};
        for (const key in components) {
            result[key] = components[key].value;
        }
        return result
    }
    function init() {
        Object.assign(defaultValue, readInputs());
        bindComponent();
        bindUI();
    }
    function startPageLoadInspector() {
        const scan = setInterval(() => {
            if (!document.getElementById("component-0")) return
            if (typeof gradio_config != "object") return

            clearInterval(scan);
            init();
            callbacks.onload();
        }, 10);
    }
    function generate() {
        elements.generate.click();
    }
    function isDarkMode() {
        return document.body.classList.contains("dark")
    }
    function SetDarkMode(state) {
        const _state = state.toggle ? !isDarkMode() : state === true;
        document.body.classList.toggle("dark", _state);
        refresh();
    }
    return $this
}

//
// Firebase
//
// import { initializeApp } from "firebase/app"
// import { getDatabase, query, limitToLast, onValue, onChildAdded, ref, set, update } from "firebase/database"

var app, database;

function isConnected() {
    return typeof app !== "undefined" && typeof database !== "undefined"
}
function initFirebase(config) {
    if (typeof config != "object") return
    if (Object.keys(config) < 3) return
    if (isConnected()) return

    try {
        app = firebaseapp.initializeApp(config);
        database = getDatabase(app);
        console.log("connected to firebase");
    } catch (e) {
        console.log(e);
    }
}
function initCollection(path, options) {
    if (!isConnected()) return

    const limit = options.limit ?? 100;
    const onlyOnce = options.onlyOnce ?? true;

    const callbacks = { onchange: function () {}, onchildadded: function () {} };

    const collectionRef = ref(database, path);
    const lastHistory = query(collectionRef, limitToLast(limit));

    const $this = { open, on, insert, update };

    function open() {
        onValue(lastHistory, (snapshot) => callbacks.onchange(snapshot), { onlyOnce });
        onChildAdded(lastHistory, (data) => callbacks.onchildadded(data));
        return $this
    }
    function on(eventKey, callback) {
        if (eventKey in callbacks) {
            callbacks[eventKey] = callback;
        }
        return $this
    }
    function insert(key, data) {
        const collectionRef = ref(database, path + key);
        set(collectionRef, data);
        return $this
    }
    function update(key, data) {
        const itemRef = ref(database, path + key);
        update(itemRef);
        return $this
    }

    return $this
}

function LocalCollection(path, limit = 250) {
    let collection = JSON.parse(localStorage.getItem(path) ?? "{}");
    const $this = { save, insert, get, clear };

    function save() {
        localStorage.setItem(path, JSON.stringify(collection));
        return $this
    }
    function insert(key, data) {
        if (key in collection) return

        collection[key] = data;
        limitCollection();
        return $this
    }
    function limitCollection() {
        do {
            let keys = Object.keys(collection).sort();
            if (keys.length >= limit) {
                if (collection[keys.shift()].usage) continue
                delete collection[keys.shift()];
                continue
            }
        } while (false)

        return $this
    }
    function get(key) {
        if (typeof key == "undefined") return collection
        return collection[key]
    }
    function clear() {
        collection = {};
        save();

        return $this
    }

    return $this
}

function localStore(key, initialValue) {
    function get() {
        const value = localStorage.getItem(key);
        if (isArray(initialValue) || isObject(initialValue)) {
            return JSON.parse(value)
        }
        return value
    }
    function set(value) {
        if (isArray(initialValue) || isObject(initialValue)) {
            localStorage.setItem(key, JSON.stringify(value));
        } else {
            localStorage.setItem(key, value);
        }
    }
    if (!(key in localStorage)) {
        set(initialValue);
    }

    return { get, set, type: typeof initialValue }
}

// import { createApp, ref, computed, reactive } from "https://cdn.jsdelivr.net/npm/vue@3.5.13/dist/vue.esm-browser.js"

async function App() {
    // console.log(vue)
    loadExternal("https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css");

    // const VUE_CDN = "https://cdnjs.cloudflare.com/ajax/libs/vue/3.4.32/vue.esm-browser.min.js"
    const MAX_VISIBLE_HISTORY = 500;
    // const { createApp, ref, computed, reactive } = await import(VUE_CDN)

    const Data = reactive({ historyList: [], showedHistory: {} });

    const groupByChoices = "date|usage|aspec_ratio|quality|style|upscale|-".split("|");
    const sortByChoices = "date:date|num:usage|str:aspec_ratio|str:quality|str:style|str:upscale".split("|");

    let searchBoxFocus = function () {};
    let itemOnClickCallback = function () {};

    let currentSortCmd = sortByChoices[0];
    let currentIsAscending = false;
    let currentGroupBy = groupByChoices[0];
    let currentSearchBy = "";
    function renderHistory(sortCmd, isAscending, groupKey, keywords) {
        sortCmd = currentSortCmd = sortCmd ?? currentSortCmd;
        isAscending = currentIsAscending = isAscending ?? currentIsAscending;
        keywords = currentSearchBy = keywords ?? currentSearchBy;
        groupKey = currentGroupBy = groupKey ?? currentGroupBy;

        let result = Data.historyList;
        if (keywords && keywords.length > 0) {
            keywords = keywords.toLowerCase();
            result = result.filter((h) => {
                const payload = Object.values(h).join(" , ").toLowerCase();
                for (const keyword of keywords.split(" ")) {
                    if (payload.indexOf(keyword) == -1) return false
                }
                return true
            });
        }
        if (sortCmd) {
            result = sort(result, (isAscending ? "" : "-") + sortCmd);
        }

        result = result.slice(0, MAX_VISIBLE_HISTORY);

        if (groupKey === "date") {
            result = Object.groupBy(result, ({ date }) => new Date(date).toDateString());
        } else if (typeof groupKey == "string" && groupByChoices.indexOf(groupKey) > -1 && groupKey !== "-") {
            result = Object.groupBy(result, (data) => data[groupKey]);
        } else {
            result = Object.groupBy(result, () => " ");
        }

        Data.showedHistory = Object.entries(result).map(([key, value]) => {
            return { title: key, hide: false, data: value }
        });
    }

    const Dropdown = {
        props: ["items", "label"],
        emits: ["onChange"],
        template: `
            <label class="col">
                <small class="text-secondary text-small">{{ label }}</small>
                <select class="form-control form-control-sm"
                    @change="e => $emit('onChange', e.target.value)">
                    <option v-for="_item of items" :key="_item.value" :value="_item.value">
                        {{ _item.title }}
                    </option>
                </select>
            </label>
        `
    };

    const Header = {
        setup() {
            const search = ref$1(null);
            const onExit = () => hide();
            const onSearch = () => renderHistory(null, null, null, search.value.value);
            const onReset = () => renderHistory(sortByChoices[0], false, groupByChoices[0], "");
            const sortOnChange = (sortCmd) => renderHistory(sortCmd, null, null, null);
            const groupOnChange = (propKey) => renderHistory(null, null, propKey, null);
            const ascendingOnChange = (state) => renderHistory(null, state, null, null);
            const sortChoices = sortByChoices.map((s) => ({ title: s.split(":").pop(), value: s }));
            const groupChoices = groupByChoices.map((s) => ({ title: s, value: s }));

            searchBoxFocus = () => search.value.focus();

            return {
                search,
                sortChoices,
                groupChoices,
                onSearch,
                onReset,
                onExit,
                sortOnChange,
                groupOnChange,
                ascendingOnChange
            }
        },
        components: { Dropdown },
        template: `
            <div class="row m-0 g-3 w-100">
                <div class="col-sm-6 col-12 row align-items-end gap-sm-3 gap-2">
                    <label class="col-auto form-check form-switch my-auto d-flex
                            flex-column align-items-end text-secondary text-small">
                        Asc
                        <input class="form-check-input" type="checkbox"
                            @change="e => ascendingOnChange(e.target.checked)">
                    </label>
                    <Dropdown label="Sort By" :items="sortChoices" @onChange="sortOnChange"/>
                    <Dropdown label="Group By" :items="groupChoices" @onChange="groupOnChange"/>
                </div>

                <div class="col-sm-6 col-12 d-flex align-items-end gap-sm-3 gap-2">
                    <input type="text" class="form-control form-control-sm flex-fill"
                        ref="search" placeholder="Search" @keyup.enter="onSearch">
                    <button class="btn btn-sm btn-outline-primary" @click="onSearch">Search</button>
                    <button class="btn btn-sm btn-outline-primary" @click="onReset">Reset</button>
                    <button class="btn btn-sm btn-outline-primary" @click="onExit">Exit</button>
                </div>
            </div>
        `
    };

    const HistoryItem = {
        props: ["data"],
        setup(props) {
            const timeStr = getTimeStr(props.data.date);
            const onClick = () => itemOnClick(props.data);

            const parsePrompt = (str) => stringLimit(str, { maxLine: 5, maxCharacters: 300 }).replaceAll("\n", "<br>");

            const prompt = parsePrompt(props.data.prompt);
            const negative_prompt = parsePrompt(props.data.negative_prompt);

            return { onClick, timeStr, prompt, negative_prompt }
        },
        template: `
            <button class="card position-relative p-0 btn btn-link text-decoration-none history-item"
                    @click="e => e.stopImmediatePropagation() || onClick()">

                <div class="card-header">
                    <small class="me-1 mb-1 badge border">{{ timeStr }}</small>
                    <small class="me-1 mb-1 badge border">{{ data.aspec_ratio }}</small>
                    <small class="me-1 mb-1 badge border">{{ data.style }}</small>
                    <small class="me-1 mb-1 badge border">{{ data.quality }}</small>
                    <small class="me-1 mb-1 badge border border-success" v-show="data.upscaler">Upscaled</small>
                </div>

                <div class="card-body d-flex flex-wrap">
                    <p class="text-small text-start" v-html="prompt"/>
                    <p class="text-small text-start text-danger" v-html="negative_prompt"/>
                </div>

                <span class="position-absolute top-0 start-100
                        translate-middle badge rounded-pill bg-danger"
                    v-show="data.usage">
                    {{ data.usage }}
                </span>
            </button>
        `
    };

    const HistoryList = {
        setup() {
            const historyList = computed(() => Data.showedHistory);
            const onExit = () => hide();
            return { historyList, onExit }
        },
        components: { HistoryItem },
        template: `
            <template v-for="_group of historyList" :key="_group.title">
                <button class="col-12 text-start mt-4 text-base btn btn-link text-decoration-none fs-5 border-bottom"
                    v-show="(_group.title + '').length"
                    @click="_group.hide = !_group.hide">
                    {{ _group.hide ? '&#x25B8;' : '&#x25BE;' }}
                    {{ _group.title }} ({{ _group.data.length }})
                </button>

                <div class="col-lg-3 col-md-4 col-sm-6 col-12" v-show="!_group.hide"
                    v-for="_history of _group.data" :key="_history.date">
                    <HistoryItem :data="_history" />
                </div>

            </template>
        `
    };

    const App = {
        components: { HistoryList, Header },
        template: `
            <div class="modal-dialog modal-fullscreen modal-dialog-scrollable">
                <div class="modal-content">
                    <div class="modal-header">
                        <Header/>
                    </div>
                    <div class="modal-body">
                        <div class="row g-4">    
                            <HistoryList/>
                        </div>
                    </div>
                </div>
            </div>
        `
    };

    const container = createEl("div").attrs({ id: "app", class: "modal" }).get();

    document.body.append(container);

    createApp(App).mount(container);

    appendStyle(`
        .history-item:hover {
            border-color: rgba(var(--bs-primary-rgb),var(--bs-border-opacity))!important;
        }
        .text-base { color: var(--bs-body-color); }
        .text-small { font-size: .75em; }
    `);

    function on(eventKey, callback) {
        if (eventKey === "itemOnClick") itemOnClickCallback = callback;
    }
    function itemOnClick(data) {
        data["usage"] = (data["usage"] ?? 0) + 1;
        itemOnClickCallback(data);
    }
    function show() {
        container.classList.toggle("d-block", true);
        searchBoxFocus();
    }
    function hide() {
        container.classList.toggle("d-block", false);
    }
    function setHistory(historyList) {
        Data.historyList = historyList;
        renderHistory();
    }
    function addHistory(history) {
        Data.historyList.push(history);
        renderHistory();
    }
    function setDarkMode(state) {
        el(container).attrs({ "data-bs-theme": state ? "dark" : "light" });
    }

    return { show, hide, setHistory, addHistory, on, setDarkMode }
}

function Editor(config) {
    const CM_CDN = "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/";

    let addons = [
        CM_CDN + "addon/search/searchcursor.min.js",
        CM_CDN + "addon/hint/show-hint.min.css",
        CM_CDN + "addon/hint/show-hint.min.js",
        ...(config.addons ?? [])
    ];

    let codemirror, hints, visibleHintLimit;
    let libsLoaded = loadLibs();

    const isMobile = isMobileBrowser();

    const defaultConfig = {
        lineNumbers: true,
        indentUnit: 4,
        extraKeys: { "Alt-Up": "swapLineUp", "Alt-Down": "swapLineDown" },
        styleActiveLine: true,
        lineWrapping: true,
        minLines: 50,
        viewportMargin: 50
    };

    if (config.addons) {
        delete config.addons;
    }

    config = { ...defaultConfig, ...(config ?? {}) };

    async function render(element) {
        await libsLoaded;

        if (element.type === "textarea") {
            codemirror = CodeMirror.fromTextArea(element, config);
        } else {
            const textarea = document.createElement("textarea");
            element.append(textarea);
            codemirror = CodeMirror.fromTextArea(textarea, config);
        }
    }

    async function loadLibs() {
        await Promise.all([loadExternal(CM_CDN + "codemirror.min.js"), loadExternal(CM_CDN + "codemirror.min.css")]);

        const libs = addons.map((lib) => loadExternal(lib));
        await Promise.all(libs);

        return true
    }

    // https://stackoverflow.com/questions/32165851/how-to-enable-code-hinting-using-codemirror
    function showHints() {
        if (!hints || hints.length < 1) return

        CodeMirror.showHint(codemirror, () => {
            let cursor = codemirror.getCursor();
            let line = codemirror.getLine(cursor.line);
            let start = cursor.ch,
                end = cursor.ch;

            while (start > 0 && /\w/.test(line.charAt(start - 1))) --start;
            while (end < line.length && /\w/.test(line.charAt(end))) ++end;

            const word = line.substring(start, end);
            const list = hints
                .filter((item) => item.replaceAll(" ", "").indexOf(word) >= 0)
                .sort((a, b) => {
                    const a_nospace = a.replaceAll(" ", "");
                    const b_nospace = b.replaceAll(" ", "");

                    // Exact check
                    if (b === word) return 4
                    if (a === word) return -4

                    // Same character start
                    if (b_nospace.startsWith(word)) return 3
                    if (a_nospace.startsWith(word)) return -3

                    // Has exact word
                    if (b.split(" ").indexOf(word) > -1) return 2
                    if (a.split(" ").indexOf(word) > -1) return -2

                    // Include word
                    if (b_nospace.indexOf(word) > -1) return 1
                    if (a_nospace.indexOf(word) > -1) return -1

                    // Nothing match
                    return 0
                })
                .slice(0, visibleHintLimit);

            const completion = { list: list, from: CodeMirror.Pos(cursor.line, start), to: CodeMirror.Pos(cursor.line, end) };

            CodeMirror.on(completion, "pick", (selected) => {
                const temp = new Set(hints);
                temp.delete(selected);
                hints = [selected, ...temp];
            });

            return completion
        });
    }

    function initHints(limit = 100) {
        let style = `.CodeMirror-hints { z-index: 100!important; }`;
        visibleHintLimit = limit;

        if (isMobile) {
            style += `
                .CodeMirror-hint {
                    padding-top: 1ch;
                    padding-bottom: 1ch;
                    border-bottom: 1px solid black;
                }
            `;
            codemirror.on("change", (editor, changes) => {
                const key = changes.text?.pop();
                if (changes.origin !== "+input") return
                if (editor.state.completionActive) return
                if (key.toString().trim().length !== 1) return

                showHints();
            });
        } else {
            // https://stackoverflow.com/questions/13744176/codemirror-autocomplete-after-any-keyup
            codemirror.on("keyup", (editor, event) => {
                if (editor.state.completionActive) return
                if (event.key.toString().trim().length !== 1) return

                showHints();
            });
        }

        codemirror.addKeyMap({ "Ctrl-Space": () => showHints() });

        appendStyle(style);
    }

    function addHints(newHints) {
        if (!hints) {
            initHints();
            hints = [];
        }

        hints = [...hints, ...newHints].map((x) => x.replaceAll("\r", "").trim()).filter((x) => x.length > 0);
        hints = [...new Set(hints)];
    }

    function getHints() {
        return hints
    }

    function getCodemirror() {
        return codemirror
    }

    function value() {
        return codemirror.getValue()
    }

    function set(value = "") {
        return codemirror.setValue(value)
    }

    appendStyle(`.CodeMirror { width: 100%; }`);

    return { getCodemirror, showHints, addHints, getHints, loadLibs, render, value, set }
}

const HINTS_URL = ["https://huggingface.co/spaces/cagliostrolab/animagine-xl-3.1/raw/main/wildcard/characterfull.txt"];

const MAX_SAVED_HISTORY = 250;

const CM_CDN = "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/";

const EDITOR_CONFIG = {
    lineNumbers: true,
    styleActiveLine: true,
    lineWrapping: true,
    minLines: 15,
    viewportMargin: 15,
    keyMap: "sublime",
    theme: "material",
    addons: [
        CM_CDN + "keymap/sublime.min.js",
        CM_CDN + "theme/material.min.css",
        CM_CDN + "addon/search/searchcursor.min.js",
        CM_CDN + "addon/hint/show-hint.min.css",
        CM_CDN + "addon/hint/show-hint.min.js"
    ]
};

// usage : how many data clicked on history
// datetime : used as primary key
const STORED_HISTORY_PROPS = "prompt|negative_prompt|quality|style|aspec_ratio|upscaler|usage".split("|");

const FIREBASE_CONFIG = {};

//
// Main
//

const animagine = Animagine();
animagine.on("onload", () => main());

async function main() {
    // Local history data
    //
    // history data stored in key value pair format with datetime as primary key
    //
    // {
    //    "2024-07-06 15:07:28:391" : {
    //        "aspec_ratio"     : "896 x 1152"
    //        "negative_prompt" : "low quality"
    //        "prompt"          : "1girl"
    //        "quality"         : "Cinematic"
    //        "style"           : "Heavy v3.1"
    //        "upscaler"        : false
    //    }
    // }

    const localCollection = LocalCollection("history", MAX_SAVED_HISTORY);

    //
    // Firebase
    //

    let historyCollection;

    function initFirebase$1() {
        const fbCred = JSON.parse(localStorage.getItem("firebase")) ?? FIREBASE_CONFIG;
        initFirebase(fbCred);

        if (!isConnected()) return

        historyCollection = initCollection("/animagine/history/", { limit: MAX_SAVED_HISTORY });
        historyCollection.on("onchildadded", (data) => {
            if (data.key in localCollection.get()) {
                localCollection.get()[data.key] = data.val();
            } else {
                localCollection.insert(data.key, data.val()).save();
            }
            notifyHistoryChanged();
        });
        historyCollection.open();
    }

    //
    // TextEditor
    //

    const editor = Editor(EDITOR_CONFIG);
    await editor.render(animagine.elements.prompt);

    if (editor) {
        editor.getCodemirror().on("keyup", () => {
            animagine.components.prompt.value = sanitaizePrompts(editor.value());
        });
        editor.getCodemirror().addKeyMap({ "Ctrl-Enter": () => animagine.generate() });
    }

    //
    // Hints
    //

    if (editor && "hints" in localStorage) {
        editor.addHints(localStorage.getItem("hints").split("\n"));
        console.log("used hints,", editor.getHints().length, "length");
    }
    if (editor && HINTS_URL.length) {
        const loadedHints = localStore("loadedHints", []);
        for (const url of HINTS_URL) {
            if (loadedHints.get().indexOf(url) > -1) continue

            fetch(url)
                .then((data) => data.text())
                .then((text) => {
                    editor?.addHints(text.split("\n"));
                    loadedHints.set([...loadedHints.get(), url]);
                    localStorage.setItem("hints", editor.getHints().join("\n"));
                    console.log("used hints,", editor.getHints().length, "length");
                });
        }
    }

    //
    // History View
    //

    const historyView = await App();
    historyView.on("itemOnClick", (data) => {
        console.log("selected history", data);

        historyView.hide();
        editor.set(data.prompt);

        animagine.fillInputs(data);
        animagine.refresh();

        localCollection.get()[data.date].usage = data.usage;
        localCollection.save();

        if (isConnected()) {
            historyCollection.update(data.date, objectExtract(data, STORED_HISTORY_PROPS));
            console.log("updated to firebase", key, data);
        }
    });

    //
    // Adjusting animagine UI / behavior with the extra features
    //

    animagine.on("ongenerate", () => {
        console.log("new callback");
        const key = currentDate();
        const data = objectExtract(animagine.readInputs(), STORED_HISTORY_PROPS);
        data.prompt = editor.value();
        localStorage.setItem("hints", editor.getHints().join("\n"));
        localCollection.insert(key, data).save();
        if (isConnected()) {
            historyCollection.insert(key, data);
            console.log("saved to firebase", key);
        }
        notifyHistoryChanged();
    });

    animagine.on("onrefresh", () => {
        editor.set(animagine.components.prompt.value ?? "");
        animagine.components.prompt.value = sanitaizePrompts(animagine.components.prompt.value);

        historyView.setDarkMode(animagine.isDarkMode());

        // Adjust editor style with animagine theme
        el(editor.getCodemirror().getScrollerElement()).styles({ "overflow-x": "auto!important" });
        el(editor.getCodemirror().getWrapperElement()).copyStyleFrom(animagine.elements.prompt, [
            "background",
            "color",
            "borderRadius"
        ]);

        setTimeout(() => {
            editor.getCodemirror().focus();
            editor.getCodemirror().refresh();
        }, 0);
    });

    function notifyHistoryChanged() {
        const itemsObj = localCollection.get();
        const itemsArr = Object.keys(itemsObj)
            .sort()
            .map((key) => ({ ...itemsObj[key], date: key }));

        if (itemsArr.length < 1) return

        historyView.setHistory(itemsArr);

        if (animagine.components.prompt.value.length < 1) {
            animagine.fillInputs(itemsArr[0]);
        }
    }

    initFirebase$1();
    notifyHistoryChanged();

    animagine.refresh();

    const historyBtn = createEl("button")
        .text("History")
        .copyClassFrom(animagine.elements.generate)
        .on("click", () => historyView.show())
        .get();

    const importHintsBtn = createEl("button")
        .text("Import Hint (*.txt)")
        .copyClassFrom(animagine.elements.generate)
        .on("click", () => inputFile((text) => editor?.addHints(text.split("\n"))), ".txt")
        .get();

    const importCredBtn = createEl("button")
        .text("Import Firebase cred (*.json)")
        .copyClassFrom(animagine.elements.generate)
        .on("click", () =>
            inputFile((data) => {
                const fbCred = JSON.parse(data);
                console.log("loaded firebase cred,", fbCred);
                localStorage.setItem("firebase", JSON.stringify(fbCred));
                initFirebase$1();
            }, ".json")
        )
        .get();

    const inputImgBtn = createEl("button")
        .text("Import Parameters From Image (*.png)")
        .copyClassFrom(animagine.elements.generate)
        .on("click", () =>
            inputFile((text) => {
                const paramStr = text.match(/{"prompt":.*"Model hash".*}}/i);
                const param = JSON.parse(paramStr);
                const result = {
                    prompt: param.prompt,
                    negative_prompt: param.negative_prompt,
                    quality: param.quality_tags,
                    aspec_ratio: param.resolution,
                    upscaler: param.use_upscaler
                };
                console.log("loaded image parameters,", param);

                editor.set(result.prompt);
                result.prompt = sanitaizePrompts(result.prompt);

                animagine.fillInputs(result);
                animagine.refresh();
            }, ".png")
        )
        .get();

    const toggleThemeBtn = createEl("button")
        .text("Toggle Theme")
        .copyClassFrom(animagine.elements.generate)
        .on("click", () => animagine.setDarkMode({ toggle: true }))
        .get();

    const btnContainer = createEl("div").styles({ margin: "1rem 0", display: "flex", flexWrap: "wrap", gap: "1rem" }).get();

    btnContainer.append(historyBtn);
    btnContainer.append(importHintsBtn);
    btnContainer.append(importCredBtn);
    btnContainer.append(toggleThemeBtn);
    btnContainer.append(inputImgBtn);
    animagine.elements.editorArea.append(btnContainer);

    queryEl("body").styles({ position: "relative" });
    queryEl(".gradio-container").styles({ "max-width": "100%", margin: "0" });
    queryEl("#component-0").styles({ padding: "0", "max-width": "100%" });

    if (animagine.version == "3.1") {
        queryEl(`[id^="component"][style*="flex-grow"]`).styles({ "flex-grow": "1" });
        queryEl("#title span").styles({ padding: "1rem 2rem", color: "var(--body-text-color)", display: "block", width: "100%" });
        queryEl(`${animagine.components.images.elementId} :first-child`).styles({ "z-index": 80 });
    } else if (animagine.version == "4.0") {
        queryEl(".contain").styles({ margin: "0", maxWidth: "100%" });
    }

    appendStyle(`
        * {
            border-radius: 0!important;
        }
    `);
}
