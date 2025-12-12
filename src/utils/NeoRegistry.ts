import { TypeModel } from "../libs/TypeSentry";
import { AbstractParser } from "./AbstractParser";

export class Identifier {
    public constructor(public readonly namespace: string, public readonly value: string) {}

    public equals(other: Identifier): boolean {
        return this.namespace === other.namespace && this.value === other.value;
    }

    public toString(): string {
        return this.namespace + ':' + this.value;
    }

    public static of(string: string): Identifier {
        return IdentifierParser.readIdentifier(string);
    }
}

class IdentifierParseError extends Error {}

export class IdentifierParser extends AbstractParser<Identifier, IdentifierParseError> {
    private constructor(text: string, private readonly defaultNamespace?: string) {
        super(text);
    }

    protected override getErrorConstructor(): new (message: string, cause?: Error) => IdentifierParseError {
        return IdentifierParseError;
    }

    protected override getQuotes(): Set<string> {
        return new Set(['\'', '"']);
    }

    protected override getWhitespace(): Set<string> {
        return new Set([' ']);
    }

    protected override getFalse(): string {
        return "false";
    }

    protected override getTrue(): string {
        return "true";
    }

    private first(): { readonly first: string; readonly hasSecond: boolean } {
        if (this.test(true, ...this.getQuotes())) {
            const str = this.quotedString(true);
            return {
                hasSecond: this.test(false, ':') !== undefined,
                first: str
            };
        }

        const str = this.unquotedString(true, ':');
        return {
            hasSecond: !this.isOnlyWhitespaceRemaining(),
            first: str
        };
    }

    private second(): string {
        if (this.isOver()) {
            return '';
        }

        if (this.test(false, ...this.getQuotes())) {
            const str = this.quotedString(true);
            return str;
        }

        return this.unquotedString(false);
    }

    protected override parse(): Identifier {
        const { hasSecond, first } = this.first();

        let namespace: string;
        let value: string;

        if (hasSecond) {
            namespace = first;
            this.expect(false, ':');
            value = this.second();
        }
        else {
            if (this.defaultNamespace) namespace = this.defaultNamespace;
            else throw this.exception("名前空間がありません");
            value = first;
        }

        this.finish();

        return new Identifier(namespace, value);
    }

    public static readDeaultedIdentifier(defaultNamespace: string, string: string): Identifier {
        return new IdentifierParser(string, defaultNamespace).parse();
    }

    public static readIdentifier(string: string): Identifier {
        return new IdentifierParser(string).parse();
    }
}

class RegistryError extends Error {}

class RegistryKey<V> {
    protected constructor(protected readonly registry: Registry<V>, protected readonly identifier: Identifier) {}

    public getIdentifier() {
        return this.identifier;
    }

    public equals(other: RegistryKey<V>): boolean {
        return this.registry === other.registry && this.identifier.equals(other.identifier);
    }

    public toString(): string {
        return "RegistryKey<" + this.identifier + ">";
    }

    public static of<V>(registry: Registry<V>, identifier: Identifier): RegistryKey<V> {
        return new RegistryKey(registry, identifier);
    }
}

class RegistryEntry<V> {
    public constructor(public readonly identifier: Identifier, public readonly value: V) {}
}

export abstract class Registry<V> {
    private readonly key: RegistryKey<V>;

    protected readonly entries = new Set<RegistryEntry<V>>();

    protected constructor(protected identifier: Identifier, protected readonly type: TypeModel<V>) {
        this.key = RegistryKey.of(this, identifier);
    }

    public getRegistryKey(): RegistryKey<V> {
        return this.key;
    }

    public contains(identifier: Identifier): boolean {
        for (const entry of this.entries) {
            if (entry.identifier.equals(identifier)) {
                return true;
            }
        }

        return false;
    }

    public get(identifier: Identifier): V {
        if (!this.contains(identifier)) {
            throw new RegistryError("存在しないキーです: " + identifier);
        }

        for (const entry of this.entries) {
            if (entry.identifier.equals(identifier)) {
                return entry.value;
            }
        }

        throw new RegistryError("NEVER HAPPENS");
    }

    public getEntries(predicate?: (entry: RegistryEntry<V>) => boolean): ReadonlySet<RegistryEntry<V>> {
        const set = new Set<RegistryEntry<V>>();

        for (const entry of this.entries) {
            if (predicate) {
                if (predicate(entry)) {
                    set.add(entry);
                }
            }
            else {
                set.add(entry);
            }
        }

        return set;
    }
}

class MutableRegistry<V> extends Registry<V> {
    public constructor(identifier: Identifier, type: TypeModel<V>) {
        super(identifier, type);
    }

    public register(identifier: Identifier, value: V): RegistryEntry<V> {
        if (this.contains(identifier)) {
            throw new RegistryError("使用済みのIDです: " + value);
        }

        if (!this.type.test(value)) {
            throw new RegistryError("不正な型の値です: " + value);
        }

        const entry = new RegistryEntry(identifier, Object.freeze(value));
        this.entries.add(entry);
        return entry;
    }

    public unregister(identifier: Identifier): RegistryEntry<V> {
        if (!this.contains(identifier)) {
            throw new RegistryError("存在しないキーです: " + identifier);
        }

        for (const entry of this.entries) {
            if (entry.identifier.equals(identifier)) {
                this.entries.delete(entry);
                return entry;
            }
        }

        throw new RegistryError("NEVER HAPPENS");
    }
}

export interface RegistryRegistrar<V> {
    readonly type: TypeModel<V>;

    register?(registry: MutableRegistry<V>): void;
}

type RegistriesInitializer = {
    /**
     * any要注意？
     */
    readonly [key: string]: RegistryRegistrar<any>;
};

type InitializerToRegistries<T extends Record<string, RegistryRegistrar<unknown>>> = {
    readonly [K in keyof T]: T[K] extends RegistryRegistrar<infer V> ? Registry<V> : never;
};

export class Registries<I extends RegistriesInitializer, R extends InitializerToRegistries<I> = InitializerToRegistries<I>> {
    private readonly initializer: I;

    private readonly registries: R;

    public constructor(initializer: I) {
        this.initializer = initializer;

        const r: Record<string, Registry<unknown>> = {};

        for (const [identifier, registrar] of Object.entries(initializer)) {
            const registry = new MutableRegistry(
                Identifier.of(identifier),
                registrar.type
            );

            if (registrar.register) registrar.register(registry);
            r[identifier] = registry;
        }

        this.registries = r as R;
    }

    public get<K extends keyof R>(identifier: K): R[K];

    public get<V>(key: RegistryKey<V>): Registry<V>;

    public get<K extends keyof R, V>(identifierOrKey: K | RegistryKey<V>): R[K] | Registry<V> {
        if (identifierOrKey instanceof RegistryKey) {
            for (const __registry__ of Object.values(this.registries)) {
                const registry = __registry__ as Registry<unknown>;
                if (registry.getRegistryKey().equals(identifierOrKey)) {
                    return registry as Registry<V>;
                }
            }

            throw new RegistryError("対応するレジストリが見つかりませんでした");
        }
        else {
            return this.registries[identifierOrKey];
        }
    }

    public withRegistry<const K extends string, const Q extends RegistryRegistrar<any>>(identifier: K, registrar: Q): Registries<I & Record<K, Q>> {
        return new Registries({ ...this.initializer, [identifier]: registrar });
    }
}

export function registryRegistrar<V>(type: TypeModel<V>, register?: (registry: MutableRegistry<V>) => void): RegistryRegistrar<V> {
    return register === undefined
        ? { type }
        : { type, register };
}
