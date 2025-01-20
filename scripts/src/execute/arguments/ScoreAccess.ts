import { world } from "@minecraft/server";
import { NumberRange } from "../../util/NumberRange";
import { EntitySelector, EntitySelectorReader, SelectorParseError } from "./EntitySelectorReader";
import { CommandSourceStack } from "../CommandSourceStack";

export type ScoreHolder = EntitySelector | string;

export type ScoreComparator = '<' | '>' | '<=' | '>=' | '=';

export class ScoreAccess {
    private readonly scoreHolder: ScoreHolder;

    private readonly objectiveId: string;

    public constructor(scoreHolder: ScoreHolder, objectiveId: string) {
        this.scoreHolder = scoreHolder;
        this.objectiveId = objectiveId;
    }

    private getValue(stack: CommandSourceStack): number | undefined {
        const objective = world.scoreboard.getObjective(this.objectiveId);

        if (objective === undefined) {
            return undefined;
        }

        return (() => {
            if (typeof this.scoreHolder === "string") {
                return objective.getScore(this.scoreHolder);
            }
            else if (this.scoreHolder.isSingle) {
                const entities = this.scoreHolder.getEntities(stack);

                if (entities.length === 0) {
                    return undefined;
                }

                return objective.getScore(entities[0]);
            }
            else {
                throw new Error("NEVER HAPPENS");
            }
        })();
    }

    public test(stack: CommandSourceStack, comparator: ScoreComparator, other: ScoreAccess): boolean;

    public test(stack: CommandSourceStack, comparator: "matches", range: string): boolean;

    public test(stack: CommandSourceStack, comparator: ScoreComparator | "matches", other: ScoreAccess | string): boolean {
        const valueA = this.getValue(stack);

        if (valueA === undefined) {
            return false;
        }

        if (typeof other === "string") {
            return NumberRange.parse(other, true, true).within(valueA);
        }
        else {
            const valueB = other.getValue(stack);

            if (valueB === undefined) {
                return false;
            }

            switch (comparator) {
                case "<":
                    return valueA < valueB;
                case ">":
                    return valueA > valueB;
                case "<=":
                    return valueA <= valueB;
                case ">=":
                    return valueA >= valueB;
                case "=":
                    return valueA === valueB;
                default:
                    throw new Error("NEVER HAPPENS");
            }
        }
    }

    public static readScoreHolder(input: string): ScoreHolder {
        try {
            return EntitySelectorReader.readSelector(input);
        }
        catch (e) {
            if (e instanceof SelectorParseError) {
                if (world.getPlayers({ name: input }).length > 0) {
                    return {
                        getEntities(stack) {
                            return world.getPlayers({ name: input });
                        },
                        isSingle: true
                    }
                }
                else {
                    return input;
                }
            }
            else {
                throw e;
            }
        }
    }
}
