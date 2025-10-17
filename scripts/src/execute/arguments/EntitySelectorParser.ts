import { MinecraftEntityTypes } from "../../lib/@minecraft/vanilla-data/lib/index";
import { TypeModel } from "../../lib/TypeSentry";
import { ImmutableRegistries, Registries, RegistryKey } from "../../util/Registry";
import { Serializer } from "../../util/Serializable";
import { AbstractParser } from "./AbstractParser";

export class MojangBugError extends Error {
    public constructor(message: string) {
        super(message + " お の れ も や ん ");
    }
}

export class SelectorParseError extends Error {
    public constructor(message: string) {
        super(message);
    }
}

interface EntitySelectorType {
    readonly aliveOnly: boolean;

    readonly sortOrder: keyof typeof SelectorSortOrder;

    readonly default?: EntitySelectorDefaultParameters;
}

interface EntitySelectorDefaultParameters {
    readonly typeSpecific?: MinecraftEntityTypes;

    readonly selectionLimit?: number;
}

export interface EntitySelector {}

export enum SelectorSortOrder {
    NEAREST = "NEAREST",
    RANDOM = "RANDOM"
}

type SelectorArgumentMap = Record<string, SelectorArgumentValue>;

interface SelectorArgumentValue {
    readonly not: boolean;

    readonly value: unknown;
}

/**
 * @beta
 */
export class EntitySelectorParser extends AbstractParser<EntitySelector> {
    private static readonly ENTITY_SELECTOR_TYPES = RegistryKey.create<string, EntitySelectorType>();

    private static readonly ENTITY_SELECTOR_ARGUMENT_TYPES = RegistryKey.create<string, TypeModel<unknown>>();

    private static readonly REGISTRIES: ImmutableRegistries = new Registries()
        .withRegistrar(this.ENTITY_SELECTOR_TYPES, registrar => {
            registrar("@s", {
                aliveOnly: false,
                sortOrder: SelectorSortOrder.NEAREST,
                default: {
                    selectionLimit: 1
                }
            });
            registrar("@p", {
                aliveOnly: true,
                sortOrder: SelectorSortOrder.NEAREST,
                default: {
                    typeSpecific: MinecraftEntityTypes.Player,
                    selectionLimit: 1
                }
            });
            registrar("@r", {
                aliveOnly: true,
                sortOrder: SelectorSortOrder.RANDOM,
                default: {
                    typeSpecific: MinecraftEntityTypes.Player,
                    selectionLimit: 1
                }
            });
            registrar("@a", {
                aliveOnly: false,
                sortOrder: SelectorSortOrder.NEAREST,
                default: {
                    typeSpecific: MinecraftEntityTypes.Player
                }
            });
            registrar("@e", {
                aliveOnly: true,
                sortOrder: SelectorSortOrder.NEAREST
            });
        });

    protected override getWhitespace(): Set<string> {
        return new Set([' ', '\n']);
    }

    protected override getQuotes(): Set<string> {
        return new Set(['"']);
    }

    protected override getTrue(): string {
        return "true";
    }

    protected override getFalse(): string {
        return "false";
    }

    protected override getInvalidSymbolsInUnquotedString(): Set<string> {
        const s = super.getInvalidSymbolsInUnquotedString();
        s.delete(':');
        return s;
    }

    private constructor(text: string) {
        super(text);
    }

    private type(): EntitySelectorType {
        for (const { name, value } of EntitySelectorParser.REGISTRIES.get(EntitySelectorParser.ENTITY_SELECTOR_TYPES).lookup.entries()) {
            if (this.next(true, name)) {
                return value;
            }
        }

        throw this.exception("有効なセレクタタイプが見つかりませんでした");
    }

    private value(): unknown {
        let value: unknown;
        if (this.test(true, this.getTrue(), this.getFalse())) {
            value = this.bool();
        }
        else if (this.test(true, '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '-')) {
            value = this.number(false);
        }
        else if (this.test(true, '{')) {
            value = this.map(['{', '}']);
        }
        else if (this.test(true, '[')) {
            value = this.list();
        }
        else {
            value = this.string(false, ',', '}', ']');
        }
        return value;
    }

    private pair(): { readonly key: string; readonly not: boolean; readonly value: unknown } {
        const key = this.string(false, '=');
        this.expect(true, '=');

        let not = false;
        if (this.next(false, '!')) {
            not = true;
        }

        return {
            key,
            not,
            value: this.value()
        };
    }

    private list() {
        const list: unknown[] = [];
        this.expect(true, '[');

        if (this.next(true, ']')) {
            return list;
        }

        while (!this.isOver()) {
            const value: unknown = this.value();

            if (this.next(true, ']')) {
                return list;
            }
            else if (!this.next(true, ',')) {
                throw this.exception("Listの閉じ括弧が見つかりません");
            }
        }

        throw this.exception("Listの閉じ括弧が見つかりません");
    }

    private map(braces: readonly [string, string]): SelectorArgumentMap {
        const map: SelectorArgumentMap = {};
        this.expect(true, braces[0]);

        if (this.next(true, braces[1])) {
            return map;
        }

        while (!this.isOver()) {
            const { key, not, value } = this.pair();
            map[key] = { not, value };

            if (this.next(true, braces[1])) {
                return map;
            }
            else if (!this.next(true, ',')) {
                throw this.exception("Mapの閉じ括弧が見つかりません");
            }
        }

        throw this.exception("Mapの閉じ括弧が見つかりません");
    }

    private arguments(): SelectorArgumentMap {
        return this.map(['[', ']']);
    }

    public override parse(): EntitySelector {
        const type = this.type();
        const args = this.arguments();

        const s = new Serializer();
        s.hidePrototypeOf(Object);
        s.hidePrototypeOf(Array);
        s.hidePrototypeOf(Function);
        console.log(s.serialize(type));
        console.log(s.serialize(args));

        return {};
    }

    static {
        new EntitySelectorParser("@e[type=player,hasitem={item=apple,quantity=0},name=!foo]").parse();
    }
}
