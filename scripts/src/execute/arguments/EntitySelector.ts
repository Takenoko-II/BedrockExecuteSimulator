import { Dimension, DimensionTypes, Entity, EntityComponentTypes, EntityQueryOptions, EntityQueryPropertyOptions, EntityQueryScoreOptions, GameMode, InputPermissionCategory, Player, world } from "@minecraft/server";
import { MinecraftEntityTypes } from "../../lib/@minecraft/vanilla-data/lib/index";
import { sentry, TypeModel } from "../../lib/TypeSentry";
import { ImmutableRegistries, Registries, RegistryKey } from "../../util/Registry";
import { Serializer } from "../../util/Serializable";
import { AbstractParser } from "./AbstractParser";
import { PositionVectorResolver, VectorComponent, VectorComponentModel } from "./VectorResolver";
import { IntRange } from "../../util/NumberRange";
import { CommandSourceStack } from "../CommandSourceStack";

interface SelectorType {
    readonly aliveOnly: boolean;

    readonly sortOrder: keyof typeof SelectorSortOrder;

    readonly default?: SelectorDefaultParameters;
}

interface TypeSpecific {
    readonly type: MinecraftEntityTypes;

    readonly overridable: boolean;
}

interface SelectorDefaultParameters {
    readonly typeSpecific?: TypeSpecific;

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

type SelectorArgumentInputMap = Record<string, InvertibleValue[]>;

interface InvertibleValue<T = unknown> {
    readonly isInverted: boolean;

    readonly value: T;
}

function invertibleValueOf<T>(t: TypeModel<T>) :TypeModel<InvertibleValue<T>> {
    return sentry.objectOf({
        isInverted: sentry.boolean,
        value: t
    });
}

interface EntitySelectorArgumentTypeMap {
    readonly c: number;
    readonly dx: number;
    readonly dy: number;
    readonly dz: number;
    readonly family: string;
    readonly has_property: HasProperty;
    readonly hasitem: HasItem | HasItem[];
    readonly haspermission: HasPermission;
    readonly l: number;
    readonly lm: number;
    readonly m: GameModeLike;
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
    readonly x: VectorComponent | number;
    readonly y: VectorComponent | number;
    readonly z: VectorComponent | number;
}

type GameModeLike = 0 | 1 | 2 | 's' | 'c' | 'a' | "survival" | "creative" | "adventure" | "spectator" | GameMode;

const GameModeLikeModel: TypeModel<GameModeLike> = sentry.unionOf(
    sentry.literalOf(0),
    sentry.literalOf(1),
    sentry.literalOf(2),
    sentry.literalOf('s'),
    sentry.literalOf('c'),
    sentry.literalOf('a'),
    sentry.literalOf("survival"),
    sentry.literalOf("creative"),
    sentry.literalOf("adventure"),
    sentry.literalOf("spectator"),
    sentry.enumLikeOf(GameMode)
);

type HasProperty = Record<string, InvertibleValue<boolean>[]> & {
    readonly property?: InvertibleValue<string>[];
}

const HasPropertyModel: TypeModel<HasProperty> = sentry.intersectionOf(
    sentry.objectOf({
        property: sentry.optionalOf(
            sentry.arrayOf(
                invertibleValueOf(sentry.string)
            )
        )
    }),
    sentry.recordOf(
        sentry.string,
        sentry.arrayOf(
            invertibleValueOf(
                sentry.boolean
            )
        )
    )
) as TypeModel<HasProperty>;

interface HasItem {
    // BEのサブセレクタ引数の入力はつねに重複を許可する
    readonly item: InvertibleValue<string>[];

    readonly location?: InvertibleValue<string>[];

    readonly slot?: InvertibleValue<number>[];

    readonly quantity?: InvertibleValue<IntRange | number>[];

