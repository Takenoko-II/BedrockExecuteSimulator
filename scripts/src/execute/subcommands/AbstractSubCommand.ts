import { EntitySelector } from "../arguments/selector/EntitySelector";
import { CommandSourceStack } from "../CommandSourceStack";

export abstract class SubCommand {
    public apply(stack: CommandSourceStack): CommandSourceStack[] {
        if (this instanceof RedirectableSubCommand) {
            return [this.redirect(stack)];
        }
        else if (this instanceof ForkableSubCommand) {
            return this.fork(stack);
        }
        else if (this instanceof GuardableSubCommand) {
            return this.test(stack) ? [stack] : [];
        }
        else {
            throw new TypeError("NEVER HAPPENS");
        }
    }

    public abstract toString(): string;
}

export abstract class RedirectableSubCommand extends SubCommand {
    public abstract redirect(stack: CommandSourceStack): CommandSourceStack;
}

export abstract class ForkableSubCommand extends SubCommand {
    protected readonly selector: EntitySelector;

    protected constructor(selector: EntitySelector) {
        super();
        this.selector = selector;
    }

    public abstract fork(stack: CommandSourceStack): CommandSourceStack[];
}

export abstract class GuardableSubCommand extends SubCommand {
    public abstract test(stack: CommandSourceStack): boolean;
}
