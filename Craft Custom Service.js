// CONFIG START

const folderName = "Custom Services";
const macroName = "Custom Service"; // Name of callback macro for crafted services

// CONFIG END

// Helper function to capitalize strings
function capitalize(string) {
    return string[0].toUpperCase() + string.substring(1)
};

// Helper function to create select options
function selectOptions(array, selectId) {
    const num = array.length;
    let content = "";
    for (let i = 0; i < num; i++) {
        content += `<option value="${array[i]}">${capitalize(array[i])}</option>`;
    }
    const result = `<select id="${selectId}">${content}</select>`;
    return result;
}

let existingCustomCategories = await game.settings.storage.get("world").find(e => e.key === "item-piles.customItemCategories")?.value
if (existingCustomCategories === undefined) {
    existingCustomCategories = [];
    await game.settings.set("item-piles", "customItemCategories", []);
}
let categories = [
    "loot",
    ...existingCustomCategories,
    "custom"
];

let newService = {
    "name": undefined,
    "type": "loot",
    "img": "icons/svg/tankard.svg",
    "effects": [],
    "system": {
        "price": {
            "value": 0
        }
    },
    "flags": {
        "item-piles": {
            "system": {
                "quantityForPrice": 1
            },
            "item": {
                "isService": true,
                "macro": macroName,
                "customCategory": undefined
            },
            "version": game.modules.get("item-piles").version
        }
    },
    "folder": game.folders.find(e => e.name === folderName).id
}

let effects;
class CraftService extends Dialog {
    constructor() {
        super({
            title: "Service Crafter",
            content: `
            <style>
            .dialog-buttons button {
                height: 3em;
            }
            </style>
                <form id="craftServiceForm">
                <p class="notification info" id="dragInfo">Drag and drop an item to start, or create an item from scratch.</p>
                <hr>    
                    <div class="form-group">
                        <label>Name:</label>
                        <div class="form-fields">
                            <input type="text" id="name" placeholder="A Flagon of Ale"></input>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Select a category:</label>
                        <div class="form-fields">
                            ${selectOptions(categories, "selectedCategory")}
                        </div>
                    </div>
                    <div class="form-group" id="customSection">
                        <label>Enter custom category:</label>
                        <div class="form-fields">
                            <input type="text" id="customCategory"></input>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Healing formula:</label>
                        <div class="form-fields">
                            <input type="text" placeholder="Ex. 1d4+2 or leave blank for none" id="healingFormula"></input>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Cost (GP):</label>
                        <div class="form-fields">
                            <input type="number" value="0" min="0" id="cost"></input>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Effects source:</label>
                        <div class="form-fields" id="effects">
                            <input type="text" placeholder="Drag and drop item or leave blank for none" disabled></input>
                        </div>
                    </div>
                    <div id="effectsInfo"></div>
                </form>`,
            buttons: {
                ok: {
                    icon: "<i class='fas fa-check'></i>",
                    label: "Craft",
                    callback: (html) => {
                        let name = html.find("#name").val();
                        if (!name && !newService.name) {
                            html.find("#name").css('border-color', 'red');
                            throw 'Please enter a name.'
                        } else if (name) {
                            newService.name = name;
                        }

                        let category = html.find("#selectedCategory").val();
                        let custom = html.find("#customCategory").val().toLowerCase();
                        if (category === "custom") {
                            if (custom) {
                                if (!existingCustomCategories.some(e => e === custom)) {
                                    // Add new custom to the list of categories
                                    let customCategories = game.settings.get("item-piles", "customItemCategories");
                                    customCategories.push(custom);
                                    game.settings.set("item-piles", "customItemCategories", customCategories);
                                } else {
                                    html.find("#customCategory").css('border-color', 'red');
                                    throw 'Custom category already exists.'
                                }
                            } else {
                                html.find("#customCategory").css('border-color', 'red');
                                throw 'Please enter a custom category or select an existing one.'
                            }
                            newService.flags["item-piles"].item.customCategory = custom;
                        } else {
                            newService.flags["item-piles"].item.customCategory = html.find("#selectedCategory").val();
                        }

                        let healing = html.find('#healingFormula').val();
                        if (healing)
                            if (Roll.validate(healing)) {
                                newService.flags["item-piles"].item.customHealing = healing;
                            } else {
                                html.find("#healingFormula").css('border-color', 'red');
                                throw 'Invalid healing formula.'
                            }

                        newService.system.price.value = html.find("#cost").val();

                        // Find or create the folder
                        let folder = game.folders.find((f) => f.name === folderName);
                        if (!folder) {
                            folder = Folder.create({
                                name: folderName,
                                type: "Item",
                                parent: null,
                                sort: 20000,
                            });
                            console.log(`Created folder ${folderName} with ID ${folder.id}`);
                        }

                        Item.create(newService, { temporary: false });
                    }
                },
                cancel: {
                    icon: "<i class='fas fa-times'></i>",
                    label: "Cancel",
                    callback: () => { }
                }
            },
            render: (html) => {
                html.find('#customSection').toggle(false);
            },
            default: "cancel"
        },
            {
                width: 500,
                height: 330
            });
    }

    activateListeners(html) {

        // Add listener to form for dragging and dropping items
        html.find("#craftServiceForm").on('drop', async (event) => {
            event.preventDefault();

            const droppedItem = JSON.parse(event.originalEvent.dataTransfer.getData("text/plain"));
            const uuidArray = droppedItem.uuid.split(".").filter(str => str.length > 0);
            if (uuidArray[0] === "Item") {
                let thisItem = await game.items.get(uuidArray[1]);

                let thisName = thisItem.name;
                if (html.find('#name').val() == '')
                    html.find('#name').val(thisName);
                if (html.find('#cost').val() == 0)
                    html.find('#cost').val(thisItem.system.price.value);
                if (html.find('#healingFormula').val() == '')
                    html.find('#healingFormula').val(thisItem?.system?.formula);
                newService.name = thisName;

                let num = thisItem?.effects?.contents?.length;
                if (num) {
                    let effects = thisItem.effects.contents;
                    newService.img = thisItem.img;
                    newService.effects = effects.map(({ _id, ...newObj }) => newObj);
                    let labels = []
                    for (let i = 0; i < num; i++)
                        labels.push(effects[i].label);
                    html.find("#effects input[type='text']").val(`${thisItem.name} (${labels.join(', ')})`);
                } else {
                    ui.notifications.warn("Item does not have any effects.")
                }
            }
        });


        // Add listener to form for dragging and dropping items
        html.find("#selectedCategory").on('change', async () => {
            let option = html.find('#selectedCategory').val();
            html.find('#customSection').toggle((option === "custom"));
        });



        // Call the parent class's activateListeners method to include the original button behaviors
        super.activateListeners(html);
    }
}

let dialogCrafter = new CraftService().render(true);