    // 幻
    readonly data?: InvertibleValue<number>[];
}

const IntRangeModel: TypeModel<IntRange> = sentry.classOf(IntRange);

const HasItemModel: TypeModel<HasItem> = sentry.objectOf({
    item: sentry.arrayOf(
        invertibleValueOf(
            sentry.string
        )
    ),
    location: sentry.optionalOf(
        sentry.arrayOf(
            invertibleValueOf(
                sentry.string
            )
        )
    ),
    slot: sentry.optionalOf(
        sentry.arrayOf(
            invertibleValueOf(
                sentry.number.nonNaN().int()
            )
        )
    ),
    quantity: sentry.optionalOf(
        sentry.arrayOf(
            sentry.unionOf(
                invertibleValueOf(
                    sentry.number.nonNaN().int()
                ),
                invertibleValueOf(
                    IntRangeModel
                )
            )
        )
    ),
    data: sentry.optionalOf(
        sentry.arrayOf(
            invertibleValueOf(
                sentry.number.nonNaN().int()
            )
        )
    )
}) as TypeModel<HasItem>;

type PermissionState = "enabled" | "disabled";

interface HasPermission {
    readonly camera?: InvertibleValue<PermissionState>[];

    readonly dismount?: InvertibleValue<PermissionState>[];

    readonly jump?: InvertibleValue<PermissionState>[];

    readonly lateral_movement?: InvertibleValue<PermissionState>[];

    readonly mount?: InvertibleValue<PermissionState>[];

    readonly move_backward?: InvertibleValue<PermissionState>[];

    readonly move_forward?: InvertibleValue<PermissionState>[];

    readonly move_left?: InvertibleValue<PermissionState>[];

    readonly move_right?: InvertibleValue<PermissionState>[];

    readonly movement?: InvertibleValue<PermissionState>[];

    readonly sneak?: InvertibleValue<PermissionState>[];
}

const PermissionStateModel = sentry.unionOf(
    sentry.literalOf("enabled"),
    sentry.literalOf("disabled")
);

const HasPermissionModel: TypeModel<HasPermission> = sentry.objectOf({
    camera: sentry.optionalOf(
        sentry.arrayOf(
            invertibleValueOf(
                PermissionStateModel
            )
        )
    ),
    dismount: sentry.optionalOf(
        sentry.arrayOf(
            invertibleValueOf(
                PermissionStateModel
            )
        )
    ),
    jump: sentry.optionalOf(
        sentry.arrayOf(
            invertibleValueOf(
                PermissionStateModel
            )
        )
    ),
    lateral_movement: sentry.optionalOf(
        sentry.arrayOf(
            invertibleValueOf(
                PermissionStateModel
            )
        )
    ),
    mount: sentry.optionalOf(
        sentry.arrayOf(
            invertibleValueOf(
                PermissionStateModel
            )
        )
    ),
    move_backward: sentry.optionalOf(
        sentry.arrayOf(
            invertibleValueOf(
                PermissionStateModel
            )
        )
    ),
    move_forward: sentry.optionalOf(
        sentry.arrayOf(
            invertibleValueOf(
                PermissionStateModel
            )
        )
    ),
    move_left: sentry.optionalOf(
        sentry.arrayOf(
            invertibleValueOf(
                PermissionStateModel
            )
        )
    ),
    move_right: sentry.optionalOf(
        sentry.arrayOf(
            invertibleValueOf(
                PermissionStateModel
            )
        )
    ),
    movement: sentry.optionalOf(
        sentry.arrayOf(
            invertibleValueOf(
                PermissionStateModel
            )
        )
    ),
    sneak: sentry.optionalOf(
        sentry.arrayOf(
            invertibleValueOf(
                PermissionStateModel
            )
        )
    )
}) as TypeModel<HasPermission>;

type PermissionNameInputCategoryMap = {
    readonly [K in (keyof HasPermission)[][number]]: InputPermissionCategory;
}

const PERMISSION_NAME_INPUT_PERMISSION_CATEGORY_MAP: PermissionNameInputCategoryMap = {
    camera: InputPermissionCategory.Camera,
    dismount: InputPermissionCategory.Dismount,
    jump: InputPermissionCategory.Jump,
    lateral_movement: InputPermissionCategory.LateralMovement,
    mount: InputPermissionCategory.Mount,
    move_backward: InputPermissionCategory.MoveBackward,
    move_forward: InputPermissionCategory.MoveForward,
    move_left: InputPermissionCategory.MoveLeft,
    move_right: InputPermissionCategory.MoveRight,
    movement: InputPermissionCategory.Movement,
    sneak: InputPermissionCategory.Sneak
};

type Scores = Record<string, InvertibleValue<number | IntRange>[]>;

const ScoresModel: TypeModel<Scores> = sentry.recordOf(
    sentry.string,
    sentry.arrayOf(
        invertibleValueOf(
            sentry.unionOf(
                sentry.number,
                IntRangeModel
            )
        )
    )
);

export class SelectorArguments {
    public constructor(private readonly argumentInputMap: SelectorArgumentInputMap) {
        this.checkNonQueryArguments();
    }

