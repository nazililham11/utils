var dataset = []
var codemirror
var suggestion_limit = 100
var dataset_url = '/dataset.txt'
var textbox_id = 'cm_textarea'

// scan the textbox every second until it is loaded
var textbox_scanner = setInterval(() => {
    textbox = document.getElementById(textbox_id)
    if (textbox && typeof CodeMirror !== 'undefined'){
        init_suggestions(textbox)
    }
}, 1000)

async function load_libs(){
    const libs = [
        "https://cdnjs.cloudflare.com/ajax/libs/codemirror/6.65.7/codemirror.js",
        "https://cdnjs.cloudflare.com/ajax/libs/codemirror/6.65.7/keymap/sublime.min.js",
        "https://cdnjs.cloudflare.com/ajax/libs/codemirror/6.65.7/addon/hint/show-hint.min.js",
        "https://cdnjs.cloudflare.com/ajax/libs/codemirror/6.65.7/codemirror.min.css",
        "https://cdnjs.cloudflare.com/ajax/libs/codemirror/6.65.7/addon/hint/show-hint.min.css",
    ]
    for (lib of libs){
        await fetch_lib(lib).catch((err)=>console.error(err))
    }
}

async function init_suggestions(el_textbox){
    clearInterval(textbox_scanner)

    dataset = await fetch(dataset_url)
        .then((response) => response.text())
        .then(text => text.split('\r\n').map(x => x.trim()).filter(x => x.length > 0))

    console.log('loaded dataset of ' + dataset.length)

    init_codemirror(el_textbox)
}

function get_suggestion(token, limit){
    return dataset
        .filter(item => (
            item.replaceAll(' ', '').indexOf(token) >= 0
        ))
        .sort((a, b) => {
            if (b === token) return 2
            if (a === token) return -2
            else if (b.startsWith(token)) return 1
            else if (a.startsWith(token)) return -1
            else return 0
        })
        .slice(0, limit)
}

function init_codemirror(el_textbox){
    codemirror = CodeMirror.fromTextArea(el_textbox, {
        lineNumbers: true,
        indentWithTabs: false,
        tabSize: 4,
        extraKeys: { "Ctrl-Space": getSnippets },
        autofocus: true,
        keyMap: 'sublime',
    })

    // https://stackoverflow.com/questions/13744176/codemirror-autocomplete-after-any-keyup
    codemirror.on('keyup', (editor, event) => {
        const key = event.key.toString().trim()
        if (!editor.state.completionActive && key.length == 1) {
            getSnippets(editor)
        }
    })

    // https://stackoverflow.com/questions/32165851/how-to-enable-code-hinting-using-codemirror
    function getSnippets(cm){
        CodeMirror.showHint(cm, () => {
            let cursor = cm.getCursor()
            let line = cm.getLine(cursor.line)
            let start = cursor.ch, end = cursor.ch

            while (start && /\w/.test(line.charAt(start - 1))) --start
            while (end < line.length && /\w/.test(line.charAt(end))) ++end

            const currentWord = line.substring(start, end)
            const list = get_suggestion(currentWord, suggestion_limit)

            return {
                list: list,
                from: CodeMirror.Pos(cursor.line, start),
                to: CodeMirror.Pos(cursor.line, end)
            }
        })
    }
}

// https://gist.github.com/josephm28/d3b19c906aee7a268dd28d71215427d1
const fetch_lib = (url, timeout = 5000) => {
    return new Promise((resolve, reject) => {

        // https://stackoverflow.com/questions/32461271/nodejs-timeout-a-promise-if-failed-to-complete-in-time
        const timer = setTimeout(() => {
            reject(new Error(`fetch timed out after ${timeout} ms`))
        }, timeout)
        let el

        if (String(url).endsWith('.css')){
            el = document.createElement("link")
            el.setAttribute('type', 'text/css')
            el.setAttribute('rel', 'stylesheet')
            el.setAttribute('href', url)
        } else if (String(url).endsWith('.js')){
            el = document.createElement('script')
            el.setAttribute('src', url)
        } else {
            return
        }

        el.onload = function() {
            resolve()
            clearTimeout(timer)
            console.log("loaded", url)
        }

        document.head.appendChild(el)
    })
}

load_libs()