import { Block, BlockPermutation, BlockType } from "@minecraft/server";

export class BlockPredicate {
    public constructor(private readonly type: BlockType, private readonly states: Record<string, string | number | boolean>) {}

    public matches(block: Block) {
        return block.permutation.matches(this.type.id, this.states);
    }

    public toBlockPermutation(): BlockPermutation {
        return BlockPermutation.resolve(this.type.id, this.states);
    }
}