    public getAsInvertibleList<K extends keyof EntitySelectorArgumentTypeMap>(key: K): ({ readonly isInverted: boolean; readonly value: EntitySelectorArgumentTypeMap[K] })[] | undefined {
        if (!(key in this.argumentInputMap)) {
            return undefined;
        }

        const input = this.argumentInputMap[key] as {
            readonly isInverted: boolean;
            readonly value: EntitySelectorArgumentTypeMap[K]
        }[];

        return input;
    }

    public getAsInvertibleValue<K extends keyof EntitySelectorArgumentTypeMap>(key: K): { readonly isInverted: boolean; readonly value: EntitySelectorArgumentTypeMap[K] } | undefined {
        return this.getAsInvertibleList(key)?.[0];
    }

    public getAsDirectValue<K extends keyof EntitySelectorArgumentTypeMap>(key: K): EntitySelectorArgumentTypeMap[K] | undefined {
        return this.getAsInvertibleValue(key)?.value;
    }

    public hasAnyOf<K extends keyof EntitySelectorArgumentTypeMap>(...keys: K[]): boolean {
        return keys.some(k => k in this.argumentInputMap);
    }

    private checkNonQueryArguments() {
        if (this.hasAnyOf("haspermission")) {
            const permissions = this.getAsDirectValue("haspermission")!;

            if (Object.keys(permissions).length === 0) {
                throw new EntitySelectorInterpretError("セレクタ引数 'haspermission' は空のMapを受け取りません");
            }

            for (const __name__ of Object.keys(permissions)) {
                const name = __name__ as keyof HasPermission;
                const values = permissions[name as keyof HasPermission]!;

                for (const { isInverted } of values) {
                    if (isInverted) {
                        throw new EntitySelectorInterpretError("セレクタ引数 haspermission' のキーは反転できません'");
                    }
                }
            }
        }

        if (this.hasAnyOf("hasitem")) {
            const hasItem = this.getAsDirectValue("hasitem")!;
            const conditions: HasItem[] = Array.isArray(hasItem) ? hasItem : [hasItem];

            for (const condition of conditions) {
                if (condition.item.some(item => item.isInverted)) {
                    throw new EntitySelectorInterpretError("サブセレクタ引数 'hasitem.item' は反転できません");
                }

                const effectiveItem = condition.item[condition.item.length - 1];

                if (effectiveItem.isInverted) {
                    throw new EntitySelectorInterpretError("サブセレクタ引数 'hasitem.item' は反転できません")
                }

                const effectiveLocation = condition.location ? condition.location[condition.location.length - 1] : undefined;

                if (effectiveLocation?.isInverted) {
                    throw new EntitySelectorInterpretError("サブセレクタ引数 'hasitem.location' は反転できません")
                }

                const effectiveSlot = condition.slot ? condition.slot[condition.slot.length - 1] : undefined;

                if (effectiveSlot?.isInverted) {
                    throw new EntitySelectorInterpretError("サブセレクタ引数 'hasitem.slot' は反転できません")
                }
                
                // なんとquantityは上書き
                const effectiveQuantity = condition.quantity ? condition.quantity[condition.quantity.length - 1] : undefined;

                if (effectiveQuantity?.isInverted) {
                    throw new EntitySelectorInterpretError("サブセレクタ引数 'hasitem.quantity' は反転できません")
                }

                const effectiveData = condition.data ? condition.data[condition.data.length - 1] : undefined;

                if (effectiveData?.isInverted) {
                    throw new EntitySelectorInterpretError("サブセレクタ引数 'hasitem.data' は反転できません")
                }
            }
        }
    }

