import { Entity } from "@minecraft/server";
import { EntitySelector } from "../arguments/selector/EntitySelector";
import { CommandSourceStack } from "../CommandSourceStack";

export abstract class SubCommand {
    public abstract apply(stack: CommandSourceStack): CommandSourceStack[];

    public abstract getName(): string;
}

export abstract class RedirectableSubCommand extends SubCommand {
    protected constructor() {
        super();
    }

    public abstract redirect(stack: CommandSourceStack): void;

    public override apply(stack: CommandSourceStack): CommandSourceStack[] {
        const clone = stack.clone();
        this.redirect(clone);
        return [clone];
    }
}

export abstract class ForkableSubCommand extends SubCommand {
    protected readonly selector: EntitySelector;

    protected constructor(selector: EntitySelector) {
        super();
        this.selector = selector;
    }

    public getEntitySelector(): EntitySelector {
        return this.selector;
    }

    public abstract fork(stack: CommandSourceStack, entity: Entity): void;

    public override apply(stack: CommandSourceStack): CommandSourceStack[] {
        return this.selector.getEntities(stack).map(entity => {
            return stack.clone(css => this.fork(css, entity));
        });
    }
}

export abstract class GuardableSubCommand extends SubCommand {
    protected constructor() {
        super();
    }

    public abstract test(stack: CommandSourceStack): boolean;

    public override apply(stack: CommandSourceStack): CommandSourceStack[] {
        return this.test(stack) ? [stack.clone()] : [];
    }
}
