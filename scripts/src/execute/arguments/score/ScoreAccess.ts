import { world } from "@minecraft/server";
import { IntRange } from "../../../util/NumberRange";
import { CommandSourceStack } from "../../CommandSourceStack";
import { EntitySelector } from "../selector/EntitySelector";
import { EntitySelectorInterpretError, EntitySelectorParser } from "../selector/EntitySelectorParser";

export type ScoreHolder = EntitySelector | string;

export type ScoreComparator = '<' | '>' | '<=' | '>=' | '=';

export type Matches = "matches";

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

    public test(stack: CommandSourceStack, comparator: Matches, range: IntRange): boolean;

    public test(stack: CommandSourceStack, comparator: ScoreComparator | Matches, other: ScoreAccess | IntRange): boolean {
        const valueA = this.getValue(stack);

        if (valueA === undefined) {
            return false;
        }

        if (other instanceof IntRange) {
            return other.within(valueA);
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
        if (world.getPlayers({ name: input }).length > 0) {
            return EntitySelectorParser.readSelector(input);
        }
        else {
            try {
                const selector = EntitySelectorParser.readSelector(input);
    
                if (selector.isSingle) {
                    return selector;
                }
                else {
                    throw new Error("セレクターが満たすスコアホルダーは常に1つのみである必要があります");
                }
            }
            catch (e) {
                if (e instanceof EntitySelectorInterpretError) {
                    return input;
                }
                else {
                    throw e;
                }
            }
        }
    }
}