    public getQueryOptionsBase(): EntityQueryOptions {
        const entityQueryOptions: EntityQueryOptions = {};

        if (this.hasAnyOf("dx", "dy", "dz")) {
            entityQueryOptions.volume = {
                x: this.getAsDirectValue("dx") ?? 0,
                y: this.getAsDirectValue("dy") ?? 0,
                z: this.getAsDirectValue("dz") ?? 0
            };
        }

        if (this.hasAnyOf("family")) {
            const families = this.getAsInvertibleList("family")!!;
            const include: string[] = [];
            const exclude: string[] = [];

            for (const family of families) {
                if (family.isInverted) {
                    exclude.push(family.value);
                }
                else {
                    include.push(family.value);
                }
            }

            entityQueryOptions.families = include;
            entityQueryOptions.excludeFamilies = exclude;
        }

        if (this.hasAnyOf("has_property")) {
            const propertyOptionsList: EntityQueryPropertyOptions[] = [];
            const properties = this.getAsDirectValue("has_property")!;

            if (Object.keys(properties).length === 0) {
                throw new EntitySelectorInterpretError("セレクタ引数 'has_property' は空のMapを受け取りません");
            }

            for (const [identifier, propertyNamesOrFlags] of Object.entries(properties)) {
                if (identifier === "property") {
                    const propertyOptions: EntityQueryPropertyOptions = {
                        propertyId: identifier
                    };

                    const propertyNames = propertyNamesOrFlags as InvertibleValue<string>[];
                    const effectiveEntry = propertyNames[propertyNames.length - 1];

                    propertyOptions.exclude = effectiveEntry.isInverted;
                    propertyOptions.value = effectiveEntry.value;
                    propertyOptionsList.push(propertyOptions);
                }
                else {
                    const flags = propertyNamesOrFlags as InvertibleValue<boolean>[];
                    
                    for (const flag of flags) {
                        const propertyOptions: EntityQueryPropertyOptions = {
                            propertyId: identifier
                        };

                        propertyOptions.exclude = flag.isInverted;
                        propertyOptions.value = flag.value;
                        propertyOptionsList.push(propertyOptions);
                    }
                }
            }

            entityQueryOptions.propertyOptions = propertyOptionsList;
        }

        // entityQueryOptionsにhasitemがない！！！！！！！！！！！！！！！！！！！！！！！

        if (this.hasAnyOf("l")) {
            entityQueryOptions.maxLevel = this.getAsDirectValue("l")!!;
        }

        if (this.hasAnyOf("lm")) {
            entityQueryOptions.minLevel = this.getAsDirectValue("lm")!!;
        }

        if (this.hasAnyOf("m")) {
            const m = this.getAsInvertibleValue("m")!!;

            let gameMode: GameMode;
            if (sentry.enumLikeOf(GameMode).test(m.value)) {
                gameMode = m.value;
            }
            else switch (m.value) {
                case 's':
                case "survival":
                case 0: {
                    gameMode = GameMode.Survival;
                    break;
                }
                case 'c':
                case "creative":
                case 1: {
                    gameMode = GameMode.Creative;
                    break;
                }
                case 'a':
                case "adventure":
                case 2: {
                    gameMode = GameMode.Adventure;
                    break;
                }
                case "spectator": {
                    gameMode = GameMode.Spectator;
                }
            }

            if (m.isInverted) {
                entityQueryOptions.excludeGameModes = [gameMode];
            }
            else {
                entityQueryOptions.gameMode = gameMode;
            }
        }

        if (this.hasAnyOf("name")) {
            const exclude: string[] = [];

            for (const name of this.getAsInvertibleList("name")!!) {
                if (name.isInverted) {
                    exclude.push(name.value);
                }
                else {
                    entityQueryOptions.name = name.value;
                    break;
                }
            }

            entityQueryOptions.excludeNames = exclude;
        }

        if (this.hasAnyOf("r")) {
            entityQueryOptions.maxDistance = this.getAsDirectValue("r")!!;
        }

        if (this.hasAnyOf("rm")) {
            entityQueryOptions.minDistance = this.getAsDirectValue("rm")!!;
        }

        if (this.hasAnyOf("rx")) {
            entityQueryOptions.maxVerticalRotation = this.getAsDirectValue("rx")!!;
        }

        if (this.hasAnyOf("rxm")) {
            entityQueryOptions.minVerticalRotation = this.getAsDirectValue("rxm")!!;
        }

        if (this.hasAnyOf("ry")) {
            entityQueryOptions.maxHorizontalRotation = this.getAsDirectValue("ry")!!;
        }

        if (this.hasAnyOf("rym")) {
            entityQueryOptions.minHorizontalRotation = this.getAsDirectValue("rym")!!;
        }

        if (this.hasAnyOf("scores")) {
            const scoreOptionsList: EntityQueryScoreOptions[] = [];
            const scores = this.getAsDirectValue("scores")!!;

            if (Object.keys(scores).length === 0) {
                throw new EntitySelectorInterpretError("セレクタ引数 'scores' は空のMapを受け取りません");
            }

            for (const [name, score] of Object.entries(scores)) {
                for (const cond of score) {
                    const scoreOptions: EntityQueryScoreOptions = {};
                    scoreOptions.objective = name;

                    if (cond.isInverted) {
                        scoreOptions.exclude = true;
                    }

                    if (cond.value instanceof IntRange) {
                        if (cond.value.getMin() !== Number.MIN_SAFE_INTEGER) {
                            scoreOptions.minScore = cond.value.getMin();
                        }

                        if (cond.value.getMax() !== Number.MAX_SAFE_INTEGER) {
                            scoreOptions.maxScore = cond.value.getMax();
                        }
                    }
                    else {
                        scoreOptions.minScore = cond.value;
                        scoreOptions.maxScore = cond.value;
                    }

                    scoreOptionsList.push(scoreOptions);
                }
            }

            entityQueryOptions.scoreOptions = scoreOptionsList;
        }

        if (this.hasAnyOf("tag")) {
            const include: string[] = [];
            const exclude: string[] = [];

            for (const tag of this.getAsInvertibleList("tag")!!) {
                if (tag.isInverted) {
                    exclude.push(tag.value);
                }
                else {
                    include.push(tag.value);
                }
            }

            entityQueryOptions.tags = include;
            entityQueryOptions.excludeTags = exclude;
        }

        if (this.hasAnyOf("type")) {
            const exclude: string[] = [];

            for (const type of this.getAsInvertibleList("type")!!) {
                if (type.isInverted) {
                    exclude.push(type.value);
                }
                else {
                    entityQueryOptions.type = type.value;
                    break;
                }
            }

            entityQueryOptions.excludeTypes = exclude;
        }

        return entityQueryOptions;
    }

