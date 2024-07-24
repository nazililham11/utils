// ==UserScript==
// @name         Animagine Extra
// @namespace    https://github.com/nazililham11/animagine-extra
// @version      0.3.0
// @description  Additional features for Animagine Space
// @author       nazililham11
// @match        *-animagine-xl-3-1.hf.space/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // 
    // Utils
    // 

    async function loadTxtList(url){
        return await fetch(url).then(data => data.text()).then(text => txtToList(text))
    }
    function txtToList(txt){
        return txt.split('\n')
            .map(x => x.replaceAll('\r', '').trim())
            .filter(x => x.length > 0)
    }
    function zeroLead(value, digit){
        return (
            Array(digit).fill("0").join('') + value
        ).slice(-digit)
    }
    function currentDate(){
        const date = new Date();

        const dateStr = [
            date.getFullYear(),
            zeroLead((date.getMonth() + 1), 2),
            zeroLead(date.getDate(), 2)
        ].join('-');

        const timeStr = [
            zeroLead(date.getHours(), 2),
            zeroLead(date.getMinutes(), 2),
            zeroLead(date.getSeconds(), 2),
            date.getMilliseconds()
        ].join(':');

        return dateStr + " " + timeStr
    }
    function sanitaizePrompts(prompt){
        return (prompt + '')
            .split('\n')
            .map(p => p.trim())
            .filter(p => p.length > 0)
            .map(p => p.endsWith(',') ? p : p + ',')
            .join(' ')
    }
    function loadExternal(url, timeout = 5000) {
        return new Promise((resolve, reject) => {

            // https://stackoverflow.com/questions/32461271/nodejs-timeout-a-promise-if-failed-to-complete-in-time
            const timer = setTimeout(() => {
                reject(new Error(`load ${url.split('/').pop()} timed out after ${timeout} ms`));
            }, timeout);

            const onLoadCallback = (e) => {
                clearTimeout(timer);
                resolve(e);
            };

            if (url.endsWith('.css')){
                const style = createEl('link')
                    .attrs({ 'type': 'text/css', 'rel': 'stylesheet', 'href': url })
                    .get();
                style.onload = onLoadCallback;
                document.head.appendChild(style);

            } else if (url.endsWith('.js')){
                const script = createEl('script').attrs({ 'defer': '', 'src': url, }).get();
                script.onload = onLoadCallback;
                document.body.appendChild(script);
            }
        })
    }
    function appendStyle(styleStr, parent = document.head) {
        const style = document.createElement('style');
        style.innerHTML += styleStr;
        parent.appendChild(style);
        return style
    }
    function inputFile(callback, accept){
        const fileInput = document.createElement('input');
        fileInput.accept = accept ?? fileInput.accept;
        fileInput.type = 'file';
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
    function isMobileBrowser(){
        const phones = [
            'phone|pad|pod|iPhone|iPod|ios|iPad|Android',
            'Mobile|BlackBerry|IEMobile|MQQBrowser|JUC|Fennec',
            'wOSBrowser|BrowserNG|WebOS|Symbian|Windows Phone',
        ].join('|').split('|');

        for (const phone of phones){
            if (navigator.userAgent.indexOf(phone) > -1) return true
        }
        return false
    }
    function getTimeStr(dateStr, defaultVal = '-'){
        return toDate(dateStr)?.toTimeString().split(' ').shift() ?? defaultVal
    }
    function toDate(dateStr){
        const date = new Date(dateStr);
        return (date !== "Invalid Date") && !isNaN(date) ? date : undefined
    }
    function stringLimit(string, options = {}){
        let sliced = false;
        if (typeof options.maxLine == 'number'
            && string.split('\n').length >= options.maxLine
        ){
            string = string.split('\n').slice(0, options.maxLine).join('\n');
            sliced = true;
        }
        if (typeof options.maxCharacters == 'number'
            && string.length >= options.maxCharacters
        ){
            string = string.substr(0, options.maxCharacters);
            sliced = true;
        }
        if (sliced){
            string = string + (options.endStr ?? '...');
        }

        return string
    }
    function groupBy(list, groupBy){
        if (!Array.isArray(list)) list = [];

        groupBy = groupBy ?? function(){};

        const result = new Map();
        for (const item of list){
            const key = groupBy(item) ?? 'Unknown';
            if (!result.has(key)) result.set(key, []);

            result.get(key).push(item);
        }
        return result
    }
    function sort(list, sort_cmd){
        if (!Array.isArray(list) || list.length < 1) return []

        const [propType, propName] = sort_cmd.split(":");
        const descending = propType.startsWith('-');

        const sortDate = (a, b) => new Date(a[propName]) - new Date(b[propName]);
        const sortString = (a, b) => (a[propName] + '').localeCompare(b[propName] + '');
        const sortNumber = (a, b) => (parseInt(a[propName]) || 0) - (parseInt(b[propName]) || 0);

        if (descending){
            if (propType.endsWith('num')) return list.sort((a, b) => sortNumber(b, a))
            if (propType.endsWith("date")) return list.sort((a, b) => sortDate(b, a))
            if (propType.endsWith('str')) return list.sort((a, b) => sortString(b, a))
        } else {
            if (propType.endsWith('num')) return list.sort((a, b) => sortNumber(a, b))
            if (propType.endsWith("date")) return list.sort((a, b) => sortDate(a, b))
            if (propType.endsWith('str')) return list.sort((a, b) => sortString(a, b))
        }

        return list
    }

    function el(element){
        const $this = { get, attrs, styles, html, text, on, copyClassFrom, copyStyleFrom };

        function get() {
            return element
        }
        function attrs(props){
            for (const prop in props){
                element.setAttribute(prop, props[prop]);
            }
            return $this
        }
        function styles(styles){
            for (const style in styles){
                element.style[style] = styles[style];
            }
            return $this
        }
        function html(value){
            element.innerHTML = value;
            return $this
        }
        function text(value){
            element.innerText = value;
            return $this
        }
        function on(eventKey, callback){
            element.addEventListener(eventKey, callback);
            return $this
        }
        function copyClassFrom(el){
            if (typeof el == 'string'){
                el = document.querySelector(el);
            }
            element.classList.add(...el.classList);
            return $this
        }
        function copyStyleFrom(el, styleList){
            if (typeof el == 'string'){
                el = document.querySelector(el);
            }
            const refrences = window.getComputedStyle(el);
            for (const style of styleList){
                element.style[style] = refrences[style];
            }
            return $this
        }

        return $this
    }
    function createEl(tagName){
        return el(document.createElement(tagName))
    }
    function queryEl(query){
        return el(document.querySelector(query))
    }
    function objectExtract(obj, keys, excludeNull){
        const result = {};
        for (const key of keys){
            if (excludeNull && typeof obj[key] === 'undefined') continue
            result[key] = obj[key];
        }
        return result
    }
    function findStringBetween(str, strings){
        if (!Array.isArray(strings)) return str
        if (strings < 2) return str

        let start = str.indexOf(strings.shift());
        let end = null;
        for (const s of strings){
            if (isNaN(end)){
                end = str.indexOf(s, start);
            } else {
                end = str.indexOf(s, end);
            }
        }
        return str.substring(start, end + strings.pop().length)
    }

    // 
    // Animagine
    // 

    function Animagine(){

        let defaultValue = {};
        const element = {};
        const props = {
            prompt            : gradio_config.components[7].props,
            negative_prompt   : gradio_config.components[8].props,
            quality           : gradio_config.components[16].props,
            style             : gradio_config.components[11].props,
            aspec_ratio       : gradio_config.components[19].props,
            upscaler          : gradio_config.components[27].props,
            upscaler_strength : gradio_config.components[29].props,
            upscaler_value    : gradio_config.components[30].props,
            sampler           : gradio_config.components[34].props,
            seed              : gradio_config.components[37].props,
            randomize_seed    : gradio_config.components[38].props,
            guidance_scale    : gradio_config.components[42].props,
            steps             : gradio_config.components[43].props,
        };

        let onRefreshUiCallback = function(){};
        function on(eventKey, callback){
            if (eventKey === 'load') onPageLoaded(callback);
            else if (eventKey === 'refreshUI') onRefreshUiCallback = callback;
            else if (eventKey === 'generate') element.generate.addEventListener('click', callback);
        }
        function bindUI(){
            element.txtToImgTab = queryEl('#component-5').get();
            element.prompt      = queryEl('#component-8 textarea').get();
            element.generate    = queryEl('#component-49').get();
        }
        function applyCustomUI(){
            queryEl('body').styles({ position: 'relative' });
            queryEl(".gradio-container").styles({ 'max-width': '100%' });
            queryEl("#component-0").styles({ 'padding': '0', 'max-width': '100%' });
            // queryEl("#component-5").styles({ 'flex-grow': '3' })
            queryEl('#component-50 :first-child').styles({ 'z-index': 80 });
            queryEl('#title span').styles({
                'padding': '1rem 2rem',
                'color': 'var(--body-text-color)',
                'display': 'block',
                'width': '100%'
            });
        }
        function refreshUI(){
            // switch tab to re render the ui :)
            queryEl('#component-15-button').get().click();
            setTimeout(() => {
                queryEl('#component-6-button').get().click();
                onRefreshUiCallback();
            }, 200);
        }
        function fillInputs(data, defaultIfNull = false){
            for (const key in props){
                if (!(key in data) && defaultIfNull) {
                    props[key].value = defaultValue[key];
                } else if (key in data) {
                    props[key].value = data[key];
                }
            }
        }
        function readInputs(){
            const result = {};
            for (const key in props){
                result[key] = props[key].value;
            }
            return result
        }
        function onPageLoaded(callback){
            const scan = setInterval(() => {
                if (!document.querySelector("#component-0")) return
                if (typeof gradio_config != 'object') return

                clearInterval(scan);
                defaultValue = readInputs();
                bindUI();
                callback();
            }, 1);
        }
        function generate(){
            element.generate.click();
        }
        function isDarkMode(){
            return document.body.classList.contains('dark')
        }
        function toggleDarkMode(state){
            state = state ?? !isDarkMode();
            document.body.classList.toggle('dark', state);
            refreshUI();
            applyCustomUI();
        }
        return {
            ...props, defaultValue, element,
            on, applyCustomUI, refreshUI, fillInputs, readInputs, generate,
            toggleDarkMode, isDarkMode
        }
    }

    // 
    // Firebase
    // 

    var FirebaseApp, FirebaseDB;
    var app, database;

    async function loadLibs(){
        FirebaseApp = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js');
        FirebaseDB = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js');
    }
    // TODO: make proper connection checking
    function isConnected(){
        return typeof app !== 'undefined' && typeof database !== 'undefined'
    }
    function isLibsLoaded(){
        return typeof FirebaseApp !== 'undefined' && typeof FirebaseDB !== 'undefined'
    }
    async function initFirebase(config){

        if (typeof config != 'object') return
        if (Object.keys(config) < 3) return
        if (isConnected()) return

        if (!isLibsLoaded()) await loadLibs();

        try {
            app = FirebaseApp.initializeApp(config);
            database = FirebaseDB.getDatabase(app);
            console.log('connected to firebase');
        } catch (e) {
            console.log(e);
        }
    }
    async function initCollection(path, options){
        if (!isConnected()) return

        const limit = options.limit ?? 100;
        const onlyOnce = options.onlyOnce ?? true;

        const onChange = options.onChange ?? function(){};
        const onChildAdded = options.onChildAdded ?? function(){};

        const collectionRef = FirebaseDB.ref(database, path);
        const lastHistory = FirebaseDB.query(collectionRef, FirebaseDB.limitToLast(limit));

        FirebaseDB.onValue(lastHistory, snapshot => onChange(snapshot), { onlyOnce });
        FirebaseDB.onChildAdded(lastHistory, data => onChildAdded(data));

        function insert(key, data){
            const collectionRef = FirebaseDB.ref(database, path + key);
            FirebaseDB.set(collectionRef, data);
        }

        function update(key, data){
            const itemRef = FirebaseDB.ref(database, path + key);
            FirebaseDB.update(itemRef, data);
        }

        return { insert, update }
    }

    function LocalCollection(path, limit = 250){
        let collection = JSON.parse(localStorage.getItem(path) ?? '{}');
        const $this = { save, insert, get, clear };

        function save(){
            localStorage.setItem(path, JSON.stringify(collection));
            return $this
        }
        function insert(key, data) {
            if (key in collection) return

            collection[key] = data;
            limitCollection();
            return $this
        }
        function limitCollection(){
            do {
                let keys = Object.keys(collection).sort();
                if (keys.length >= limit){
                    if (collection[keys.shift()].usage) continue
                    delete collection[keys.shift()];
                    continue
                }
            } while (false)

            return $this
        }
        function get(key){
            if (typeof key == 'undefined') return collection
            return collection[key]
        }
        function clear(){
            collection = {};
            save();

            return $this
        }

        return $this
    }

    // 
    // History View
    // 

    async function App(){

        loadExternal('https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css');

        const VUE_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/vue/3.4.32/vue.esm-browser.min.js';
        const { createApp, ref, computed, reactive } = await import(VUE_CDN);
        const MAX_VISIBLE_HISTORY = 500;

        const Data = reactive({
            historyList: [],
            showedHistory: {},
        });

        const groupByChoices = 'date|usage|aspec_ratio|quality|style|upscale|-'.split('|');
        const sortByChoices = 'date:date|num:usage|str:aspec_ratio|str:quality|str:style|str:upscale'.split('|');

        let searchBoxFocus = function(){};
        let itemOnClickCallback = function(){};


        let currentSortCmd = sortByChoices[0];
        let currentIsAscending = false;
        let currentGroupBy = groupByChoices[0];
        let currentSearchBy = '';
        function renderHistory(sortCmd, isAscending, groupKey, keywords){
            sortCmd = currentSortCmd = sortCmd ?? currentSortCmd;
            isAscending = currentIsAscending = isAscending ?? currentIsAscending;
            keywords = currentSearchBy = keywords ?? currentSearchBy;
            groupKey = currentGroupBy = groupKey ?? currentGroupBy;

            let result = Data.historyList;
            if (keywords && keywords.length > 0){
                keywords = keywords.toLowerCase();
                result = result.filter(h => {
                    const payload = Object.values(h).join(' , ').toLowerCase();
                    for (const keyword of keywords.split(' ')){
                        if (payload.indexOf(keyword) == -1) return false
                    }
                    return true
                });
            }
            if (sortCmd){
                result = sort(result, (isAscending ? '' : '-') + sortCmd);
            }

            result = result.slice(0, MAX_VISIBLE_HISTORY);

            if (groupKey === 'date') {
                result = groupBy(result, (data) => new Date(data.date).toDateString());
            } else if (typeof groupKey == 'string'
                && groupByChoices.indexOf(groupKey) > -1
                && groupKey !== '-'
            ) {
                result = groupBy(result, (data) => data[groupKey]);
            } else {
                result = groupBy(result, () => ' ');
            }

            Data.showedHistory =  Array.from(result.entries()).map(([key, value]) => {
                return { title: key, hide: false, data: value}
            });
        }

        const Dropdown = {
            props: ['items', 'label'],
            emits: ['onChange'],
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
            setup(){
                const search = ref(null);
                const onExit = () => hide();
                const onSearch = () => renderHistory(null, null, null, search.value.value);
                const onReset = () => renderHistory(sortByChoices[0], false, groupByChoices[0], '');
                const sortOnChange = (sortCmd) => renderHistory(sortCmd, null, null, null);
                const groupOnChange = (propKey) => renderHistory(null, null, propKey, null);
                const ascendingOnChange = (state) => renderHistory(null, state, null, null);
                const sortChoices = sortByChoices.map(s => ({ title: s.split(':').pop(), value: s }));
                const groupChoices = groupByChoices.map(s => ({ title: s, value: s }));

                searchBoxFocus = () => search.value.focus();

                return {
                    search, sortChoices, groupChoices,
                    onSearch, onReset , onExit, sortOnChange, groupOnChange, ascendingOnChange
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
            props: ['data'],
            setup(props){
                const timeStr = getTimeStr(props.data.date);
                const onClick = () => itemOnClick(props.data);

                const limitOpt = { maxLine: 5, maxCharacters:  300 };
                const parsePrompt = (str) => stringLimit(str, limitOpt).replaceAll('\n', '<br>');

                const prompt = parsePrompt(props.data.prompt);
                const negative_prompt = parsePrompt(props.data.negative_prompt);

                return { onClick, limitOpt, timeStr, prompt, negative_prompt }
            },
            template: `
            <button class="card position-relative p-0 btn btn-link 
                    text-decoration-none history-item"
                @click="e => e.stopImmediatePropagation() || onClick()">
                <div class="card-header">
                    <small class="me-1 mb-1 badge border">{{ timeStr }}</small>
                    <small class="me-1 mb-1 badge border">{{ data.aspec_ratio }}</small>
                    <small class="me-1 mb-1 badge border">{{ data.style }}</small>
                    <small class="me-1 mb-1 badge border">{{ data.quality }}</small>
                    <small class="me-1 mb-1 badge border border-success"
                        v-show="data.upscaler">Upscaled</small>
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
            setup(){
                const historyList = computed(() => Data.showedHistory);
                const onExit = () => hide();
                return { historyList, onExit }
            },
            components: { HistoryItem },
            template: `
            <template v-for="_group of historyList" :key="_group.title">
                <button class="col-12 text-start mt-4 text-base btn btn-link 
                        text-decoration-none fs-5 border-bottom"
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
            template : `
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


        const container = createEl('div').attrs({ id: 'app', class: 'modal' }).get();

        document.body.append(container);

        createApp(App).mount('#app');

        appendStyle(`
        .history-item:hover {
            border-color: rgba(var(--bs-primary-rgb),var(--bs-border-opacity))!important;
        }
        .text-base { color: var(--bs-body-color); }
        .text-small { font-size: .75em; }
    `);


        function on(eventKey, callback) {
            if (eventKey === 'itemOnClick') itemOnClickCallback = callback;
        }
        function itemOnClick(data){
            data['usage'] = (data['usage'] ?? 0) + 1;
            itemOnClickCallback(data);
        }
        function show(){
            container.classList.toggle('d-block', true);
            searchBoxFocus();
        }
        function hide(){
            container.classList.toggle('d-block', false);
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
            el(container).attrs({ 'data-bs-theme' : state ? 'dark' : 'light' });
        }

        return {
            show, hide, setHistory, addHistory, on, setDarkMode
        }
    }

    // 
    // Editor
    // 

    function Editor(config){

        const CM_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/';

        let addons = [
            CM_CDN + 'addon/search/searchcursor.min.js',
            CM_CDN + 'addon/hint/show-hint.min.css',
            CM_CDN + 'addon/hint/show-hint.min.js',
            ...(config.addons ?? [])
        ];

        let codemirror, hints, limit;
        let libsLoaded = loadLibs();

        const isMobile = isMobileBrowser();

        const defaultConfig = {
            lineNumbers: true,
            indentUnit: 4,
            extraKeys: {
                'Alt-Up': 'swapLineUp',
                'Alt-Down': 'swapLineDown',
            },
            styleActiveLine: true,
            lineWrapping: true,
            minLines: 50,
            viewportMargin: 50
        };

        if (config.addons){
            delete config.addons;
        }

        config = { ...defaultConfig,  ...(config ?? {}) };

        async function render(element){
            await libsLoaded;

            if (element.type === 'textarea'){
                codemirror = CodeMirror.fromTextArea(element, config);
            } else {
                const textarea = document.createElement('textarea');
                element.append(textarea);
                codemirror = CodeMirror.fromTextArea(textarea, config);
            }
        }

        async function loadLibs(){

            await Promise.all([
                loadExternal(CM_CDN + 'codemirror.min.js'),
                loadExternal(CM_CDN + 'codemirror.min.css'),
            ]);

            const libs = addons.map(lib => loadExternal(lib));
            await Promise.all(libs);

            return true
        }

        // https://stackoverflow.com/questions/32165851/how-to-enable-code-hinting-using-codemirror
        function showHints(){
            if (!hints || hints.length < 1) return

            CodeMirror.showHint(codemirror, () => {

                let cursor = codemirror.getCursor();
                let line = codemirror.getLine(cursor.line);
                let start = cursor.ch, end = cursor.ch;

                while (start > 0 && /\w/.test(line.charAt(start - 1))) --start;
                while (end < line.length && /\w/.test(line.charAt(end))) ++end;

                const word = line.substring(start, end);
                const list = hints.filter(item => (
                        item.replaceAll(' ', '').indexOf(word) >= 0
                    ))
                    .sort((a, b) => {
                        const a_nospace = a.replaceAll(' ', '');
                        const b_nospace = b.replaceAll(' ', '');

                        // Exact check
                        if (b === word) return 4
                        if (a === word) return -4

                        // Same character start
                        if (b_nospace.startsWith(word)) return 3
                        if (a_nospace.startsWith(word)) return -3

                        // Has exact word
                        if (b.split(' ').indexOf(word) > -1) return 2
                        if (a.split(' ').indexOf(word) > -1) return -2

                        // Include word
                        if (b_nospace.indexOf(word) > -1) return 1
                        if (a_nospace.indexOf(word) > -1) return -1

                        // Nothing match
                        return 0
                    }).slice(0, limit);

                return {
                    list: list,
                    from: CodeMirror.Pos(cursor.line, start),
                    to: CodeMirror.Pos(cursor.line, end)
                }
            });
        }

        function initHints(){
            let style = `.CodeMirror-hints { z-index: 100!important; }`;

            if (isMobile){
                style += `
                .CodeMirror-hint {
                    padding-top: 1ch;
                    padding-bottom: 1ch;
                    border-bottom: 1px solid black;
                }
            `;
                codemirror.on('change', (editor, changes) => {
                    const key = changes.text?.pop();
                    if (changes.origin !== '+input') return
                    if (editor.state.completionActive) return
                    if (key.toString().trim().length !== 1) return

                    showHints();
                });

            } else {
                // https://stackoverflow.com/questions/13744176/codemirror-autocomplete-after-any-keyup
                codemirror.on('keyup', (editor, event) => {
                    if (editor.state.completionActive) return
                    if (event.key.toString().trim().length !== 1) return

                    showHints();
                });
            }

            codemirror.addKeyMap({
                'Ctrl-Space': () => showHints()
            });

            appendStyle(style);
        }

        function updateHints(newHints, newLimit = 100){
            if (!hints) initHints();
            hints = newHints;
            limit = newLimit;
        }

        function getCodemirror(){
            return codemirror
        }
        function value(){
            return codemirror.getValue()
        }
        function set(value = ''){
            return codemirror.setValue(value)
        }
        return {
            getCodemirror, showHints, updateHints, loadLibs, render, value, set
        }
    }

    // 
    // Config
    // 

    const MAX_VISIBLE_HINTS = 100;
    const HINTS_URL = [
        'https://huggingface.co/spaces/cagliostrolab/animagine-xl-3.1/raw/main/wildcard/characterfull.txt',
    ];

    const MAX_SAVED_HISTORY = 250;

    const CM_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/';

    const EDITOR_CONFIG = {
        lineNumbers: true,
        styleActiveLine: true,
        lineWrapping: true,
        minLines: 15,
        viewportMargin: 15,
        keyMap: 'sublime',
        theme: 'material',
        addons: [
            CM_CDN + 'keymap/sublime.min.js',
            CM_CDN + 'theme/material.min.css',
            CM_CDN + 'addon/search/searchcursor.min.js',
            CM_CDN + 'addon/hint/show-hint.min.css',
            CM_CDN + 'addon/hint/show-hint.min.js',
        ]
    };

    // usage : how many data clicked on history
    // datetime : used as primary key
    const STORED_HISTORY_PROPS = 'prompt|negative_prompt|quality|style|aspec_ratio|upscaler|usage'.split('|');

    const FIREBASE_CONFIG = {};

    // 
    // Main
    // 


    const animagine = Animagine();
    animagine.on('load', () => main());

    async function main(){

        //
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

        const localCollection = LocalCollection('history', MAX_SAVED_HISTORY);


        //
        // Firebase
        //

        let historyCollection;
        function firebaseInsertHistory(){}
        function firebaseUpdateHistory(){}

        async function initFirebase$1(){
            const firebaseCred = localStorage.getItem('firebase') ?? FIREBASE_CONFIG;
            await initFirebase(JSON.parse(firebaseCred));

            historyCollection = await initCollection('/animagine/history/', {
                limit: MAX_SAVED_HISTORY,
                onChildAdded: (data) => {
                    if (data.key in localCollection.get()) {
                        localCollection.get()[data.key] = data.val();
                    } else {
                        localCollection.insert(data.key, data.val()).save();
                    }
                    notifyHistoryChanged();
                }
            });
            // update method
            firebaseInsertHistory = (key, data) => {
                historyCollection.insert(key, data);
                console.log('saved to firebase', key);
            };
            firebaseUpdateHistory = (key, data) => {
                historyCollection.update(key, data);
                console.log('updated to firebase', key, data);
            };
        }


        //
        // TextEditor
        //

        const editor = Editor(EDITOR_CONFIG);
        await editor.render(animagine.element.prompt);

        editor.getCodemirror().on('keyup', () => {
            animagine.prompt.value = sanitaizePrompts(editor.value());
        });
        editor.getCodemirror().addKeyMap({
            'Ctrl-Enter': () => animagine.generate()
        });



        //
        // Hints
        //

        let hints = [];
        function appendHints(_hints){
            hints = hints.concat(_hints);
            // remove duplicate
            hints = [ ...new Set(hints) ];

            localStorage.setItem('hints', hints.join('\n'));
            editor?.updateHints(hints, MAX_VISIBLE_HINTS);
        }

        const localHint = localStorage.getItem('hints');
        if (localHint){
            appendHints(txtToList(localHint));
        }
        if (HINTS_URL.length) {
            for (const url of HINTS_URL){
                appendHints(await loadTxtList(url));
            }
        }
        console.log('used hints,', hints.length, 'length');


        //
        // History View
        //

        const historyView = await App();
        historyView.on('itemOnClick', (data) => {
            console.log('selected history', data);

            historyView.hide();
            editor.set(data.prompt);

            animagine.fillInputs(data);
            animagine.refreshUI();

            localCollection.get()[data.date].usage = data.usage;
            localCollection.save();

            firebaseUpdateHistory(data.date, objectExtract(data, STORED_HISTORY_PROPS));
        });


        //
        // Adjusting animagine UI / behavior with the extra features
        //

        const historyBtn = createEl('button')
            .text('History')
            .copyClassFrom(animagine.element.generate)
            .on('click', () => historyView.show())
            .get();

        const importHintsBtn = createEl('button')
            .text('Import Hint (*.txt)')
            .copyClassFrom(animagine.element.generate)
            .on('click', () => inputFile((text) => appendHints(txtToList(text)), '.txt'))
            .get();

        const importCredBtn = createEl('button')
            .text('Import Firebase cred (*.json)')
            .copyClassFrom(animagine.element.generate)
            .on('click', () => inputFile((data) => {
                const fbCred = JSON.parse(data);
                console.log('loaded firebase cred,', fbCred);
                localStorage.setItem('firebase', JSON.stringify(fbCred));
                initFirebase$1();
            }, '.json'))
            .get();

        const paramFromImg = createEl('button')
            .text('Import Parameters From Image (*.png)')
            .copyClassFrom(animagine.element.generate)
            .on('click', () => inputFile((text) => {
                const paramStr = findStringBetween(text, ['{"prompt":', '"Model hash"', '"}}']);
                const param = JSON.parse(paramStr);
                const result = {
                    prompt          : param.prompt,
                    negative_prompt : param.negative_prompt,
                    quality         : param.sdxl_style,
                    style           : param.quality_tags,
                    aspec_ratio     : param.resolution,
                    upscaler        : param.use_upscaler,
                };
                console.log('loaded image parameters,', result);
                
                editor.set(result.prompt);
                result.prompt = sanitaizePrompts(result.prompt);

                animagine.fillInputs(result);
                animagine.refreshUI();
            }, '.png'))
            .get();

        const toggleThemeBtn = createEl('button')
            .text('Toggle Theme')
            .copyClassFrom(animagine.element.generate)
            .on('click', () => animagine.toggleDarkMode())
            .get();


        animagine.element.txtToImgTab.append(historyBtn);
        animagine.element.txtToImgTab.append(importHintsBtn);
        animagine.element.txtToImgTab.append(importCredBtn);
        animagine.element.txtToImgTab.append(toggleThemeBtn);
        animagine.element.txtToImgTab.append(paramFromImg);


        animagine.on('generate', () => {
            const key = currentDate();
            const data = objectExtract(animagine.readInputs(), STORED_HISTORY_PROPS, true);
            data.prompt = editor.value();

            localCollection.insert(key, data).save();
            firebaseInsertHistory(key, data);
            notifyHistoryChanged();
        });

        animagine.on('refreshUI', () => {
            editor.set(animagine.prompt.value ?? '');
            animagine.prompt.value = sanitaizePrompts(animagine.prompt.value);

            historyView.setDarkMode(animagine.isDarkMode());

            // Adjust editor style with animagine theme
            el(editor.getCodemirror().getScrollerElement()).styles({'overflow-x': 'auto!important'});
            el(editor.getCodemirror().getWrapperElement())
                .copyStyleFrom(animagine.element.prompt,['background', 'color', 'borderRadius']);

            setTimeout(() => {
                editor.getCodemirror().focus();
                editor.getCodemirror().refresh();
            }, 0);
        });



        function notifyHistoryChanged(){
            const itemsObj = localCollection.get();
            const itemsArr = Object.keys(itemsObj).sort().map(key => ({ ...itemsObj[key], date: key}));

            if (itemsArr.length < 1) return

            historyView.setHistory(itemsArr);

            if (animagine.prompt.value.length < 1){
                animagine.fillInputs(itemsArr[0]);
            }
        }

        initFirebase$1();
        notifyHistoryChanged();

        animagine.applyCustomUI();
        animagine.refreshUI();

    }

})();
