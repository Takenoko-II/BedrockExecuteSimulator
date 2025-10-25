import { Block, BlockPermutation, BlockStates, BlockType, BlockTypes } from "@minecraft/server";
import { AbstractParser } from "./AbstractParser";

export class BlockPredicate {
    public constructor(private readonly type: BlockType, private readonly states: Record<string, string | number | boolean>) {}

    public matches(block: Block) {
        return block.permutation.matches(this.type.id, this.states);
    }

    public toBlockPermutation(): BlockPermutation {
        return BlockPermutation.resolve(this.type.id, this.states);
    }
}

export class BlockParseError extends Error {}

export class BlockPredicateParser extends AbstractParser<BlockPredicate, BlockParseError> {
    protected override getTrue(): string {
        return "true";
    }

    protected override getFalse(): string {
        return "false";
    }

    protected override getQuotes(): Set<string> {
        return new Set(['"']);
    }

    protected override getWhitespace(): Set<string> {
        return new Set([' ']);
    }

    protected override getErrorConstructor(): (message: string, cause?: Error) => BlockParseError {
        return (message, cause) => new BlockParseError(message, cause);
    }

    private type(): BlockType {
        const namespaceOrId = this.unquotedString(true, ':', '[');

        let namespace: string;
        let id: string;

        if (this.next(false, ':')) {
            namespace = namespaceOrId;
            id = this.unquotedString(false, '[');
        }
        else {
            namespace = "minecraft";
            id = namespaceOrId;
        }

        const type = BlockTypes.get(`${namespace}:${id}`);

        if (type === undefined) {
            throw this.exception("不明なブロックIDです: " + namespace + ':' + id);
        }

        return type;
    }

    private property(): [string, string | number | boolean] {
        const name = this.quotedString(true);

        this.expect(true, '=');

        if (this.test(true, '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '-')) {
            return [name, this.number(true).value];
        }
        else if (this.test(true, this.getTrue(), this.getFalse())) {
            return [name, this.bool()];
        }
        else if (this.test(true, ...this.getQuotes())) {
            return [name, this.quotedString(true)];
        }
        else {
            throw this.exception("値の解析に失敗しました");
        }
    }

    private properties(): Record<string, string | number | boolean> {
        const states: Record<string, string | number | boolean> = {};

        if (!this.next(true, '[')) {
            return states;
        }

        if (this.next(true, ']')) {
            return states;
        }

        while (!this.isOver()) {
            const [name, value] = this.property();

            const blockStateType = BlockStates.get(name);

            if (blockStateType === undefined) {
                throw this.exception("不明なブロックステート名です: " + name);
            }

            if (!blockStateType.validValues.includes(value)) {
                throw this.exception("ブロックステート" + name + " には無効な値です: " + value);
            }

            states[blockStateType.id] = value;

            if (this.next(true, ']')) {
                return states;
            }
            else if (!this.next(true, ',')) {
                throw this.exception('区切りにはカンマが必要です');
            }
        }

        throw this.exception("閉じ括弧が見つかりませんでした");
    }

    protected override parse(): BlockPredicate {
        const type = this.type();
        const states = this.properties();

        this.finish();

        return new BlockPredicate(type, states);
    }

    public static readBlockPredicate(block: string): BlockPredicate {
        return new BlockPredicateParser(block).parse();
    }
}
