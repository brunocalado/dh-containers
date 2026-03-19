/**
 * DH Containers — Visual container organization for Daggerheart loot items.
 * Allows marking loot items as containers and visually nesting other loot items inside them.
 */

const MODULE_ID = "dh-containers";

/* -------------------------------------------- */
/* Initialization                               */
/* -------------------------------------------- */

Hooks.once("init", () => {
    console.log("DH Containers | Initializing...");
});

/* -------------------------------------------- */
/* Scroll Restoration                           */
/* -------------------------------------------- */

/**
 * Saves scroll position before actor sheet re-renders to prevent jarring jumps.
 * Triggered by preRenderApplicationV2 hook.
 * @param {ApplicationV2} app - The application being rendered.
 */
Hooks.on("preRenderApplicationV2", (app) => {
    if (app.document?.documentName !== "Actor") return;
    const html = app.element;
    if (!html) return;

    const scrollable = html.querySelector(".scrollable");
    if (scrollable) {
        app._dhContainerScroll = scrollable.scrollTop;
    }
});

/* -------------------------------------------- */
/* Render Hook — Item & Actor Sheet Injection   */
/* -------------------------------------------- */

/**
 * Main render hook that dispatches to item or actor UI injection.
 * Triggered by renderApplicationV2 hook.
 * @param {ApplicationV2} app - The rendered application.
 * @param {HTMLElement} html - The rendered HTML element.
 */
Hooks.on("renderApplicationV2", (app, html) => {
    const doc = app.document;
    const root = html instanceof HTMLElement ? html : html[0];

    if (doc?.documentName === "Item" && doc.type === "loot") {
        injectItemUI(doc, root);
    } else if (doc?.documentName === "Actor") {
        requestAnimationFrame(() => {
            handleActorUI(app, root);

            if (app._dhContainerScroll !== undefined) {
                const scrollable = root.querySelector(".scrollable");
                if (scrollable) {
                    scrollable.scrollTop = app._dhContainerScroll;
                    setTimeout(() => { scrollable.scrollTop = app._dhContainerScroll; }, 50);
                }
            }
        });
    }
});

/* -------------------------------------------- */
/* Item Sheet UI — Container Checkbox           */
/* -------------------------------------------- */

/**
 * Injects a "Container" checkbox into the loot item's settings tab.
 * Uses Foundry's native form binding via the name attribute.
 * Triggered during renderApplicationV2 for Item documents.
 * @param {Item} item - The loot item document.
 * @param {HTMLElement} element - The item sheet's root HTML element.
 */
function injectItemUI(item, element) {
    if (element.querySelector(".dh-container-setting")) return;

    const isContainer = !!item.getFlag(MODULE_ID, "isContainer");

    const fieldset = element.querySelector(".tab.settings fieldset.two-columns");
    if (!fieldset) return;

    const label = document.createElement("span");
    label.textContent = "Container";
    label.classList.add("dh-container-setting");

    const wrapper = document.createElement("div");
    wrapper.classList.add("form-group", "dh-container-setting");

    const labelEl = document.createElement("label");
    const fields = document.createElement("div");
    fields.classList.add("form-fields");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.name = `flags.${MODULE_ID}.isContainer`;
    checkbox.checked = isContainer;

    fields.appendChild(checkbox);
    wrapper.appendChild(labelEl);
    wrapper.appendChild(fields);

    fieldset.appendChild(label);
    fieldset.appendChild(wrapper);
}

/* -------------------------------------------- */
/* Actor Sheet UI — Nesting & Collapse          */
/* -------------------------------------------- */

/**
 * Handles visual nesting of loot items inside containers on the actor sheet.
 * Moves child items after their parent container row, applies indentation,
 * and manages collapse/expand toggle icons.
 * Triggered during renderApplicationV2 for Actor documents.
 * @param {ApplicationV2} app - The actor sheet application.
 * @param {HTMLElement} element - The actor sheet's root HTML element.
 */
