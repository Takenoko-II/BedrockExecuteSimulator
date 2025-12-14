import { AbstractParser } from "@/utils/AbstractParser";
import { Execute } from "./Execute";
import { SubCommand } from "./subcommands/AbstractSubCommand";
import { As } from "./subcommands/As";

export class ExecuteCommandParseError extends Error {}
/*
export class ExecuteCommandParser extends AbstractParser<Execute, ExecuteCommandParseError> {
    protected override getErrorConstructor(): new (message: string, cause?: Error) => ExecuteCommandParseError {
        return ExecuteCommandParseError;
    }

    protected override getWhitespaces(): Set<string> {
        return new Set([' ', '\n']);
    }

    protected override getQuotes(): Set<string> {
        return new Set(['"']);
    }

    private subCommand(): SubCommand {
        const name = this.unquotedString(true, ...this.getWhitespaces());
        this.expectWhitespace();

        switch (name) {
            case "as": return this.as();
        }
    }

    protected override parse(): Execute {
        this.expect(true, "execute");

        while (!this.isOver()) {
            this.expectWhitespace();
            this.subCommand();
        }
    }
}
*/