    public getPositionVectorResolver(): PositionVectorResolver {
        let x: VectorComponent = {
            type: "relative",
            value: 0
        };

        let y: VectorComponent = {
            type: "relative",
            value: 0
        };

        let z: VectorComponent = {
            type: "relative",
            value: 0
        };

        if (this.hasAnyOf("x")) {
            const _x = this.getAsDirectValue("x")!
            x = sentry.number.test(_x) ? { type: "absolute", value: _x } : _x;
        }

        if (this.hasAnyOf("y")) {
            const _y = this.getAsDirectValue("y")!
            y = sentry.number.test(_y) ? { type: "absolute", value: _y } : _y;
        }

        if (this.hasAnyOf("z")) {
            const _z = this.getAsDirectValue("z")!
            z = sentry.number.test(_z) ? { type: "absolute", value: _z } : _z;
        }

        return new PositionVectorResolver(x, y, z);
    }

    public toString(): string {
        let s: string = '[';

        let f = false;
        for (const [key, values] of Object.entries(this.argumentInputMap)) {
            if (f) s += ',';
            f = true;

            s += key + '=(';

            let g = false;
            for (const { isInverted, value } of values) {
                if (g) s += ',';
                g = true;

                if (isInverted) s += '!';
                s += JSON.stringify(value);
            }

            s += ')';
        }

        return s + ']';
    }
}

export class EntitySelectorInterpretError extends Error {}

export class EntitySelector {
    public readonly isSingle: boolean;

