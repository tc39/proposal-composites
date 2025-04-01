import { Composite } from "./composite.ts";
import { Map } from "./collection-map.ts";
import { Set } from "./collection-set.ts";
import { arrayPrototypeMethods } from "./collection-array.ts";
import { ownKeys } from "./originals.ts";

export {
    Composite, Map, Set, arrayPrototypeMethods
}

export function install(global: Record<string, any>) {
    global["Map"] = Map;
    global["Set"] = Set;
    global["Composite"] = Composite;
    const arrayMethods = ownKeys(arrayPrototypeMethods);
    for (let i = 0; i < arrayMethods.length; i++) {
        const method = arrayMethods[i] as keyof typeof arrayPrototypeMethods;
        const impl = arrayPrototypeMethods[method];
        global["Array"][method] = impl;
    }
}
