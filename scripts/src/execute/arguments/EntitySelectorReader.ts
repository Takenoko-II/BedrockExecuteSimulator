import { Dimension, DimensionTypes, Entity, EntityQueryOptions, EntityQueryScoreOptions, GameMode, Vector3, world } from "@minecraft/server";
import { CommandSourceStack } from "../CommandSourceStack";
import { MinecraftEntityTypes } from "../../lib/@minecraft/vanilla-data/lib/index";
import { Vector3Builder } from "../../util/Vector";
import { PositionVectorResolver } from "./VectorResolver";
import { Serializer } from "../../util/Serializable";
import { MapParseError, MapReader } from "./MapReader";
import { NumberRange } from "../../util/NumberRange";

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

export type SelectorSortOrder = "NEAREST" | "FARTHEST" | "RANDOM";

interface EntityQueryOptionsWithC extends EntityQueryOptions {
    c?: number;

    posResolver?: PositionVectorResolver;
}

interface SelectorType {
    readonly name: string;

    readonly isDeadEntityDetectable: boolean;

    readonly defaultTypeSpecific?: MinecraftEntityTypes;

    readonly defaultEntitySortOrder: SelectorSortOrder;

    readonly defaultEntityLimit?: number;
}

interface ImmutableConfiguration {
    readonly IGNORED: string[];

    readonly SELECTOR_ARGUMENT_BRACES: [string, string];

    readonly MAP_BRACES: [string, string];

    readonly COMMA: string;

    readonly ESCAPE: string;

    readonly QUOTE: string;

    readonly EQUAL: string;

    readonly NOT: string;

    readonly INT_PATTERN: () => RegExp;

    readonly FLOAT_PATTERN: () => RegExp;

    readonly SELECTOR_TYPES: SelectorType[];

    readonly SELECTOR_ARGUMENT_TYPES: {
        readonly name: string;
        readonly resolver: (input: string, not: boolean, entityQueryOptions: EntityQueryOptionsWithC) => void;
    }[];

    readonly SORT_ORDERS: {
        readonly [key in SelectorSortOrder]: (a: Entity, b: Entity, location: Vector3Builder) => number;
    };
}

