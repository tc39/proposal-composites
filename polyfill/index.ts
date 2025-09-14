import { Composite, isComposite } from "./composite.ts";
import { apply, construct, setPrototypeOf } from "./internal/originals.ts";
import { EMPTY } from "./internal/utils.ts";
export { Composite };

export function install(global: Record<string, any>) {
    global["Composite"] = Composite;

    const WeakMap = global.WeakMap as WeakMapConstructor;
    if (WeakMap) {
        const originalSet = WeakMap.prototype.set;
        const originalHas = WeakMap.prototype.has;
        WeakMap.prototype.set = function set(key, value) {
            // Validate receiver is a WeakMap before inspecting arguments
            apply(originalHas, this, EMPTY);
            if (isComposite(key)) {
                throw new TypeError("Invalid value used as weak map key");
            }
            return apply(originalSet, this, [key, value]);
        };
    }

    const WeakSet = global.WeakSet as WeakSetConstructor;
    if (WeakSet) {
        const originalAdd = WeakSet.prototype.add;
        const originalHas = WeakSet.prototype.has;
        WeakSet.prototype.add = function add(value) {
            // Validate receiver is a WeakSet before inspecting arguments
            apply(originalHas, this, EMPTY);
            if (isComposite(value)) {
                throw new TypeError("Invalid value used in weak set");
            }
            return apply(originalAdd, this, [value]);
        };
    }

    const WeakRef = global.WeakRef as WeakRefConstructor;
    if (WeakRef) {
        const OriginalWeakRef = WeakRef;
        const WrappedWeakRef = function WeakRef(this: object, target: object) {
            if (!new.target) {
                throw new TypeError("Constructor WeakRef requires 'new'");
            }
            if (isComposite(target)) {
                throw new TypeError("Invalid value used in weak ref");
            }
            return construct(OriginalWeakRef, [target], new.target);
        };

        WrappedWeakRef.prototype = OriginalWeakRef.prototype;
        setPrototypeOf(WrappedWeakRef, OriginalWeakRef);
        global.WeakRef = WrappedWeakRef;
    }

    const FinalizationRegistry = global.FinalizationRegistry as FinalizationRegistryConstructor;
    if (FinalizationRegistry) {
        const originalRegister = FinalizationRegistry.prototype.register;
        const originalUnregister = FinalizationRegistry.prototype.unregister;
        const unRegisterTokenArg = [{}];
        FinalizationRegistry.prototype.register = function register(target, heldValue, unregisterToken) {
            // Validate receiver is a FinalizationRegistry before inspecting arguments
            apply(originalUnregister, this, unRegisterTokenArg);
            if (isComposite(target) || isComposite(unregisterToken)) {
                throw new TypeError("Invalid value used in finalization registry");
            }
            return apply(originalRegister, this, [target, heldValue, unregisterToken]);
        };
    }
}