    private readonly entityQueryOptionsBase: EntityQueryOptions;

    private readonly positionVectorResolver: PositionVectorResolver;

    public constructor(public readonly selectorType: SelectorType, public readonly selectorArguments: SelectorArguments) {
        this.entityQueryOptionsBase = selectorArguments.getQueryOptionsBase();
        this.positionVectorResolver = selectorArguments.getPositionVectorResolver();

        const c = selectorArguments.getAsDirectValue("c");
        if (selectorType.default?.limit === 1) {
            this.isSingle = c === undefined || c === 1 || c === -1;
        }
        else {
            this.isSingle = c === 1 || c === -1;
        }
    }

    private hasPermission(entities: Entity[]): Entity[] {
        if (this.selectorArguments.hasAnyOf("haspermission")) {
            // haspermission=が指定された時点でプレイヤーのみに絞られる
            const permissions = this.selectorArguments.getAsDirectValue("haspermission")!;

            return entities.filter(entity => {
                if (entity instanceof Player) {
                    for (const __name__ of Object.keys(permissions)) {
                        const name = __name__ as keyof HasPermission;
                        const values = permissions[name as keyof HasPermission]!;

                        const isEnabled = entity.inputPermissions.isPermissionCategoryEnabled(PERMISSION_NAME_INPUT_PERMISSION_CATEGORY_MAP[name]);

                        for (const { value } of values) {
                            if (isEnabled && value === "disabled") {
                                return false;
                            }
                            else if (!isEnabled && value === "enabled") {
                                return false;
                            }
                        }
                    }

                    return true;
                }
                else return false;
            });
        }
        else return entities;
    }

    private hasItem(entities: Entity[]): Entity[] {
        if (this.selectorArguments.hasAnyOf("hasitem")) {
            const hasItem = this.selectorArguments.getAsDirectValue("hasitem")!;
            const conditions: HasItem[] = Array.isArray(hasItem) ? hasItem : [hasItem];

            for (const condition of conditions) {
                // なんとquantityは上書き
                const effectiveItem: string = condition.item[condition.item.length - 1].value;
                const effectiveLocation: string | undefined = condition.location ? condition.location[condition.location.length - 1].value : undefined;
                const effectiveSlot: number | undefined = condition.slot ? condition.slot[condition.slot.length - 1].value : undefined;
                const effectiveQuantity: number | IntRange | undefined = condition.quantity ? condition.quantity[condition.quantity.length - 1].value : undefined;
                const effectiveData: number | undefined = condition.data ? condition.data[condition.data.length - 1].value : undefined;

                // TODO: hasitem=の実装
                /*for (const entity of entities) {
                    // Q. コンポーネントを持たないエンティティはquantity=0を通るのか?
                    entity.hasComponent(EntityComponentTypes.Inventory);
                }*/
            }

            return entities;
        }
        else return entities;
    }

