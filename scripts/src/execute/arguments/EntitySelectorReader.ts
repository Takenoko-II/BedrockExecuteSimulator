import { Dimension, DimensionTypes, Entity, EntityQueryOptions, GameMode, InputPermissionCategory, Player, Vector3, world } from "@minecraft/server";
import { CommandSourceStack } from "../CommandSourceStack";
import { MinecraftEntityTypes } from "../../lib/@minecraft/vanilla-data/lib/index";
import { Vector3Builder } from "../../util/Vector";
import { PositionVectorResolver, VectorComponent, VectorParseError, VectorReader } from "./VectorResolver";
import { MapParseError, MapReader } from "./MapReader";
import { IntRange } from "../../util/NumberRange";
import { RegistryKey } from "../../util/Registry";

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

// "FARTHEST" は廃止予定
export type SelectorSortOrder = "NEAREST" | "FARTHEST" | "RANDOM";

interface EntityQueryOptionsWithC extends EntityQueryOptions {
    c?: number;

    x?: VectorComponent;

    y?: VectorComponent;

    z?: VectorComponent;

    dx?: number;

    dy?: number;

    dz?: number;

    inputPermissionFilters?: { readonly category: InputPermissionCategory; readonly enabled: boolean }[];
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
                        throw new SelectorParseError("セレクター引数type=は重複させることができません");
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
                        throw new SelectorParseError("セレクター引数name=は重複させることができません");
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
                    throw new SelectorParseError("セレクター引数r=は否定することができません");
                }
                else if (immutableConfiguration.FLOAT_PATTERN().test(input)) {
                    if (entityQueryOptions.maxDistance === undefined) {
                        entityQueryOptions.minDistance = Number.parseFloat(input);
                    }
                    else {
                        throw new SelectorParseError("セレクター引数r=は重複させることができません");
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
                    throw new SelectorParseError("セレクター引数rm=は否定することができません");
                }
                else if (immutableConfiguration.FLOAT_PATTERN().test(input)) {
                    if (entityQueryOptions.minDistance === undefined) {
                        entityQueryOptions.minDistance = Number.parseFloat(input);
                    }
                    else {
                        throw new SelectorParseError("セレクター引数rm=は重複させることができません");
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
                    throw new SelectorParseError("セレクター引数rx=は否定することができません");
                }
                else if (immutableConfiguration.FLOAT_PATTERN().test(input)) {
                    if (entityQueryOptions.maxVerticalRotation === undefined) {
                        entityQueryOptions.maxVerticalRotation = Number.parseFloat(input);
                    }
                    else {
                        throw new SelectorParseError("セレクター引数rx=は重複させることができません");
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
                    throw new SelectorParseError("セレクター引数rxm=は否定することができません");
                }
                else if (immutableConfiguration.FLOAT_PATTERN().test(input)) {
                    if (entityQueryOptions.minVerticalRotation === undefined) {
                        entityQueryOptions.minVerticalRotation = Number.parseFloat(input);
                    }
                    else {
                        throw new SelectorParseError("セレクター引数rxm=は重複させることができません");
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
                    throw new SelectorParseError("セレクター引数ry=は否定することができません");
                }
                else if (immutableConfiguration.FLOAT_PATTERN().test(input)) {
                    if (entityQueryOptions.maxHorizontalRotation === undefined) {
                        entityQueryOptions.maxHorizontalRotation = Number.parseFloat(input);
                    }
                    else {
                        throw new SelectorParseError("セレクター引数ry=は重複させることができません");
                    }
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
                    throw new SelectorParseError("セレクター引数rym=は否定することができません");
                }
                else if (immutableConfiguration.FLOAT_PATTERN().test(input)) {
                    if (entityQueryOptions.minHorizontalRotation === undefined) {
                        entityQueryOptions.minHorizontalRotation = Number.parseFloat(input);
                    }
                    else {
                        throw new SelectorParseError("セレクター引数rym=は重複させることができません");
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
                    throw new SelectorParseError("セレクター引数l=は否定することができません");
                }
                else if (immutableConfiguration.INT_PATTERN().test(input)) {
                    if (entityQueryOptions.maxLevel === undefined) {
                        entityQueryOptions.maxLevel = Number.parseInt(input);
                    }
                    else {
                        throw new SelectorParseError("セレクター引数l=は重複させることができません");
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
                    throw new SelectorParseError("セレクター引数lm=は否定することができません");
                }
                else if (immutableConfiguration.INT_PATTERN().test(input)) {
                    if (entityQueryOptions.minLevel === undefined) {
                        entityQueryOptions.minLevel = Number.parseInt(input);
                    }
                    else {
                        throw new SelectorParseError("セレクター引数lm=は重複させることができません");
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
                        case GameMode.Survival:
                        case "s":
                        case "0":
                            return GameMode.Survival;
                        case GameMode.Creative:
                        case "c":
                        case "1":
                            return GameMode.Creative;
                        case GameMode.Adventure:
                        case "a":
                        case "2":
                            return GameMode.Adventure;
                        case GameMode.Spectator:
                            return GameMode.Spectator;
                        default:
                            throw new SelectorParseError("セレクター引数m=には無効な値です: '" + input + "'");
                    }
                })();

                if (not) {
                    if (entityQueryOptions.excludeGameModes === undefined) {
                        entityQueryOptions.excludeGameModes = [gameMode];
                    }
                    else {
                        throw new MojangBugError("セレクター引数m=は否定であったとしても重複させることができません");
                    }
                }
                else {
                    if (entityQueryOptions.gameMode === undefined) {
                        entityQueryOptions.gameMode = gameMode;
                    }
                    else {
                        throw new SelectorParseError("セレクター引数m=は重複させることができません");
                    }
                }
            }
        },
        {
            name: "c",
            resolver: (input, not, entityQueryOptions) => {
                if (not) {
                    throw new SelectorParseError("セレクター引数c=は否定することができません");
                }
                else if (immutableConfiguration.INT_PATTERN().test(input)) {
                    if (entityQueryOptions.c === undefined) {
                        entityQueryOptions.c = Number.parseInt(input);
                    }
                    else {
                        throw new SelectorParseError("セレクター引数c=は重複させることができません");
                    }
                }
                else {
                    throw new SelectorParseError("数値の解析に失敗しました: '" + input + "'");
                }
            }
        },
        {
            name: "dx",
            resolver: (input, not, entityQueryOptions) => {
                if (not) {
                    throw new SelectorParseError("セレクター引数dx=は否定することができません");
                }
                else if (immutableConfiguration.FLOAT_PATTERN().test(input)) {
                    if (entityQueryOptions.dx === undefined) {
                        entityQueryOptions.dx = Number.parseFloat(input);
                    }
                    else {
                        throw new SelectorParseError("セレクター引数dx=は重複させることができません");
                    }
                }
                else {
                    throw new SelectorParseError("数値の解析に失敗しました: '" + input + "'");
                }
            }
        },
        {
            name: "dy",
            resolver: (input, not, entityQueryOptions) => {
                if (not) {
                    throw new SelectorParseError("セレクター引数dy=は否定することができません");
                }
                else if (immutableConfiguration.FLOAT_PATTERN().test(input)) {
                    if (entityQueryOptions.dy === undefined) {
                        entityQueryOptions.dy = Number.parseFloat(input);
                    }
                    else {
                        throw new SelectorParseError("セレクター引数dy=は重複させることができません");
                    }
                }
                else {
                    throw new SelectorParseError("数値の解析に失敗しました: '" + input + "'");
                }
            }
        },
        {
            name: "dz",
            resolver: (input, not, entityQueryOptions) => {
                if (not) {
                    throw new SelectorParseError("セレクター引数dz=は否定することができません");
                }
                else if (immutableConfiguration.FLOAT_PATTERN().test(input)) {
                    if (entityQueryOptions.dz === undefined) {
                        entityQueryOptions.dz = Number.parseFloat(input);
                    }
                    else {
                        throw new SelectorParseError("セレクター引数dz=は重複させることができません");
                    }
                }
                else {
                    throw new SelectorParseError("数値の解析に失敗しました: '" + input + "'");
                }
            }
        },
        {
            name: "x",
            resolver: (input, not, entityQueryOptions) => {
                if (not) {
                    throw new SelectorParseError("セレクター引数x=は否定することができません");
                }
                else {
                    try {
                        if (entityQueryOptions.x === undefined) {
                            const component = VectorReader.absOrRelComponent(input);
                            entityQueryOptions.x = component;
                        }
                        else {
                            throw new SelectorParseError("セレクター引数x=は重複させることができません");
                        }
                    }
                    catch (e) {
                        if (e instanceof VectorParseError) {
                            throw new SelectorParseError(e.message + "," + e.stack);
                        }
                        else {
                            throw e;
                        }
                    }
                }
            }
        },
        {
            name: "y",
            resolver: (input, not, entityQueryOptions) => {
                if (not) {
                    throw new SelectorParseError("セレクター引数y=は否定することができません");
                }
                else {
                    try {
                        if (entityQueryOptions.y === undefined) {
                            const component = VectorReader.absOrRelComponent(input);
                            entityQueryOptions.y = component;
                        }
                        else {
                            throw new SelectorParseError("セレクター引数y=は重複させることができません");
                        }
                    }
                    catch (e) {
                        if (e instanceof VectorParseError) {
                            throw new SelectorParseError(e.message + "," + e.stack);
                        }
                        else {
                            throw e;
                        }
                    }
                }
            }
        },
        {
            name: "z",
            resolver: (input, not, entityQueryOptions) => {
                if (not) {
                    throw new SelectorParseError("セレクター引数z=は否定することができません");
                }
                else {
                    try {
                        if (entityQueryOptions.z === undefined) {
                            const component = VectorReader.absOrRelComponent(input);
                            entityQueryOptions.z = component;
                        }
                        else {
                            throw new SelectorParseError("セレクター引数z=は重複させることができません");
                        }
                    }
                    catch (e) {
                        if (e instanceof VectorParseError) {
                            throw new SelectorParseError(e.message + "," + e.stack);
                        }
                        else {
                            throw e;
                        }
                    }
                }
            }
        },
        {
            name: "scores",
            resolver: (input, not, entityQueryOptions) => {
                if (not) {
                    throw new SelectorParseError("セレクター引数scores=は否定することができません");
                }
                else {
                    try {
                        const record = MapReader.readStringMap(input);

                        if (entityQueryOptions.scoreOptions === undefined) {
                            entityQueryOptions.scoreOptions = Object.keys(record)
                            .map(key => {
                                const { not, value } = record[key];
                                const range = IntRange.parse(value, true);

                                return {
                                    exclude: not,
                                    objective: key,
                                    minScore: range.getMin(),
                                    maxScore: range.getMax()
                                };
                            });
                        }
                        else {
                            throw new SelectorParseError("セレクター引数scores=は重複させることができません");
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
        },
        {
            name: "haspermission",
            resolver: (input, not, entityQueryOptions) => {
                if (not) {
                    throw new SelectorParseError("セレクター引数haspermission=は否定することができません");
                }
                else {
                    try {
                        const record = MapReader.readStringMap(input);

                        if (entityQueryOptions.inputPermissionFilters === undefined) {
                            entityQueryOptions.inputPermissionFilters = Object.keys(record)
                            .map(key => {
                                const { not, value } = record[key];

                                if (not) {
                                    throw new SelectorParseError("haspermission=のキーは否定不可能です");
                                }

                                const category = (() => {
                                    switch (key) {
                                        case "camera":
                                            return InputPermissionCategory.Camera;
                                        case "movement":
                                            return InputPermissionCategory.Movement;
                                        case "lateral_movement":
                                            return InputPermissionCategory.LateralMovement;
                                        case "sneak":
                                            return InputPermissionCategory.Sneak;
                                        case "jump":
                                            return InputPermissionCategory.Jump;
                                        case "mount":
                                            return InputPermissionCategory.Mount;
                                        case "dismount":
                                            return InputPermissionCategory.Dismount;
                                        case "move_forwrad":
                                            return InputPermissionCategory.MoveForward;
                                        case "move_backward":
                                            return InputPermissionCategory.MoveBackward;
                                        case "move_left":
                                            return InputPermissionCategory.MoveLeft;
                                        case "move_right":
                                            return InputPermissionCategory.MoveRight;
                                        default:
                                            throw new SelectorParseError("無効な入力権限IDです");
                                    }
                                })();

                                const enabled = (() => {
                                    if (value === "enabled") return true;
                                    else if (value === "disabled") return false;
                                    else throw new SelectorParseError("入力権限のキーにはenabledまたはdisabledが有効な値です");
                                })();

                                return {
                                    category,
                                    enabled
                                };
                            });
                        }
                        else {
                            throw new SelectorParseError("セレクター引数haspermission=は重複させることができません");
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
        // hasitem
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
            throw new SelectorParseError("セレクター引数の値の読み取り中に文字列の終了を検知しました");
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
                    throw new SelectorParseError("セレクター引数の区切りにはカンマが期待されています");
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
            throw new SelectorParseError("クオーテーションが閉じられていません");
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
                throw new SelectorParseError("セレクター引数の括弧が閉じられていません");
            }
        }

        let insideAnotherBrace: boolean = false;
        let insideQuote: boolean = false;

        while (!this.isOver()) {
            let found: boolean = false;

            for (const { name, resolver } of immutableConfiguration.SELECTOR_ARGUMENT_TYPES) {
                if (this.test(name, immutableConfiguration.EQUAL)) {
                    this.next(name);
                    this.next(immutableConfiguration.EQUAL);
                    const not: boolean = this.next(immutableConfiguration.NOT);
                    const value: string = this.argumentValue();
                    resolver(value, not, entityQueryOptions);
                    found = true;
                    break;
                }
            }

            if (!found) {
                throw new SelectorParseError("有効なセレクター引数名が見つかりませんでした");
            }

            if ( this.next(immutableConfiguration.QUOTE)) {
                insideQuote = !insideQuote;
            }
            if (!insideQuote && !insideAnotherBrace && this.next(immutableConfiguration.SELECTOR_ARGUMENT_BRACES[0])) {
                insideAnotherBrace = true;
            }
            if (!insideQuote && this.next(immutableConfiguration.SELECTOR_ARGUMENT_BRACES[1])) {
                if (insideAnotherBrace) {
                    insideAnotherBrace = false;
                }
                else {
                    break;
                }
            }
            else if (!insideQuote && this.next(immutableConfiguration.COMMA)) {
                continue;
            }
            else {
                throw new SelectorParseError("セレクター引数の終端にはカンマか閉じ括弧が必要です");
            }
        }

        return entityQueryOptions;
    }

    // ごちゃごちゃしすぎだからRegistry使って作り直し
    private index(): EntitySelector {
        const selectorType = this.type();
        const entityQueryOptionsWithC = this.arguments() ?? {};

        if (!this.isOver()) {
            throw new SelectorParseError("セレクター引数の解析終了後に無効な文字列を検出しました");
        }

        // @sだけ特別にね
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

        // farthest消そうよ
        const sortOrder: SelectorSortOrder = selectorType.defaultEntitySortOrder === "RANDOM"
                ? "RANDOM"
                : /*((entityQueryOptionsWithC?.c ?? selectorType.defaultEntityLimit ?? (2 ** 31 - 1)) < 0) ? "FARTHEST" : */"NEAREST";

        // c=が指定されたらその値の絶対値, 指定がなければセレクタタイプのデフォルト値, セレクタタイプもデフォルト値を持ってなければint32_max
        const limit: number = Math.abs(entityQueryOptionsWithC.c ?? selectorType.defaultEntityLimit ?? (2 ** 31 - 1));

        // type=とtype=!が未指定ならばセレクタタイプのデフォルトタイプ(要修正)
        if (entityQueryOptionsWithC.type === undefined && entityQueryOptionsWithC.excludeTypes === undefined) {
            entityQueryOptionsWithC.type = selectorType.defaultTypeSpecific as string; // optional string
        }

        // dx, dy, dzのいずれかが指定されていればvolumeに書き込む
        if (!(entityQueryOptionsWithC.dx === undefined && entityQueryOptionsWithC.dy === undefined && entityQueryOptionsWithC.dz === undefined)) {
            const { dx, dy, dz } = entityQueryOptionsWithC;

            const volume: Vector3 = /*{
                x: (dx === undefined ||dx === 0)
                    ? 1.0
                    : dx + (dx / dx),
                y: (dy === undefined ||dy === 0)
                    ? 1.0
                    : dy + (dy / dy),
                z: (dz === undefined ||dz === 0)
                    ? 1.0
                    : dz + (dz / dz)
            };*/ { x: dx ?? 0, y: dy ?? 0, z: dz ?? 0 }; // おのれもやん

            entityQueryOptionsWithC.volume = volume;
        }

        // inputPermissionが指定されていれば独自プロパティに関数書き込み
        const inputPermissions: ((player: Player) => boolean)[] | undefined = entityQueryOptionsWithC.inputPermissionFilters === undefined
            ? undefined
            : entityQueryOptionsWithC.inputPermissionFilters.map(({ category, enabled }) => {
                return (player) => {
                    const isEnabled = player.inputPermissions.isPermissionCategoryEnabled(category);
                    if (enabled) return isEnabled;
                    else return !isEnabled;
                };
            });

        // x=, y=, z=取り出し
        const { x: px, y: py, z: pz } = entityQueryOptionsWithC;

        const defaultComponent: VectorComponent = {
            type: "relative",
            value: 0
        };

        // セレクタの探索基準座標をつくる
        const posVecResolver: PositionVectorResolver | undefined = px === undefined && py === undefined && pz === undefined
            ? undefined
            : new PositionVectorResolver(px ?? defaultComponent, py ?? defaultComponent, pz ?? defaultComponent);

        // c=が指定済みかつ負ならば配列はリバースされる
        const isArrayReversed: boolean = entityQueryOptionsWithC?.c === undefined
            ? false
            : entityQueryOptionsWithC.c < 0;

        // c=1またはc=-1またはセレクタのデフォルトリミットが1ならばisSingle=true
        const isSingle: boolean = selectorType.defaultEntityLimit === 1 || entityQueryOptionsWithC.c === 1 || entityQueryOptionsWithC.c === -1;

        return {
            isSingle,

            getEntities(stack) {
                // 探索基準座標適用したEntityQueryOptionsつくる
                const options: EntityQueryOptions = {
                    ...entityQueryOptionsWithC,
                    location: posVecResolver === undefined
                        ? stack.getPosition()
                        : posVecResolver.resolve(stack)
                };

                // 全ディメンション取得
                let candidates: Entity[] = DimensionTypes.getAll()
                // r=とか指定されてたらディメンションを1つに制限
                .filter(({ typeId }) => {
                    if (options.minDistance === undefined && options.maxDistance === undefined && options.volume === undefined) {
                        // ディメンションの制約がないとき
                        return true;
                    }
                    else {
                        // ディメンションの制約があるとき
                        return stack.getDimension().id === typeId;
                    }
                })
                // エンティティの配列にする
                .flatMap(({ typeId }) => {
                    const dimension: Dimension = world.getDimension(typeId);

                    if (selectorType.isDeadEntityDetectable) {
                        // セレクタが死んでるのも取れるならプレイヤー以外とプレイヤーは分けて取得
                        return dimension.getEntities({ excludeTypes: [MinecraftEntityTypes.Player] }).concat(dimension.getPlayers());
                    }
                    else {
                        // そうでなければ普通に取る
                        return dimension.getEntities();
                    }
                });

                candidates = candidates.filter(entity => {
                    // inputpermission=があるプレイヤー限定でinputPermission条件付きで探索
                    if (entity instanceof Player && inputPermissions !== undefined) {
                        return entity.matches(options) && inputPermissions.every(func => func(entity));
                    }
                    // それ以外は普通に引数適用
                    else return entity.matches(options);
                });

                // 探索基準座標をvector3Builderにする
                const loc: Vector3Builder = Vector3Builder.from(options.location as Vector3);

                // 探索基準座標からの距離でソートする
                const array = candidates.sort((a, b) => {
                    return immutableConfiguration.SORT_ORDERS[sortOrder](a, b, loc);
                })

                // c=負数なら配列リバース
                if (isArrayReversed) {
                    array.reverse();
                }

                // おわり！！！！！！！！
                return array
                // c=の値で制限
                .slice(0, limit);;
            }
        };
    }

    public static readSelector(selector: string): EntitySelector {
        const reader: EntitySelectorReader = new this();
        reader.text = selector;
        return reader.index();
    }

    // public static readonly SELECTOR_ARGUMENTS: RegistryKey<>
}

export interface EntitySelector {
    readonly isSingle: boolean;

    getEntities(stack: CommandSourceStack): Entity[];
}