const immutableConfiguration: ImmutableConfiguration = {
    IGNORED: [' ', '\n'],
    SELECTOR_ARGUMENT_BRACES: ['[', ']'],
    MAP_BRACES: ['{', '}'],
    COMMA: ',',
    ESCAPE: '\\',
    QUOTE: '"',
    EQUAL: '=',
    NOT: '!',
    INT_PATTERN: () => /^[+-]?\d+$/g,
    FLOAT_PATTERN: () => /^[+-]?(?:\d+(?:\.\d+)?)$/g,
    SELECTOR_TYPES: [
        {
            name: "@p",
            isDeadEntityDetectable: false,
            defaultTypeSpecific: MinecraftEntityTypes.Player,
            defaultEntitySortOrder: "NEAREST",
            defaultEntityLimit: 1
        },
        {
            name: "@a",
            isDeadEntityDetectable: true,
            defaultTypeSpecific: MinecraftEntityTypes.Player,
            defaultEntitySortOrder: "NEAREST",
            defaultEntityLimit: 2 ** 31 - 1
        },
        {
            name: "@r",
            isDeadEntityDetectable: false,
            defaultTypeSpecific: MinecraftEntityTypes.Player,
            defaultEntitySortOrder: "RANDOM",
            defaultEntityLimit: 1
        },
        {
            name: "@s",
            isDeadEntityDetectable: true,
            defaultEntitySortOrder: "NEAREST",
            defaultEntityLimit: 1
        },
        {
            name: "@e",
            isDeadEntityDetectable: false,
            defaultEntitySortOrder: "NEAREST",
            defaultEntityLimit: 2 ** 31 - 1
        },
        {
            name: "@initiator",
            isDeadEntityDetectable: true,
            defaultEntitySortOrder: "NEAREST",
            defaultEntityLimit: 1
        }
    ],
    SELECTOR_ARGUMENT_TYPES: [
        {
            name: "type",
            resolver: (input, not, entityQueryOptions) => {
                if (not) {
                    if (entityQueryOptions.excludeTypes === undefined) {
                        entityQueryOptions.excludeTypes = [input];
                    }
                    else {
                        entityQueryOptions.excludeTypes.push(input);
                    }
                }
                else {
                    if (entityQueryOptions.type === undefined) {
                        entityQueryOptions.type = input;
                    }
                    else {
                        throw new SelectorParseError("duplicate");
                    }
                }
            }
        },
        {
            name: "name",
            resolver: (input, not, entityQueryOptions) => {
                if (not) {
                    if (entityQueryOptions.excludeNames === undefined) {
                        entityQueryOptions.excludeNames = [input];
                    }
                    else {
                        entityQueryOptions.excludeNames.push(input);
                    }
                }
                else {
                    if (entityQueryOptions.name === undefined) {
                        entityQueryOptions.name = input;
                    }
                    else {
                        throw new SelectorParseError("duplicate");
                    }
                }
            }
        },
        {
            name: "family",
            resolver: (input, not, entityQueryOptions) => {
                if (not) {
                    if (entityQueryOptions.excludeFamilies === undefined) {
                        entityQueryOptions.excludeFamilies = [input];
                    }
                    else {
                        entityQueryOptions.excludeFamilies.push(input);
                    }
                }
                else {
                    if (entityQueryOptions.families === undefined) {
                        entityQueryOptions.families = [input];
                    }
                    else {
                        entityQueryOptions.families.push(input);
                    }
                }
            }
        },
        {
            name: "tag",
            resolver: (input, not, entityQueryOptions) => {
                if (not) {
                    if (entityQueryOptions.excludeTags === undefined) {
                        entityQueryOptions.excludeTags = [input];
                    }
                    else {
                        entityQueryOptions.excludeTags.push(input);
                    }
                }
                else {
                    if (entityQueryOptions.tags === undefined) {
                        entityQueryOptions.tags = [input];
                    }
                    else {
                        entityQueryOptions.tags.push(input);
                    }
                }
            }
        },
        {
            name: "r",
            resolver: (input, not, entityQueryOptions) => {
                if (not) {
                    throw new SelectorParseError("not ha dame----");
                }
                else if (immutableConfiguration.FLOAT_PATTERN().test(input)) {
                    if (entityQueryOptions.maxDistance === undefined) {
                        entityQueryOptions.minDistance = Number.parseFloat(input);
                    }
                    else {
                        throw new SelectorParseError("");
                    }
                }
                else {
                    throw new SelectorParseError("数値の解析に失敗しました: '" + input + "'");
                }
            }
        },
        {
            name: "rm",
            resolver: (input, not, entityQueryOptions) => {
                if (not) {
                    throw new SelectorParseError("not ha dame----");
                }
                else if (immutableConfiguration.FLOAT_PATTERN().test(input)) {
                    if (entityQueryOptions.minDistance === undefined) {
                        entityQueryOptions.minDistance = Number.parseFloat(input);
                    }
                    else {
                        throw new SelectorParseError("");
                    }
                }
                else {
                    throw new SelectorParseError("数値の解析に失敗しました: '" + input + "'");
                }
            }
        },
        {
            name: "rx",
            resolver: (input, not, entityQueryOptions) => {
                if (not) {
                    throw new SelectorParseError("not ha dame----");
                }
                else if (immutableConfiguration.FLOAT_PATTERN().test(input)) {
                    if (entityQueryOptions.maxVerticalRotation === undefined) {
                        entityQueryOptions.maxVerticalRotation = Number.parseFloat(input);
                    }
                    else {
                        throw new SelectorParseError("");
                    }
                }
                else {
                    throw new SelectorParseError("数値の解析に失敗しました: '" + input + "'");
                }
            }
        },
        {
            name: "rxm",
            resolver: (input, not, entityQueryOptions) => {
                if (not) {
                    throw new SelectorParseError("not ha dame----");
                }
                else if (immutableConfiguration.FLOAT_PATTERN().test(input)) {
                    if (entityQueryOptions.minVerticalRotation === undefined) {
                        entityQueryOptions.minVerticalRotation = Number.parseFloat(input);
                    }
                    else {
                        throw new SelectorParseError("");
                    }
                }
                else {
                    throw new SelectorParseError("数値の解析に失敗しました: '" + input + "'");
                }
            }
        },
        {
            name: "ry",
            resolver: (input, not, entityQueryOptions) => {
                if (not) {
                    throw new SelectorParseError("not ha dame----");
                }
                else if (immutableConfiguration.FLOAT_PATTERN().test(input)) {
                    entityQueryOptions.maxHorizontalRotation = Number.parseFloat(input);
                }
                else {
                    throw new SelectorParseError("数値の解析に失敗しました: '" + input + "'");
                }
            }
        },
        {
            name: "rym",
            resolver: (input, not, entityQueryOptions) => {
                if (not) {
                    throw new SelectorParseError("not ha dame----");
                }
                else if (immutableConfiguration.FLOAT_PATTERN().test(input)) {
                    if (entityQueryOptions.minHorizontalRotation === undefined) {
                        entityQueryOptions.minHorizontalRotation = Number.parseFloat(input);
                    }
                    else {
                        throw new SelectorParseError("");
                    }
                }
                else {
                    throw new SelectorParseError("数値の解析に失敗しました: '" + input + "'");
                }
            }
        },
        {
            name: "l",
            resolver: (input, not, entityQueryOptions) => {
                if (not) {
                    throw new SelectorParseError("not ha dame----");
                }
                else if (immutableConfiguration.INT_PATTERN().test(input)) {
                    if (entityQueryOptions.maxLevel === undefined) {
                        entityQueryOptions.maxLevel = Number.parseInt(input);
                    }
                    else {
                        throw new SelectorParseError("");
                    }
                }
                else {
                    throw new SelectorParseError("数値の解析に失敗しました: '" + input + "'");
                }
            }
        },
        {
            name: "lm",
            resolver: (input, not, entityQueryOptions) => {
                if (not) {
                    throw new SelectorParseError("not ha dame----");
                }
                else if (immutableConfiguration.INT_PATTERN().test(input)) {
                    if (entityQueryOptions.minLevel === undefined) {
                        entityQueryOptions.minLevel = Number.parseInt(input);
                    }
                    else {
                        throw new SelectorParseError("");
                    }
                }
                else {
                    throw new SelectorParseError("数値の解析に失敗しました: '" + input + "'");
                }
            }
        },
        {
            name: "m",
            resolver: (input, not, entityQueryOptions) => {
                const gameMode: GameMode = (() => {
                    switch (input) {
                        case GameMode.survival:
                        case "s":
                        case "0":
                            return GameMode.survival;
                        case GameMode.creative:
                        case "c":
                        case "1":
                            return GameMode.creative;
                        case GameMode.adventure:
                        case "a":
                        case "2":
                            return GameMode.adventure;
                        case GameMode.spectator:
                            return GameMode.spectator;
                        default:
                            throw new SelectorParseError("");
                    }
                })();

                if (not) {
                    if (entityQueryOptions.excludeGameModes === undefined) {
                        entityQueryOptions.excludeGameModes = [gameMode];
                    }
                    else {
                        throw new MojangBugError("セレクター引数「m」は否定であったとしても重複させることはできません");
                    }
                }
                else {
                    if (entityQueryOptions.gameMode === undefined) {
                        entityQueryOptions.gameMode = gameMode;
                    }
                    else {
                        throw new SelectorParseError("セレクター引数「m」は肯定の条件で重複させることができません");
                    }
                }
            }
        },
        {
            name: "c",
            resolver: (input, not, entityQueryOptions) => {
                if (not) {
                    throw new SelectorParseError("not ha dame----");
                }
                else if (immutableConfiguration.INT_PATTERN().test(input)) {
                    if (entityQueryOptions.c === undefined) {
                        entityQueryOptions.c = Number.parseInt(input);
                    }
                    else {
                        throw new SelectorParseError("");
                    }
                }
                else {
                    throw new SelectorParseError("数値の解析に失敗しました: '" + input + "'");
                }
            }
        },
        {
            name: "scores",
            resolver: (input, not, entityQueryOptions) => {
                if (not) {
                    throw new SelectorParseError("not ha dame----");
                }
                else {
                    try {
                        const record = MapReader.readStringMap(input);

                        console.log(JSON.stringify(record));

                        if (entityQueryOptions.scoreOptions === undefined) {
                            entityQueryOptions.scoreOptions = Object.keys(record)
                            .map(key => {
                                const{ not, value } = record[key];
                                const range = NumberRange.parse(value, true, true);

                                return {
                                    exclude: not,
                                    objective: key,
                                    minScore: range.getMin(),
                                    maxScore: range.getMax()
                                };
                            });
                        }
                        else {
                            throw new SelectorParseError("");
                        }
                    }
                    catch (e) {
                        if (e instanceof MapParseError) {
                            throw new SelectorParseError(e.message + "," + e.stack);
                        }
                        else {
                            throw e;
                        }
                    }
                }
            }
        }
        // scores, haspermission, hasitem
    ],
    SORT_ORDERS: {
        "NEAREST": (a, b, pos) => {
            return pos.getDistanceTo(a.location) - pos.getDistanceTo(b.location);
        },
        "FARTHEST": (a, b, pos) => {
            return pos.getDistanceTo(b.location) - pos.getDistanceTo(a.location);
        },
        "RANDOM": (a, b, pos) => {
            return Math.random() - Math.random();
        }
    }
};

