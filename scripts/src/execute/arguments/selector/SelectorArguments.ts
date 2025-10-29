import { EntityQueryOptions, EntityQueryPropertyOptions, EntityQueryScoreOptions, GameMode } from "@minecraft/server";
import { sentry } from "../../../lib/TypeSentry";
import { EntitySelectorArgumentTypeMap, InvertibleValue } from "./SelectorArgumentType";
import { IntRange } from "../../../util/NumberRange";
import { VectorComponent, VectorComponentType } from "../vector/AbstractVectorResolver";
import { PositionVectorResolver } from "../vector/PositionVectorResolver";

export type SelectorArgumentInputMap = Record<string, InvertibleValue[]>;

export class SelectorArguments {
    public constructor(private readonly argumentInputMap: SelectorArgumentInputMap) {}

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

            // if (Object.keys(properties).length === 0)... 空Map判定は型チェックにおまかせ！

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

            // if (Object.keys(scores).length === 0) 空Mapチェックは型チェックにおまかせ！

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
            type: VectorComponentType.RELATIVE,
            value: 0
        };

        let y: VectorComponent = {
            type: VectorComponentType.RELATIVE,
            value: 0
        };

        let z: VectorComponent = {
            type: VectorComponentType.RELATIVE,
            value: 0
        };

        if (this.hasAnyOf("x")) {
            const _x = this.getAsDirectValue("x")!
            x = sentry.number.test(_x) ? { type: VectorComponentType.ABSOLUTE, value: _x } : _x;
        }

        if (this.hasAnyOf("y")) {
            const _y = this.getAsDirectValue("y")!
            y = sentry.number.test(_y) ? { type: VectorComponentType.ABSOLUTE, value: _y } : _y;
        }

        if (this.hasAnyOf("z")) {
            const _z = this.getAsDirectValue("z")!
            z = sentry.number.test(_z) ? { type: VectorComponentType.ABSOLUTE, value: _z } : _z;
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
