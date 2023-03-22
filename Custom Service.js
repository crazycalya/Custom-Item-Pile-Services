if (!game.modules.get("advanced-macros")?.active) {
    ui.notifications.error(`This macro requires the "Advanced Macros" module to function!`);
    return;
}

if (!args.length) {
    ui.notifications.error(`This macro isn't called from the hotbar or executed from the window, it's executed by Item Piles as a part of buying the "Cure Wounds" service!`);
    return;
}

const { buyer, seller, item, quantity } = args[0];

let category = item.flags["item-piles"].item?.customCategory;
switch (category) {
    case "food": {
        // Case specific code here

        // Example to add temp hitpoints (untested, sorry):
        // await buyer.update({
        //     "system.attributes.hp.temp": buyer.system.attributes.hp.temp + 3
        // });

        defaultActions();
        break;
    }
    default: {
        defaultActions();
    }

}

async function defaultActions() {
    // Apply effects to character, if any
    let effects = item?.effects?.contents;
    if (effects.length) {
        await buyer.createEmbeddedDocuments("ActiveEffect", effects);
    }

    // Apply healing to character, if any
    let healing = item?.flags["item-piles"]?.item?.customHealing;
    if (healing) {
        const healingRoll = new Roll(healing).evaluate({ async: false });
        const buyerNewHealth = Math.min(buyer.system.attributes.hp.max, buyer.system.attributes.hp.value + healingRoll.total);
        await buyer.update({
            "system.attributes.hp.value": buyerNewHealth
        });
    }
}