    public getEntities(stack: CommandSourceStack): Entity[] {
        const entityQueryOptions: EntityQueryOptions = { ...this.entityQueryOptionsBase };

        const basePos = this.positionVectorResolver.resolve(stack);
        entityQueryOptions.location = basePos;

        let dimensions: Dimension[];
        if (this.selectorArguments.hasAnyOf("dx", "dy", "dz", "r", "rm")) {
            dimensions = [stack.getDimension()];
        }
        else {
            dimensions = DimensionTypes.getAll().map(({ typeId }) => world.getDimension(typeId));
        }

        let entities: Entity[];
        if (this.selectorType.aliveOnly) {
            entities = dimensions.flatMap(dimension => dimension.getEntities(entityQueryOptions));
        }
        else {
            entities = dimensions.flatMap(dimension => dimension.getEntities({ ...entityQueryOptions, excludeTypes: [MinecraftEntityTypes.Player] }));

            if (!(entityQueryOptions.excludeTypes?.includes(MinecraftEntityTypes.Player) || entityQueryOptions.excludeTypes?.includes("player"))) {
                entities.push(...dimensions.flatMap(dimension => dimension.getPlayers(entityQueryOptions)));
            }
        }

        if (this.selectorType.default?.typeSpecific) {
            if (this.selectorType.default.typeSpecific.overridable) {
                entities = entities.filter(entity => entity.typeId === this.selectorType.default?.typeSpecific?.type);
            }
            else if ((entityQueryOptions.type === undefined && entityQueryOptions.excludeTypes === undefined)) {
                entities = entities.filter(entity => entity.typeId === this.selectorType.default?.typeSpecific?.type);
            }
        }

        entities = this.hasPermission(entities);
        entities = this.hasItem(entities);

        switch (this.selectorType.sortOrder) {
            case SelectorSortOrder.NEAREST: {
                entities.sort((a, b) => {
                    return basePos.getDistanceTo(a.location) - basePos.getDistanceTo(b.location);
                });
                break;
            }
            case SelectorSortOrder.RANDOM: {
                entities.sort(() => {
                    return Math.random() - Math.random();
                });
                break;
            }
        }

        if (this.selectorArguments.hasAnyOf("c")) {
            const c = this.selectorArguments.getAsDirectValue("c")!;

            if (c < 0) {
                entities.reverse();
            }

            entities.splice(Math.abs(c));
        }
        else if (this.selectorType.default?.limit !== undefined) {
            entities.splice(this.selectorType.default.limit);
        }

        if (this.selectorType.default?.processor) {
            entities = this.selectorType.default.processor(stack, entities);
        }

        return entities;
    }

    public toString(): string {
        for (const { name, value } of EntitySelectorParser.REGISTRIES.get(EntitySelectorParser.ENTITY_SELECTOR_TYPES).lookup.entries()) {
            if (value === this.selectorType) {
                return name + this.selectorArguments;
            }
        }

        throw new Error("NEVER HAPPENS");
    }
}

/**
 * 大幅改良版
 * @experimental
 */
export class EntitySelectorParser extends AbstractParser<EntitySelector, EntitySelectorInterpretError> {
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
                    typeSpecific: {
                        type: MinecraftEntityTypes.Player,
                        overridable: false
                    },
                    limit: 1
                }
            });
            register("@r", {
                aliveOnly: true,
                sortOrder: SelectorSortOrder.RANDOM,
                default: {
                    typeSpecific: {
                        type: MinecraftEntityTypes.Player,
                        overridable: true
                    },
                    limit: 1
                }
            });
            register("@a", {
                aliveOnly: false,
                sortOrder: SelectorSortOrder.NEAREST,
                default: {
                    typeSpecific: {
                        type: MinecraftEntityTypes.Player,
                        overridable: false
                    }
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
            });
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
            register("has_property", {
                invertible: false,
                duplicatable: SelectorArgumentDuplicationRule.NEVER,
                type: HasPropertyModel
            });
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
                type: GameModeLikeModel
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
            register("scores", {
                invertible: false,
                duplicatable: SelectorArgumentDuplicationRule.NEVER,
                type: ScoresModel
            });
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
                type: sentry.unionOf(VectorComponentModel, sentry.number)
            });
            register("y", {
                invertible: false,
                duplicatable: SelectorArgumentDuplicationRule.NEVER,
                type: sentry.unionOf(VectorComponentModel, sentry.number)
            });
            register("z", {
                invertible: false,
                duplicatable: SelectorArgumentDuplicationRule.NEVER,
                type: sentry.unionOf(VectorComponentModel, sentry.number)
            });
        });

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
        for (const { name, value } of EntitySelectorParser.REGISTRIES.get(EntitySelectorParser.ENTITY_SELECTOR_TYPES).lookup.entries()) {
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
                type: "relative",
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

    private arguments(): SelectorArguments {
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
                    default: {
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

/**
 * 1. EntityQueryOptionsの生成
 * 2. ディメンション制限チェックを行う
 * 3. 探索基準位置の取得
 * 4. 生死判定が可能かを見て全エンティティの配列を取得(getEntities() exclude player concat getPlayers())
 * 5. 探索基準位置(プレイヤーをあとからconcatするため)とセレクタソートオーダーでソート
 * 6. 選択制限の取得
 * 7. 選択制限の符号から配列を反転／反転しない
 * 8. 選択制限によって配列を切り取り
 */