export class EntitySelectorReader {
    private text: string = "";

    private location: number = 0;

    private constructor() {}

    private isOver(): boolean {
        return this.location >= this.text.length;
    }

    private next(): string;

    private next(next: string): boolean;

    private next(next: boolean): string;

    private next(next: string | boolean = true): string | boolean {
        if (typeof next === "boolean") {
            if (this.isOver()) {
                throw new SelectorParseError("文字数を超えた位置へのアクセスが発生しました");
            }

            const current: string = this.text.charAt(this.location++);
    
            if (immutableConfiguration.IGNORED.includes(current) && next) return this.next();
    
            return current;
        }
        else {
            if (this.isOver()) return false;

            this.ignore();

            const str: string = this.text.substring(this.location);

            if (str.startsWith(next)) {
                this.location += next.length;
                this.ignore();
                return true;
            }

            return false;
        }
    }

    private back(): void {
        this.location--;
    }

    private ignore(): void {
        if (this.isOver()) return;

        const current: string = this.text.charAt(this.location++);

        if (immutableConfiguration.IGNORED.includes(current)) {
            this.ignore();
        }
        else {
            this.back();
        }
    }

    private test(...nexts: string[]): boolean {
        const loc = this.location;

        for (const next of nexts) {
            if (!this.next(next)) {
                this.location = loc;
                return false;
            }
        }

        this.location = loc;
        return true;
    }

