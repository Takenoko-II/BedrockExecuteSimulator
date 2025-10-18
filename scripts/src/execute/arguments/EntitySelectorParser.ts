import { DimensionTypes, Entity, EntityQueryOptions, GameMode, world } from "@minecraft/server";
import { MinecraftEntityTypes } from "../../lib/@minecraft/vanilla-data/lib/index";
import { sentry, TypeModel } from "../../lib/TypeSentry";
import { ImmutableRegistries, Registries, RegistryKey } from "../../util/Registry";
import { Serializer } from "../../util/Serializable";
import { AbstractParser } from "./AbstractParser";
import { VectorComponent, VectorComponentModel } from "./VectorResolver";
import { IntRange } from "../../util/NumberRange";
import { CommandSourceStack } from "../CommandSourceStack";

interface SelectorType {
    readonly aliveOnly: boolean;

    readonly sortOrder: keyof typeof SelectorSortOrder;

    readonly default?: SelectorDefaultParameters;
}

interface SelectorDefaultParameters {
    readonly typeSpecific?: MinecraftEntityTypes;

    readonly limit?: number;

    processor?(stack: CommandSourceStack, entities: Entity[]): Entity[];
}

interface SelectorArgumentType<T> {
    readonly invertible: boolean;

    readonly duplicatable: SelectorArgumentDuplicationRule;

    readonly type: TypeModel<T>;
}

export enum SelectorArgumentDuplicationRule {
    ALWAYS = "ALWAYS",
    INVERTED_ONLY = "EXCLUDE_INVERTED",
    NEVER = "NEVER"
}

export enum SelectorSortOrder {
    NEAREST = "NEAREST",
    RANDOM = "RANDOM"
}

type SelectorArgumentInputs = Record<string, SelectorArgumentInput[]>;

interface SelectorArgumentInput {
    readonly isInverted: boolean;

    readonly value: unknown;
}

const SelectorArgumentInputModel: TypeModel<SelectorArgumentInput> = sentry.objectOf({
    isInverted: sentry.boolean,
    value: sentry.unknown
});

const SelectorArgumentInputsModel: TypeModel<SelectorArgumentInputs> = sentry.recordOf(
    sentry.string,
    sentry.arrayOf(SelectorArgumentInputModel)
);

interface EntitySelectorArgumentTypeMap {
    readonly c: number;
    readonly dx: number;
    readonly dy: number;
    readonly dz: number;
    readonly family: string;
    readonly has_property: HasProperty;
    readonly hasitem: HasItem[];
    readonly haspermission: HasPermission;
    readonly l: number;
    readonly lm: number;
    readonly m: GameMode;
    readonly name: string;
    readonly r: number;
    readonly rm: number;
    readonly rx: number;
    readonly rxm: number;
    readonly ry: number;
    readonly rym: number;
    readonly scores: Scores;
    readonly tag: string;
    readonly type: string;
    readonly x: VectorComponent;
    readonly y: VectorComponent;
    readonly z: VectorComponent;
}

interface HasProperty {}

interface HasItem {
    readonly item: [string];

    readonly location?: [string];

    readonly slot?: [number];

    readonly quantity?: IntRange[] | number[];

    // 幻
    readonly data?: [number];
}

const IntRangeModel: TypeModel<IntRange> = sentry.classOf(IntRange);

const HasItemModel: TypeModel<HasItem> = sentry.objectOf({
    item: sentry.tupleOf(sentry.string),
    location: sentry.optionalOf(sentry.tupleOf(sentry.string)),
    slot: sentry.optionalOf(sentry.tupleOf(sentry.number.nonNaN().int())),
    quantity: sentry.optionalOf(sentry.unionOf(
        sentry.arrayOf(sentry.number.nonNaN().int()),
        sentry.arrayOf(IntRangeModel)
    )),
    data: sentry.optionalOf(sentry.tupleOf(sentry.number.nonNaN().int()))
}) as TypeModel<HasItem>;

type PermissionState = "enabled" | "disabled";

interface HasPermission {
    readonly camera: PermissionState;

    readonly dismount: PermissionState;

    readonly jump: PermissionState;

    readonly lateral_movement: PermissionState;

    readonly mount: PermissionState;

    readonly move_backward: PermissionState;

