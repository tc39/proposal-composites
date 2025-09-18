import { Composite } from "./composite.ts";
export { Composite };

export function install(global: Record<string, any>) {
    global["Composite"] = Composite;
}
