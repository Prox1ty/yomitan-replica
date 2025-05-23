let hoveredElement = null;
let popup = null;
let data = null;
let dataLoaded = false;
const dataRead = {
    "noun": {},
    "verb": {},
    "adjective": {},
    "adverb": {}
};

const dict2 = {};

const loadDict2 = async (URL, type) => {
    try {
        const fileUrl = chrome.runtime.getURL(URL);
        const response = await fetch(fileUrl);
        let newData;
        if (!response.ok) {
            throw new Error(`Couldn't fetch dict2 : ${response.statusText}`);
        }
        if (type == "json") {
            newData = await response.json();
        } else if (type == "txt") {
            newData = await response.text();
        }
        // Insert data in dict2
        for (let word in newData) {
            let value = newData[word];
            let first_letter = word.toLowerCase()[0];
            if (!dict2[first_letter]) {
                dict2[first_letter] = {}
            }
            dict2[first_letter][word.toLowerCase()] = value;
        }
        console.log(dict2);


    } catch (err) {
        console.error("Couldn't fetch dict2 :", err);
    }
}

const preloadData = async () => {
    if (Object.keys(dataRead["noun"]).length > 0) return; // Data already loaded
    try {
        const fileUrl = chrome.runtime.getURL("dict/data.noun");
        const response = await fetch(fileUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch: ${response.statusText}`);
        }

    data = await response.text();
    data.split('\n').forEach((line) => {
        let word = line.split(' ')[4];
        let def = line.split('|')[1];
        let synonymsArr = [];
        let synonym1 = line.split(' ')[6];
        let synonym2 = line.split(' ')[8];
        let synonyms = "";
        if (!(typeof synonym1 === 'number')) {
            synonymsArr.push(synonym1);
        }
        if (!(typeof synonym2 === 'number')) {
            synonymsArr.push(synonym2);
        }
        
        for (let syn of synonymsArr) {
            if (!synonyms.length) {
                synonyms += syn;
            } else {
                synonyms += `, ${syn}`;
            }
        }
        
        if (word) {
            dataRead["noun"][word] = {
                "type": "noun",
                "name": word,
                "def": def ? def.trim() : '',
                "synonyms": synonyms
            };
        }
    });    
    } catch (error) {
        console.error("Error fetching data:", error);
    }
    try {
        const fileUrl = chrome.runtime.getURL("dict/data.verb");
        const response = await fetch(fileUrl);
        if (!response.ok) {
            throw new Error(`Failed at verb fetch: ${response.statusText}`);
        }

        data = await response.text();
        data.split('\n').forEach((line) => {
            let word = line.split(' ')[4];
            let defArr = line.split('|')[1];
            let def = defArr.split(';')[0];
            let sentence = defArr.split(';')[1];
            if (word) {
                dataRead["verb"][word] = {
                    "type": "verb",
                    "name": word,
                    "def": def ? def.trim() : '',
                    "sentence": sentence ? sentence.trim() : ''
                };
            }
        });
    } catch (error) {
        console.log(error)
    } try {
        const fileUrl = chrome.runtime.getURL('dict/data.adj');
        const response = await fetch(fileUrl);
        if (!response.ok) {
            throw new Error("error at adjective fetch");
        }
        const data = await response.text();
        data.split('\n').forEach((line) => {
            let word = line.split(' ')[4];
            let defArr = line.split('|')[1];
            let def = defArr.split(';')[0];
            let sentenceArr = defArr.split(';').slice(1);
            if (word) {
                dataRead["adjective"][word] = {
                    "type": "adj",
                    "name": word,
                    "def": def ? def.trim() : '',
                    "sentence": sentenceArr[0]
                }
            }
        })
    } catch (error) {
        console.log("error at adj fetch (catch)");
    }

    try {
        const fileUrl = chrome.runtime.getURL('dict/data.adv');
        const response = await fetch(fileUrl);
        if (!response.ok) {
            throw new Error("error at adv fetch");
        }
        const data = await response.text();
        data.split('\n').forEach((line) => {
            let parts = line.split(' ');
            let word = parts[4];
            let defArr = line.split("|")[1];
            let def = defArr.split(';')[0];
            let sentenceArr = defArr.split(';').slice(1);

            if (word) {
                dataRead["adverb"][word] = {
                    "type": "adv",
                    "name": word,
                    "def": def ? def.trim() : '',
                    "sentence": sentenceArr[0]
                };
            }
        });
        dataLoaded = true;
    } catch (error) {
        console.log("error at adv fetch (catch)")
    }
    console.log(dataRead["noun"]["floor"]);
};

window.addEventListener('DOMContentLoaded', preloadData);

// const catchWord = async (type, word) => {
//     await fetchData();
//     console.log(dataRead[type][word]);
// }
// catchWord("verb", "run");

// Track the element the user is hovering over
document.addEventListener("mouseover", (event) => {
    hoveredElement = event.target;
});
document.addEventListener("click", (event) => {
    try {    
    if (popup) {
        if (event.target !== popup || !popup.contains(event.target)) {
            console.log(event.target)
            document.body.removeChild(popup);
            popup = null;
        }
}   
    } catch (error) {
        console.log(`no popup found. Error code : ${error}`);
    }
})

// Create popup element
const createPopup = (content) => {
    removePopup();
    popup = document.createElement("div");
    popup.classList.add("popup");
    
    popup.innerHTML = content

    popup.addEventListener("click", (event) => {
        event.stopPropagation();
    });

    const extraDefButton = popup.querySelector(".extra-def-btn");

    if (extraDefButton) {
        extraDefButton.addEventListener('click', () => {
            const extraDefList = popup.querySelector(".extra-def-ul");
            if (extraDefList) {
                extraDefList.classList.toggle("visible");
            }
        })
    }

    document.body.appendChild(popup);
    console.log("pop!")
}

const removePopup = () => {
    try {
        if (popup) {
            document.body.removeChild(popup);
            popup = null;
        }    
    } catch (error) {
        console.log(`no popup found. Error code : ${error}`);
    }
    
}

// Listen for key press on the entire window
window.addEventListener('keydown', async (event) => {
    if (event.ctrlKey) {        
            await preloadData();
            await loadDict2("english.json", "json");

        // Get the selected text within the hovered element
        let content = "";
        let selectedText = window.getSelection().toString().toLowerCase().trim();
        let def;
        let extraDefs;
        let sentence;
        let wordType;
        let synonyms;
        if (selectedText) {
            let spacedText = selectedText;
            let firstLetter = spacedText.toLowerCase()[0];
            console.log(`spacedText in dict2 ${dict2[firstLetter][spacedText]}`);

            let selectedText1 = selectedText.replace(/ /g, "_");
            if (selectedText1.split("_")[0] == "to") {
                selectedText1 = selectedText1.split("_")[1];
            }
            for (let type in dataRead) {
                if (dataRead[type][selectedText1]) {
                    def = dataRead[type][selectedText1]["def"];
                    if (type == "noun") {
                    def = def.replace(/;/g, "<span class='sentence'>,<br>");
                    def += "</span>";
                    }
                    sentence = (dataRead[type][selectedText1]["sentence"]) ? dataRead[type][selectedText1]["sentence"] : "no sentence";
                    wordType = (dataRead[type][selectedText1]["type"]) ? dataRead[type][selectedText1]["type"] : "error";
                    synonyms = (dataRead[type][selectedText1]["synonyms"]) ? dataRead[type][selectedText1]["synonyms"] : "No synonyms";
                    extraDefs = (dict2[spacedText.toLowerCase()[0]]) ? dict2[spacedText.toLocaleLowerCase()[0]][spacedText.toLowerCase()] : null;
                    console.log(extraDefs);
                    let extraDefsVar = "";
                    let toggleWord = "clickable hide";

                    for (let extraDef of extraDefs) {
                        extraDefsVar += `
                            <li class="extraDefItem">${extraDef}</li>
                        `
                    }
                    //add the data to content via a function maybe?
                    (() => {
                        content +=  `
                            <div class="wrapper">
                                <div class="main">
                                    <h2 class="word">${selectedText} - <span class="type">${type}</span></h2>
                                    <h3 class="synonym">${synonyms}</h3>
                                </div>
                                <div class="definitions">
                                    <ul class="def-list">
                                        <button class="extra-def-btn"><span = "extra-def-span">Extra Definitions</span></button>
                                        <br>
                                        <ul class="extra-def-ul visible">
                                            ${extraDefsVar}
                                        </ul>
                                        <li class="def">${def}</li>
                                        ${(type !== "noun") ? `<li class="sentence">"${sentence}"</li>` : ""}
                                        
                                    </ul>
                                </div>
                            </div>
                        `;
                    }) ();
                    console.log(`Found Match:`, dataRead[type][selectedText1]);
                }
            }
            if (def) {
            createPopup(content);
            } else {
                console.log(`No match found for ${selectedText}`);
            }
            console.log(`Extracted Text: ${selectedText}`);

        } else {
            return;
        }
        }
    }
);