    readonly move_forward: PermissionState;

    readonly move_left: PermissionState;

    readonly move_right: PermissionState;

    readonly movement: PermissionState;

    readonly sneak: PermissionState;
}

const PermissionStateModel = sentry.unionOf(
    sentry.literalOf("enabled"),
    sentry.literalOf("disabled")
);

const HasPermissionModel: TypeModel<HasPermission> = sentry.objectOf({
    camera: PermissionStateModel,
    dismount: PermissionStateModel,
    jump: PermissionStateModel,
    lateral_movement: PermissionStateModel,
    mount: PermissionStateModel,
    move_backward: PermissionStateModel,
    move_forward: PermissionStateModel,
    move_left: PermissionStateModel,
    move_right: PermissionStateModel,
    movement: PermissionStateModel,
    sneak: PermissionStateModel
});

interface Scores {}

class SelectorArguments {
    public constructor(private readonly argumentInputs: SelectorArgumentInputs) {

    }

    public get<K extends keyof EntitySelectorArgumentTypeMap>(key: K): ({ readonly isInverted: boolean; readonly value: EntitySelectorArgumentTypeMap[K] })[] | undefined {
        if (!(key in this.argumentInputs)) {
            return undefined;
        }

        const input = this.argumentInputs[key] as { readonly isInverted: boolean; readonly value: EntitySelectorArgumentTypeMap[K] }[];

        return input;
    }
}

class EntitySelectorInterpretError extends Error {

}

export class EntitySelector {
    public constructor(public readonly selectorType: SelectorType, public readonly selectorArguments: SelectorArguments) {

    }

    private getEntityQueryOptions() {
        const entityQueryOptions: EntityQueryOptions = {};
    }
}

/**
 * @beta
 */
export class EntitySelectorParser extends AbstractParser<EntitySelector> {
    public static readonly ENTITY_SELECTOR_TYPES = RegistryKey.create<string, SelectorType>();

    public static readonly ENTITY_SELECTOR_ARGUMENT_TYPES = RegistryKey.create<string, SelectorArgumentType<unknown>>();