    private argumentValue(): string {
        let value: string = "";

        if (this.isOver()) {
            throw new SelectorParseError("");
        }

        let previousChar: string = this.next(true);
        let insideQuote: boolean = previousChar === immutableConfiguration.QUOTE;
        let insideBrace: boolean = previousChar === immutableConfiguration.MAP_BRACES[0] || previousChar === immutableConfiguration.SELECTOR_ARGUMENT_BRACES[0];
        let braceEnd: string | undefined = insideBrace
            ? previousChar === immutableConfiguration.MAP_BRACES[0]
                ? immutableConfiguration.MAP_BRACES[1]
                : previousChar === immutableConfiguration.SELECTOR_ARGUMENT_BRACES[0]
                    ? immutableConfiguration.SELECTOR_ARGUMENT_BRACES[1]
                    : undefined
            : undefined;

        value += previousChar;

        while (!this.isOver()) {
            const currentChar: string = this.next(false);

            if (previousChar !== immutableConfiguration.ESCAPE && currentChar === immutableConfiguration.QUOTE) {
                insideQuote = !insideQuote;

                if (!(this.next(immutableConfiguration.COMMA) || this.test(immutableConfiguration.SELECTOR_ARGUMENT_BRACES[1]))) {
                    throw new SelectorParseError("Comma is expected");
                }

                break;
            }
            else if (!insideQuote && insideBrace && currentChar === braceEnd as string) {
                insideBrace = false;
                value += currentChar;
                previousChar = currentChar;
            }
            else if (!insideQuote && !insideBrace && currentChar === immutableConfiguration.COMMA) {
                this.back();
                break;
            }
            else if (!insideQuote && !insideBrace && currentChar === immutableConfiguration.SELECTOR_ARGUMENT_BRACES[1]) {
                this.back();
                break;
            }
            else {
                value += currentChar;
                previousChar = currentChar;
            }
        }

        if (insideQuote) {
            throw new SelectorParseError("Quote must be closed");
        }

        return value;
    }

    private type(): SelectorType {
        for (const type of immutableConfiguration.SELECTOR_TYPES) {
            if (this.next(type.name)) {
                return type;
            }
        }

        throw new SelectorParseError("無効なセレクタータイプです");
    }

