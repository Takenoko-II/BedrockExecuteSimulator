import { world } from "@minecraft/server";
import { SelectorArgumentInputMap, SelectorArguments } from "./SelectorArguments";
import { SelectorSortOrder, SelectorType } from "./SelectorType";
import { AbstractParser } from "../AbstractParser";
import { SelectorArgumentDuplicationRule } from "./SelectorArgumentType";
import { IntRange } from "../../../util/NumberRange";
import { Serializer } from "../../../util/Serializable";
import { EntitySelector } from "./EntitySelector";
import { MinecraftEntityTypes } from "../../../lib/@minecraft/vanilla-data/lib/index";
import { ENTITY_SELECTOR_ARGUMENT_TYPES, ENTITY_SELECTOR_REGISTRIES, ENTITY_SELECTOR_TYPES } from "./EntitySelectorRegistries";
import { VectorComponent, VectorComponentType } from "../vector/AbstractVectorResolver";

export class EntitySelectorInterpretError extends Error {}

export class EntitySelectorParser extends AbstractParser<EntitySelector, EntitySelectorInterpretError> {
    protected override getErrorConstructor(): (message: string, cause?: Error) => EntitySelectorInterpretError {
        return (message: string, cause?: Error) => new EntitySelectorInterpretError(message, cause);
    }

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
        s.delete('.');
        return s;
    }

    private constructor(text: string) {
        super(text);
    }

    private type(): SelectorType | undefined {
        for (const { name, value } of ENTITY_SELECTOR_REGISTRIES.get(ENTITY_SELECTOR_TYPES).lookup.entries()) {
            if (this.next(true, name)) {
                return value;
            }
        }

        // throw this.exception("有効なセレクタタイプが見つかりませんでした");

        // セレクタタイプなし=プレイヤー名として解釈
        return undefined;
    }

    private value(): unknown {
        let value: unknown;
        if (this.test(true, this.getTrue(), this.getFalse())) {
            value = this.bool();
        }
        else if (this.next(true, "..")) {
            const end = this.int(false);
            value = IntRange.maxOnly(end);
        }
        else if (this.test(true, '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '-')) {
            const start = this.int(true);

            if (this.next(true, "..")) {
                if (this.test(true, '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '-')) {
                    const end = this.int(false);
                    value = IntRange.minMax(start, end);
                }
                else {
                    value = IntRange.minOnly(start);
                }
            }
            else {
                value = start;
            }
        }
        else if (this.next(true, '~')) {
            value = {
                type: VectorComponentType.RELATIVE,
                value: this.float(true)
            } as VectorComponent;
        }
        else if (this.test(true, '{')) {
            value = this.multiMap(['{', '}']);
        }
        else if (this.test(true, '[')) {
            value = this.list();
        }
        else {
            value = this.string(true, ',', '}', ']').value;
        }
        return value;
    }

    private pair(): { readonly key: string; readonly isInverted: boolean; readonly value: unknown } {
        const key = this.unquotedString(true, '=');
        this.expect(true, '=');

        let isInverted = false;
        if (this.next(false, '!')) {
            isInverted = true;
        }

        return {
            key,
            isInverted,
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
            list.push(value);

            if (this.next(true, ']')) {
                return list;
            }
            else if (!this.next(true, ',')) {
                throw this.exception("Listの閉じ括弧が見つかりません");
            }
        }

        throw this.exception("Listの閉じ括弧が見つかりません");
    }

    private multiMap(braces: readonly [string, string]): SelectorArgumentInputMap {
        const map: SelectorArgumentInputMap = {};

        if (!this.next(true, braces[0])) {
            return map;
        }

        if (this.next(true, braces[1])) {
            throw this.exception("空のセレクタ引数は無効です");
        }

        while (!this.isOver()) {
            const { key, isInverted, value } = this.pair();
            
            if (key in map) {
                map[key].push({ isInverted, value });
            }
            else {
                map[key] = [{ isInverted, value }];
            }

            if (this.next(true, braces[1])) {
                return map;
            }
            else if (!this.next(true, ',')) {
                throw this.exception("Mapの閉じ括弧が見つかりません");
            }
        }

        throw this.exception("Mapの閉じ括弧が見つかりません");
    }

    private arguments(): SelectorArguments {
        const inputs = this.multiMap(['[', ']']);

        const registry = ENTITY_SELECTOR_REGISTRIES.get(ENTITY_SELECTOR_ARGUMENT_TYPES);
        const serializer = new Serializer();
        serializer.hidePrototypeOf(Object);
        serializer.hidePrototypeOf(Array);
        serializer.hidePrototypeOf(Function);
        serializer.indentationSpaceCount = 1;
        serializer.linebreakable = false;

        for (const [name, list] of Object.entries(inputs)) {
            if (!registry.lookup.has(name)) {
                throw new EntitySelectorInterpretError("不明なセレクタ引数です: '" + name + "'");
            }

            const argumentType = registry.lookup.find(name);

            if (!argumentType.invertible && list.some(i => i.isInverted)) {
                throw new EntitySelectorInterpretError("セレクタ引数 '" + name + "' は反転できません");
            }

            switch (argumentType.duplicatable) {
                case SelectorArgumentDuplicationRule.NEVER: {
                    if (list.length > 1) throw new EntitySelectorInterpretError("セレクタ引数 '" + name + "' はいかなる場合も重複できません");
                    break;
                }
                case SelectorArgumentDuplicationRule.INVERTED_ONLY: {
                    if (list.length > 1 && list.some(i => !i.isInverted)) {
                        throw new EntitySelectorInterpretError("セレクタ引数 '" + name + "' はすべての入力が反転されたときにのみ重複できます");
                    }
                    break;
                }
                case SelectorArgumentDuplicationRule.ALWAYS: break;
            }

            for (const { value } of list) {
                if (!argumentType.type.test(value)) {
                    throw new EntitySelectorInterpretError("セレクタ引数 '" + name + "' (" + argumentType.type.toString() + ") に不適当な値です: " + serializer.serialize(value));
                }
            }
        }

        return new SelectorArguments(inputs);
    }

    protected override parse(): EntitySelector {
        const selectorType = this.type();

        if (selectorType === undefined) {
            const text = this.text;

            // this.finish();

            return new EntitySelector(
                {
                    aliveOnly: false,
                    sortOrder: SelectorSortOrder.NEAREST,
                    traits: {
                        limit: 1,
                        typeSpecific: {
                            type: MinecraftEntityTypes.Player,
                            overridable: false
                        },
                        processor() {
                            return world.getPlayers({ name: text });
                        }
                    }
                },
                new SelectorArguments({})
            );
        }

        const selectorArguments = this.arguments();

        this.finish();

        return new EntitySelector(selectorType, selectorArguments);
    }

    public static readSelector(selector: string): EntitySelector {
        return new EntitySelectorParser(selector).parse();
    }
}
