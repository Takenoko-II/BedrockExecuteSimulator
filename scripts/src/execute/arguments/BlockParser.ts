import { BlockType, BlockTypes } from "@minecraft/server";
import { AbstractParser } from "./AbstractParser";

export class BlockMatcher {}

export class BlockParseError extends Error {}

export class BlockParser extends AbstractParser<BlockMatcher, BlockParseError> {
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

        if (this.next(true, ':')) {
            namespace = namespaceOrId;
            id = this.unquotedString(false, '[');
        }
        else {
            namespace = "minecraft";
            id = namespaceOrId;
        }

        BlockTypes.get(`${namespace}:${id}`);
    }
}
