class RegistryError extends Error {}

export class RegistryKey<K, I, O> {
    private static registryKeyMaxId: number = 0;

    public readonly id: number = RegistryKey.registryKeyMaxId++;

    private constructor(public readonly toStoredValue: (i: I) => O) {}

    public static create<K, T, U>(toStoredValue: (i: T) => U): RegistryKey<K, T, U>;

    public static create<K, T>(): RegistryKey<K, T, T>;

    public static create<K, T, U>(toStoredValue?: (i: T) => U): RegistryKey<K, T, U> | RegistryKey<K, T, T> {
        if (toStoredValue) {
            return new this(toStoredValue);
        }
        else {
            return new this(x => x);
        }
    }
}

export class ImmutableRegistry<K, I, O> {
    private readonly __registry__: Map<K, O> = new Map();

    private readonly key: RegistryKey<K, I, O>;

    public readonly lookup: RegistryLookup<K, O> = new RegistryLookup(this.__registry__);

    public constructor(key: RegistryKey<K, I, O>);

    public constructor(registry: ImmutableRegistry<K, I, O>);

    public constructor(keyOrRegistry: RegistryKey<K, I, O> | ImmutableRegistry<K, I, O>) {
        if (keyOrRegistry instanceof RegistryKey) {
            this.key = keyOrRegistry;
        }
        else {
            this.key = keyOrRegistry.key;
            keyOrRegistry.__registry__.forEach((v, k) => {
                this.__registry__.set(k ,v);
            });
        }
    }

    protected register(key: K, value: I): void {
        this.__registry__.set(key, this.key.toStoredValue(value));
    }

    protected unregister(key: K): void {
        this.__registry__.delete(key);
    }
}

interface RegistryEntry<K, O> {
    readonly name: K;

    readonly value: O;
}

class RegistryLookup<K, O> {
    public constructor(private readonly __registry__: Map<K, O>) {}

    public has(name: K): boolean {
        return this.__registry__.has(name);
    }

    public find(name: K): O {
        if (this.__registry__.has(name)) {
            return this.__registry__.get(name)!;
        }
        else {
            throw new RegistryError("存在しないキーです");
        }
    }

    public entries(): RegistryEntry<K, O>[] {
        const array: RegistryEntry<K, O>[] = [];

        this.__registry__.forEach((v, k) => {
            array.push({
                name: k,
                value: v
            })
        });

        return array;
    }
}

export class ImmutableRegistries {
    private readonly __registries__: Map<RegistryKey<unknown, unknown, unknown>, ImmutableRegistry<unknown, unknown, unknown>> = new Map();

    public constructor();

    public constructor(registries: ImmutableRegistries);

    public constructor(registries?: ImmutableRegistries) {
        if (registries) {
            registries.__registries__.forEach((v, k) => {
                this.__registries__.set(k, v);
            });
        }
    }

    private createRegistry(registryKey: RegistryKey<unknown, unknown, unknown>): void {
        this.__registries__.set(registryKey, new ImmutableRegistry(registryKey));
    }

    public get<K, I, O>(registryKey: RegistryKey<K, I, O>): ImmutableRegistry<K, I, O> {
        if (!this.__registries__.has(registryKey as RegistryKey<unknown, unknown, unknown>)) {
            this.createRegistry(registryKey as RegistryKey<unknown, unknown, unknown>);
        }

        return this.__registries__.get(registryKey as RegistryKey<unknown, unknown, unknown>) as ImmutableRegistry<K, I, O>;
    }
}

export class Registry<K, I, O> extends ImmutableRegistry<K, I, O> {
    public override register(key: K, value: I): void {
        super.register(key, Object.freeze(value));
    }

    public override unregister(key: K): void {
        super.unregister(key);
    }
}

export class Registries extends ImmutableRegistries {
    public override get<K, I, O>(registryKey: RegistryKey<K, I, O>): Registry<K, I, O> {
        return super.get(registryKey) as Registry<K, I, O>;
    }

    public withRegistrar<K, I, O>(registryKey: RegistryKey<K, I, O>, callback: (register: (key: K, value: I) => void) => void): Registries {
        callback((key, value) => {
            this.get(registryKey).register(key, value);
        });
        return this;
    }
}