function handleActorUI(app, element) {
    const actor = app.document;
    if (!actor) return;

    const lootItems = element.querySelectorAll('li.inventory-item[data-item-type="loot"]');
    if (!lootItems.length) return;

    /** @type {Map<string, HTMLElement>} Maps item IDs to their DOM rows */
    const rowMap = new Map();
    /** @type {Map<string, string[]>} Maps container IDs to arrays of child item IDs */
    const childrenMap = new Map();

    // First pass: build maps of rows and parent-child relationships
    for (const row of lootItems) {
        const itemId = row.dataset.itemId;
        if (!itemId) continue;
        rowMap.set(itemId, row);

        const item = actor.items.get(itemId);
        if (!item) continue;

        const parentId = item.getFlag(MODULE_ID, "containerId");
        if (parentId) {
            if (!childrenMap.has(parentId)) childrenMap.set(parentId, []);
            childrenMap.get(parentId).push(itemId);
        }
    }

    // Second pass: inject container toggle icons and nest children
    for (const row of lootItems) {
        const itemId = row.dataset.itemId;
        const item = actor.items.get(itemId);
        if (!item) continue;

        if (item.getFlag(MODULE_ID, "isContainer")) {
            _injectContainerToggle(row, item, actor, app, element);
        }

        const parentId = item.getFlag(MODULE_ID, "containerId");
        if (parentId) {
            const parentRow = rowMap.get(parentId);
            const parentItem = actor.items.get(parentId);

            if (parentRow && parentItem?.getFlag(MODULE_ID, "isContainer")) {
                // Move child visually after its parent (or after the last sibling)
                const siblings = childrenMap.get(parentId) || [];
                const siblingIndex = siblings.indexOf(itemId);
                let insertAfter = parentRow;

                // Insert after previous sibling if exists, to maintain order
                if (siblingIndex > 0) {
                    const prevSiblingRow = rowMap.get(siblings[siblingIndex - 1]);
                    if (prevSiblingRow) insertAfter = prevSiblingRow;
                }

                insertAfter.insertAdjacentElement("afterend", row);

                row.classList.add("dh-item-child");

                const isCollapsed = !!parentItem.getFlag(MODULE_ID, "isCollapsed");
                row.style.display = isCollapsed ? "none" : "";
            }
        }
    }
}

/**
 * Injects a collapse/expand toggle icon into a container item's name span.
 * The icon click toggles the isCollapsed flag on the container item.
 * @param {HTMLElement} row - The container item's list element.
 * @param {Item} item - The container item document.
 * @param {Actor} actor - The owning actor document.
 * @param {ApplicationV2} app - The actor sheet application.
 * @param {HTMLElement} element - The actor sheet's root HTML element.
 */
function _injectContainerToggle(row, item, actor, app, element) {
    const nameSpan = row.querySelector(".item-name");
    if (!nameSpan || nameSpan.querySelector(".dh-container-toggle")) return;

    const isCollapsed = !!item.getFlag(MODULE_ID, "isCollapsed");
    const iconClass = isCollapsed ? "fa-angle-down" : "fa-angle-up";

    const toggle = document.createElement("i");
    toggle.className = `fas ${iconClass} dh-container-toggle`;
    toggle.title = isCollapsed ? "Expand container" : "Collapse container";

    toggle.addEventListener("click", async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();

        // Save scroll position before the flag update triggers a re-render
        const scrollable = element.querySelector(".scrollable");
        if (scrollable) app._dhContainerScroll = scrollable.scrollTop;

        await item.setFlag(MODULE_ID, "isCollapsed", !isCollapsed);
    });

    nameSpan.appendChild(toggle);
}

/* -------------------------------------------- */
/* Drag and Drop — Assign/Remove from Container */
/* -------------------------------------------- */

/**
 * Handles drag-and-drop of loot items onto container rows in the actor sheet.
 * Dropping a loot item onto a container assigns it; dropping elsewhere removes assignment.
 * Triggered by dropActorSheetData hook.
 * @param {Actor} actor - The actor receiving the drop.
 * @param {ActorSheet} sheet - The actor sheet application.
 * @param {object} data - The drop data payload.
 * @returns {boolean|void} False to prevent default handling when item is assigned.
 */
Hooks.on("dropActorSheetData", async (actor, sheet, data) => {
    if (data.type !== "Item" || !data.uuid) return true;

    const droppedItem = fromUuidSync(data.uuid);
    if (!droppedItem || droppedItem.type !== "loot" || droppedItem.parent?.id !== actor.id) return true;

    const targetEl = document.elementFromPoint(window.event.clientX, window.event.clientY);
    const targetRow = targetEl?.closest('li.inventory-item[data-item-type="loot"]');

    if (targetRow) {
        const targetId = targetRow.dataset.itemId;
        const targetItem = actor.items.get(targetId);

        // Only assign if target is a different item that is marked as a container
        if (targetItem && targetItem.getFlag(MODULE_ID, "isContainer") && droppedItem.id !== targetId) {
            await droppedItem.setFlag(MODULE_ID, "containerId", targetId);
            return false;
        }
    }

    // Dropped outside a container — remove from any container
    const currentParent = droppedItem.getFlag(MODULE_ID, "containerId");
    if (currentParent) {
        await droppedItem.unsetFlag(MODULE_ID, "containerId");
        return false;
    }

    return true;
});