    private arguments(): EntityQueryOptionsWithC | undefined {
        const entityQueryOptions: EntityQueryOptionsWithC = {};

        if (!this.next(immutableConfiguration.SELECTOR_ARGUMENT_BRACES[0])) {
            if (this.isOver()) {
                return undefined;
            }
            else {
                throw new SelectorParseError("a");
            }
        }

        while (!this.isOver()) {
            for (const { name, resolver } of immutableConfiguration.SELECTOR_ARGUMENT_TYPES) {
                if (this.test(name, immutableConfiguration.EQUAL)) {
                    this.next(name);
                    this.next(immutableConfiguration.EQUAL);
                    const not: boolean = this.next(immutableConfiguration.NOT);
                    const value: string = this.argumentValue();
                    resolver(value, not, entityQueryOptions);
                    break;
                }
            }

            if (this.next(immutableConfiguration.SELECTOR_ARGUMENT_BRACES[1])) {
                break;
            }
            else if (this.next(immutableConfiguration.COMMA)) {
                continue;
            }
            else {
                throw new SelectorParseError(", or ]");
            }
        }

        return entityQueryOptions;
    }

    private index(): EntitySelector {
        const selectorType = this.type();
        const entityQueryOptionsWithC = this.arguments();

        if (!this.isOver()) {
            throw new SelectorParseError("");
        }

        if (selectorType.name === "@s") {
            return {
                isSingle: true,

                getEntities(stack) {
                    if (stack.hasExecutor()) {
                        return [stack.getExecutor()];
                    }
                    else return [];
                },
            };
        }

        const sortOrder: SelectorSortOrder = selectorType.defaultEntitySortOrder === "RANDOM"
                ? "RANDOM"
                : /*((entityQueryOptionsWithC?.c ?? selectorType.defaultEntityLimit ?? (2 ** 31 - 1)) < 0) ? "FARTHEST" : */"NEAREST";

        const limit: number = Math.abs(entityQueryOptionsWithC?.c ?? selectorType.defaultEntityLimit ?? (2 ** 31 - 1));

        if (entityQueryOptionsWithC !== undefined && entityQueryOptionsWithC.type === undefined && entityQueryOptionsWithC.excludeTypes === undefined) {
            entityQueryOptionsWithC.type = selectorType.defaultTypeSpecific;
        }

        const isArrayReversed: boolean = entityQueryOptionsWithC?.c === undefined
            ? false
            : entityQueryOptionsWithC.c < 0;

        const isSingle: boolean = selectorType.defaultEntityLimit === 1 || entityQueryOptionsWithC?.c === 1 || entityQueryOptionsWithC?.c === -1;

        return {
            isSingle,

            getEntities(stack) {
                const options: EntityQueryOptions | undefined = entityQueryOptionsWithC === undefined ? undefined : {
                    ...entityQueryOptionsWithC,
                    location: entityQueryOptionsWithC.posResolver === undefined
                        ? stack.getPosition()
                        : entityQueryOptionsWithC.posResolver.resolve(stack)
                };

                let candidates: Entity[] = DimensionTypes.getAll()
                .flatMap(({ typeId }) => {
                    const dimension: Dimension = world.getDimension(typeId);

                    if (selectorType.isDeadEntityDetectable) {
                        return dimension.getEntities({ excludeTypes: [MinecraftEntityTypes.Player] }).concat(dimension.getPlayers());
                    }
                    else {
                        return dimension.getEntities();
                    }
                });

                if (options !== undefined) {
                    candidates = candidates.filter(entity => {
                        return entity.matches(options);
                    });
                }

                const loc: Vector3Builder = options === undefined ? stack.getPosition() : Vector3Builder.from(options.location as Vector3);

                const array = candidates.sort((a, b) => {
                    return immutableConfiguration.SORT_ORDERS[sortOrder](a, b, loc);
                })
                .slice(0, limit);

                if (isArrayReversed) {
                    array.reverse();
                }

                return array;
            }
        };
    }

    public static readSelector(selector: string): EntitySelector {
        const reader: EntitySelectorReader = new this();
        reader.text = selector;
        return reader.index();
    }
}

export interface EntitySelector {
    readonly isSingle: boolean;

    getEntities(stack: CommandSourceStack): Entity[];
}