    public static readonly REGISTRIES: ImmutableRegistries = new Registries()
        .withRegistrar(this.ENTITY_SELECTOR_TYPES, register => {
            register("@s", {
                aliveOnly: false,
                sortOrder: SelectorSortOrder.NEAREST,
                default: {
                    limit: 1,
                    processor(stack, entities) {
                        if (!stack.hasExecutor()) return [];
                        return entities.includes(stack.getExecutor()) ? [stack.getExecutor()] : [];
                    }
                }
            });
            register("@p", {
                aliveOnly: true,
                sortOrder: SelectorSortOrder.NEAREST,
                default: {
                    typeSpecific: MinecraftEntityTypes.Player,
                    limit: 1
                }
            });
            register("@r", {
                aliveOnly: true,
                sortOrder: SelectorSortOrder.RANDOM,
                default: {
                    typeSpecific: MinecraftEntityTypes.Player,
                    limit: 1
                }
            });
            register("@a", {
                aliveOnly: false,
                sortOrder: SelectorSortOrder.NEAREST,
                default: {
                    typeSpecific: MinecraftEntityTypes.Player
                }
            });
            register("@e", {
                aliveOnly: true,
                sortOrder: SelectorSortOrder.NEAREST
            });
            register("@n", {
                aliveOnly: true,
                sortOrder: SelectorSortOrder.NEAREST,
                default: {
                    limit: 1
                }
            })
        })
        .withRegistrar(EntitySelectorParser.ENTITY_SELECTOR_ARGUMENT_TYPES, register => {
            register("c", {
                invertible: false,
                duplicatable: SelectorArgumentDuplicationRule.NEVER,
                type: sentry.number.int()
            });
            register("dx", {
                invertible: false,
                duplicatable: SelectorArgumentDuplicationRule.NEVER,
                type: sentry.number
            });
            register("dy", {
                invertible: false,
                duplicatable: SelectorArgumentDuplicationRule.NEVER,
                type: sentry.number
            });
            register("dz", {
                invertible: false,
                duplicatable: SelectorArgumentDuplicationRule.NEVER,
                type: sentry.number
            });
            register("family", {
                invertible: true,
                duplicatable: SelectorArgumentDuplicationRule.ALWAYS,
                type: sentry.string
            });
            // has_property シンプルにめんどい
            register("hasitem", {
                invertible: false,
                duplicatable: SelectorArgumentDuplicationRule.NEVER,
                type: sentry.unionOf(
                    sentry.arrayOf(HasItemModel),
                    HasItemModel
                )
            });
            register("haspermission", {
                invertible: false,
                duplicatable: SelectorArgumentDuplicationRule.NEVER,
                type: HasPermissionModel
            });
            register("l", {
                invertible: false,
                duplicatable: SelectorArgumentDuplicationRule.NEVER,
                type: sentry.number.int()
            });
            register("lm", {
                invertible: false,
                duplicatable: SelectorArgumentDuplicationRule.NEVER,
                type: sentry.number.int()
            });
            register("m", {
                invertible: true,
                duplicatable: SelectorArgumentDuplicationRule.NEVER,
                type: sentry.unionOf(
                    sentry.literalOf(0),
                    sentry.literalOf(1),
                    sentry.literalOf(2),
                    sentry.literalOf(3),
                    sentry.literalOf(GameMode.Survival),
                    sentry.literalOf(GameMode.Creative),
                    sentry.literalOf(GameMode.Adventure),
                    sentry.literalOf(GameMode.Spectator)
                )
            });
            register("name", {
                invertible: true,
                duplicatable: SelectorArgumentDuplicationRule.INVERTED_ONLY,
                type: sentry.string
            });
            register("r", {
                invertible: false,
                duplicatable: SelectorArgumentDuplicationRule.NEVER,
                type: sentry.number
            });
            register("rm", {
                invertible: false,
                duplicatable: SelectorArgumentDuplicationRule.NEVER,
                type: sentry.number
            });
            register("rx", {
                invertible: false,
                duplicatable: SelectorArgumentDuplicationRule.NEVER,
                type: sentry.number
            });
            register("rxm", {
                invertible: false,
                duplicatable: SelectorArgumentDuplicationRule.NEVER,
                type: sentry.number
            });
            register("ry", {
                invertible: false,
                duplicatable: SelectorArgumentDuplicationRule.NEVER,
                type: sentry.number
            });
            register("rym", {
                invertible: false,
                duplicatable: SelectorArgumentDuplicationRule.NEVER,
                type: sentry.number
            });
            // scores RecordModelがTypeSentryにない！！！！！！！！
            register("tag", {
                invertible: true,
                duplicatable: SelectorArgumentDuplicationRule.ALWAYS,
                type: sentry.string
            });
            register("type", {
                invertible: true,
                duplicatable: SelectorArgumentDuplicationRule.INVERTED_ONLY,
                type: sentry.string
            });
            register("x", {
                invertible: false,
                duplicatable: SelectorArgumentDuplicationRule.NEVER,
                type: VectorComponentModel
            });
            register("y", {
                invertible: false,
                duplicatable: SelectorArgumentDuplicationRule.NEVER,
                type: VectorComponentModel
            });
            register("z", {
                invertible: false,
                duplicatable: SelectorArgumentDuplicationRule.NEVER,
                type: VectorComponentModel
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

    private type(): SelectorType {
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
        else if (this.next(true, "..")) {
            const end = this.number(true);
            value = IntRange.maxOnly(end);
        }
        else if (this.test(true, '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '-')) {
            const start = this.number(true);

            if (this.next(true, "..")) {
                if (this.test(true, '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '-')) {
                    const end = this.number(true);
                    value = IntRange.minMax(start, end);
                }
                else {
                    value = IntRange.minOnly(start);
                }
            }
            else {
                value = IntRange.exactValue(start);
            }
        }
        else if (this.test(true, '{')) {
            value = this.multiMap(['{', '}']);
        }
        else if (this.test(true, '[')) {
            value = this.list();
        }
        else {
            value = this.string(false, ',', '}', ']');
        }
        return value;
    }

    private pair(): { readonly key: string; readonly isInverted: boolean; readonly value: unknown } {
        const key = this.string(false, '=');
        this.expect(true, '=');

        let isInverted = false;
        if (this.next(false, '!')) {
            isInverted = true;
        }

        let value: unknown;
        const registryLookup = EntitySelectorParser.REGISTRIES.get(EntitySelectorParser.ENTITY_SELECTOR_ARGUMENT_TYPES).lookup;

        // ちょっと特殊処理
        if (registryLookup.entries().filter(({ value: { type } }) => type === VectorComponentModel).map(({ name }) => name).includes(key)) {
            let char = this.peek(true);
            let component: VectorComponent;

            if (char === '~') {
                this.next(true);
                component = {
                    type: "relative",
                    value: this.number(false)
                }
            }
            else if (char === '^') {
                throw this.exception("キャレット表記法はセレクタ引数の値では利用できません");
            }
            else {
                component = {
                    type: "absolute",
                    value: this.number(false)
                }
            }

            value = component;
        }
        else {
            value = this.value();
        }

        return {
            key,
            isInverted,
            value
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

    private multiMap(braces: readonly [string, string]): SelectorArgumentInputs {
        const map: SelectorArgumentInputs = {};
        this.expect(true, braces[0]);

        if (this.next(true, braces[1])) {
            return map;
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

    private arguments(): SelectorArgumentInputs {
        const inputs = this.multiMap(['[', ']']);

        const registry = EntitySelectorParser.REGISTRIES.get(EntitySelectorParser.ENTITY_SELECTOR_ARGUMENT_TYPES);
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

            function extract(map: SelectorArgumentInputs) {
                const newMap: Record<string, unknown[]> = {};

                for (const [k, v] of Object.entries(map)) {
                    newMap[k] = v.map(v => v.value);
                }

                console.log(serializer.serialize(newMap));

                return newMap;
            }

            for (const { value } of list) {
                if (SelectorArgumentInputsModel.test(value)) {
                    // 引数の値がMapだったら
                    const v = extract(value);
                    if (!argumentType.type.test(v)) {
                        throw new EntitySelectorInterpretError("セレクタ引数 '" + name + "' (" + argumentType.type.toString() + ") に不適当な値です: " + serializer.serialize(v));
                    }
                }
                else if (sentry.arrayOf(SelectorArgumentInputsModel).test(value)) {
                    // 引数の値がList<Map>だったら (ex: hasitem=[{...}])
                    for (const map of value) {
                        const v = extract(map);
                        if (!argumentType.type.test(v)) {
                            throw new EntitySelectorInterpretError("セレクタ引数 '" + name + "' (" + argumentType.type.toString() + ") に不適当な値です: " + serializer.serialize(v));
                        }
                    }
                }
                else if (!argumentType.type.test(value)) {
                    throw new EntitySelectorInterpretError("セレクタ引数 '" + name + "' (" + argumentType.type.toString() + ") に不適当な値です: " + serializer.serialize(value));
                }
            }
        }

        return inputs;
    }

    public override parse(): EntitySelector {
        const type = this.type();
        const args = this.arguments();

        const s = new Serializer();
        s.hidePrototypeOf(Object);
        s.hidePrototypeOf(Array);
        s.hidePrototypeOf(Function);
        //console.log(s.serialize(type));
        //console.log(s.serialize(args));

        return new EntitySelector(type, new SelectorArguments(args));
    }

    static {
        const a = new EntitySelectorParser("@e[type=player,hasitem=[{item=apple,quantity=0..}],name=!foo,x=~-0.0]").parse();
        const s = new Serializer();
        s.hidePrototypeOf(Object);
        s.hidePrototypeOf(Array);
        s.hidePrototypeOf(Function);
        const h = a.selectorArguments.get("hasitem")!![0].value;
        console.log(s.serialize(h[0].quantity))
    }
}

/**
 * 1. EntityQueryOptionsの生成
 * 2. ディメンション制限チェックを行う
 * 3. 生死判定が可能かを見て全エンティティの配列を取得(getEntities() exclude player concat getPlayers())
 * 4. 探索基準位置の取得
 * 5. 探索基準位置でソート
 * 6. 選択制限の取得
 * 7. 選択制限の符号から配列を反転／反転しない
 * 8. 選択制限によって配列を切り取り
 * 
 * 問題は 1 の細分化
 */

/**
 * TODO
 * number()とRangeParseの競合解決
 * haspermissionとかをhasitemに合わせて整形
 * scoresの定義
 * has_propertyの定義
 * EntitySelector生成の実装
 */
