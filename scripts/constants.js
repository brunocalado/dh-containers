/**
 * Single source of truth for the module ID and shared constants.
 * Import MODULE_ID from here wherever the module id is needed — never write it as a string literal.
 */

/** @type {string} The module's registered id, matching the `id` field in module.json. */
export const MODULE_ID = "dh-containers";

/** Item types that can be placed inside a container. */
export const CONTAINABLE_TYPES = ["loot", "consumable", "weapon", "armor"];
