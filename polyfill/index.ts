import { Composite } from "./composite.ts";
import { mapPrototypeMethods } from "./collection-map.ts";
import { Set } from "./collection-set.ts";
import { arrayPrototypeMethods } from "./collection-array.ts";
import { ownKeys } from "./internal/originals.ts";

export { Composite, arrayPrototypeMethods, mapPrototypeMethods, Set };

export function install(global: Record<string, any>) {
    global["Composite"] = Composite;
    const arrayMethods = ownKeys(arrayPrototypeMethods);
    for (let i = 0; i < arrayMethods.length; i++) {
        const method = arrayMethods[i] as keyof typeof arrayPrototypeMethods;
        const impl = arrayPrototypeMethods[method];
        global["Array"].prototype[method] = impl;
    }

    const mapMethods = ownKeys(mapPrototypeMethods);
    for (let i = 0; i < mapMethods.length; i++) {
        const method = mapMethods[i] as keyof typeof mapPrototypeMethods;
        const impl = mapPrototypeMethods[method];
        global["Map"].prototype[method] = impl;
    }
    global["Set"] = Set;
}
