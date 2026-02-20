let api_url = "http://localhost:11434"
let model = ""
let options = {
    temperature: 1,
    //top_k: NaN,
    //top_p: NaN,
    //min_p: NaN,
    //num_ctx: NaN,
    //num_predict: NaN
}

let doc = document.getElementById("doc")
let reader, reqTO

async function init() {
    let resp = await (await fetch(api_url + "/api/ps")).json()
    if (!resp.models[0]) resp = await (await fetch(api_url + "/api/tags")).json()
    model = resp.models[0].name
    console.log("Model:", model)

    doc.addEventListener("keydown", async e => {
        console.log("e", e)
        printEnabled = false
        reader?.cancel()
        clearTimeout(reqTO)
        if (!doc.value.trim()) doc.value = sessionStorage.getItem("doc")
        else sessionStorage.setItem("doc", doc.value)
        doc.value = doc.value.trimStart().replace("\n\n\n\n", "\n\n\n")
        let txt = doc.value
        let start = doc.selectionStart
        let end = doc.selectionEnd
        if (e.key == "Tab") {
            e.preventDefault()
            let head = doc.value.slice(0, end)
            if (head.indexOf(" ", start) > 0)
                doc.selectionStart = head.indexOf(" ", start) + 1
            else {
                /*reqTO = setTimeout(async () => { if (txt != doc.value && doc.selectionStart == doc.value.length) {*/
                if (getMessages(head).pop().role != "assistant") {
                    printEnabled = true
                    print("\n\n\nassistant: ", true)
                }
                await process()
                print("\n\n\nuser: ", true)
                /*} }, 1024)*/
            }
        }
        if (e.ctrlKey && e.key == "Enter") {
            printEnabled = true
            print("\n\n\nuser: ")
            return
        }
    })
}

async function process(e) {
    let payload = {
        model: model, options: options,
        messages: getMessages(doc.value.slice(0, doc.selectionEnd))
    }
    let resp = await fetch(api_url + "/api/chat", { method: "POST", body: JSON.stringify(payload) })
    reader = resp.body.pipeThrough(new TextDecoderStream()).getReader()
    console.log(reader)

    let queue = ""
    let chunk = { value: "", done: false }
    printEnabled = true
    while (!chunk.done) {
        chunk = await reader.read()
        queue += chunk.value
        if (queue.includes("\n")) {
            let token = JSON.parse(queue.slice(0, queue.indexOf("\n")))
            console.log(token)
            queue = queue.slice(queue.indexOf("\n")).trimStart()
            print(token.message.content, true)
        }
    }
}

function getMessages(str) {
    let messages = []
    let parafs = str.trim().split("\n\n\n")
    for (let paraf of parafs) {
        let words = paraf.split(" ")
        if (words[0].slice(-1) == ":") {
            messages.push({
                role: words[0].slice(0, -1),
                content: paraf.slice(paraf.indexOf(":") + 1).trim()
            })
        } else {
            if (!messages.length) messages.push({ role: "system", content: "" })
            messages[messages.length - 1].content += "\n\n\n" + paraf
        }
    }
    return messages
}

let printEnabled
function print(str, select) {
    if (!printEnabled) return
    let start = doc.selectionStart
    let end = doc.selectionEnd
    doc.value = doc.value.slice(0, end) + str + doc.value.slice(end)
    doc.selectionEnd = end + str.length
    if (select) doc.selectionStart = start
    else doc.selectionStart = doc.selectionEnd
    doc.scrollBy(0, str.length)
}

init()
