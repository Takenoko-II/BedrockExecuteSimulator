class RegistryError extends Error {}

export class RegistryKey<I, O> {
    private static registryKeyMaxId: number = 0;

    public readonly id: number = RegistryKey.registryKeyMaxId++;

    private constructor(public readonly toStoredValue: (i: I) => O) {}

    public static create<T, U>(toStoredValue: (i: T) => U): RegistryKey<T, U>;

    public static create<T>(): RegistryKey<T, T>;

    public static create<T, U>(toStoredValue?: (i: T) => U): RegistryKey<T, U> | RegistryKey<T, T> {
        if (toStoredValue) {
            return new this(toStoredValue);
        }
        else {
            return new this(x => x);
        }
    }
}

export class ImmutableRegistry<I, O> {
    private readonly __registry__: Map<string, O> = new Map();

    private readonly key: RegistryKey<I, O>;

    public readonly lookup: RegistryLookup<O> = new RegistryLookup(this.__registry__);

    public constructor(key: RegistryKey<I, O>);

    public constructor(registry: ImmutableRegistry<I, O>);

    public constructor(keyOrRegistry: RegistryKey<I, O> | ImmutableRegistry<I, O>) {
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

    protected register(key: string, value: I): void {
        this.__registry__.set(key, this.key.toStoredValue(value));
    }

    protected unregister(key: string): void {
        this.__registry__.delete(key);
    }
}

class RegistryLookup<O> {
    public constructor(private readonly __registry__: Map<string, O>) {}

    public find(name: string): O {
        if (this.__registry__.has(name)) {
            return this.__registry__.get(name)!;
        }
        else {
            throw new RegistryError();
        }
    }
}

export class ImmutableRegistries {
    private readonly __registries__: Map<RegistryKey<unknown, unknown>, ImmutableRegistry<unknown, unknown>> = new Map();

    public constructor();

    public constructor(registries: ImmutableRegistries);

    public constructor(registries?: ImmutableRegistries) {
        if (registries) {
            registries.__registries__.forEach((v, k) => {
                this.__registries__.set(k, v);
            });
        }
    }

    private createRegistry(registryKey: RegistryKey<unknown, unknown>): void {
        this.__registries__.set(registryKey, new ImmutableRegistry(registryKey));
    }

    public get<I, O>(registryKey: RegistryKey<I, O>): ImmutableRegistry<I, O> {
        if (!this.__registries__.has(registryKey as RegistryKey<unknown, unknown>)) {
            this.createRegistry(registryKey as RegistryKey<unknown, unknown>);
        }

        return this.__registries__.get(registryKey as RegistryKey<unknown, unknown>) as ImmutableRegistry<I, O>;
    }
}

export class Registry<I, O> extends ImmutableRegistry<I, O> {
    public override register(key: string, value: I): void {
        super.register(key, value);
    }

    public override unregister(key: string): void {
        super.unregister(key);
    }
}

export class Registries extends ImmutableRegistries {
    public override get<I, O>(registryKey: RegistryKey<I, O>): Registry<I, O> {
        return super.get(registryKey) as Registry<I, O>;
    }
}
