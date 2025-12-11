export interface EventBase {}

export interface EventSpecs {}

export enum EventHandlerPriority {
    EARLIEST = 5,
    ERALIER = 4,
    NORMAL = 3,
    LATER = 2,
    LATEST = 1
}

export type EventHandlerRegistries<S extends EventSpecs> = { readonly [K in keyof S]: EventHandlerRegistry<S, K> };

interface EventHandler<S extends EventSpecs, K extends keyof S> {
    readonly callback: (event: S[K]) => void;

    readonly priority: EventHandlerPriority;
}

export class EventHandlerRegistry<S extends EventSpecs, K extends keyof S> {
    private readonly handlers: Map<number, EventHandler<S, K>> = new Map();

    private handlerNextId: number = Number.MIN_SAFE_INTEGER;

    public constructor() {}

    public register(callback: (event: S[K]) => void, priority: EventHandlerPriority): number {
        const id = this.handlerNextId++;
        this.handlers.set(id, {
            callback,
            priority
        });
        return id;
    }

    public unregister(id: number): boolean {
        if (this.handlers.has(id)) {
            this.handlers.delete(id);
            return true;
        }
        else return false;
    }

    private getSortedHandlers(): readonly EventHandler<S, K>[] {
        return [...this.handlers.values()].sort((a, b) => {
            return b.priority - a.priority;
        });
    }

    public fire(event: S[K]): void {
        this.getSortedHandlers().forEach(handler => {
            handler.callback(event);
        });
    }
}

export abstract class AbstractEventEmitter<S extends EventSpecs> {
    protected abstract readonly registries: EventHandlerRegistries<S>;

    public constructor() {}

    public on<T extends keyof S>(event: T, callback: (event: S[T]) => void, priority: EventHandlerPriority = EventHandlerPriority.NORMAL): number {
        return this.registries[event].register(callback, priority);
    }

    public once<T extends keyof S>(event: T, callback: (event: S[T]) => void, priority: EventHandlerPriority = EventHandlerPriority.NORMAL): number {
        const id: number = this.registries[event].register(arg => {
            callback(arg);
            this.off(event, id);
        }, priority);
        return id;
    }

    public off<T extends keyof S>(event: T, id: number): boolean {
        return this.registries[event].unregister(id);
    }

    public emit<T extends keyof S>(name: T, event: S[T]): void {
        return this.registries[name].fire(event);
    }
}
