import { CommandSourceStack } from "../CommandSourceStack";
import { IfBlock, IfBlocks, IfEntity, IfScoreCompare, IfScoreMatches } from "./If";

export class UnlessEntity extends IfEntity {
    public override test(stack: CommandSourceStack): boolean {
        return !super.test(stack);
    }
}

export class UnlessBlock extends IfBlock {
    public override test(stack: CommandSourceStack): boolean {
        return !super.test(stack);
    }
}

export class UnlessBlocks extends IfBlocks {
    public override test(stack: CommandSourceStack): boolean {
        return !super.test(stack);
    }
}

export class UnlessScoreCompare extends IfScoreCompare {
    public override test(stack: CommandSourceStack): boolean {
        return !super.test(stack);
    }
}

export class UnlessScoreMatches extends IfScoreMatches {
    public override test(stack: CommandSourceStack): boolean {
        return !super.test(stack);
    }
}
