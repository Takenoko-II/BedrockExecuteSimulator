import { ButtonState, InputButton, Player, system, world } from "@minecraft/server";
import { AbstractEventEmitter, EventBase, EventHandlerRegistries, EventHandlerRegistry, EventSpecs } from "./EventEmitter";

interface UtilSpecs extends EventSpecs {
    readonly sneakButtonReleaseQuickly: SneakButtonReleaseQuickly;
}

export interface SneakButtonReleaseQuickly extends EventBase {
    readonly player: Player;
}

class UtilEventEmitter extends AbstractEventEmitter<UtilSpecs> {
    protected override readonly registries: EventHandlerRegistries<UtilSpecs> = {
        sneakButtonReleaseQuickly: new EventHandlerRegistry()
    };
}

export const events = new UtilEventEmitter();

const lastButtonPressedTick = new Map<Player, number>();

world.afterEvents.playerButtonInput.subscribe(event => {
    if (event.button !== InputButton.Sneak) return;

    switch (event.newButtonState) {
        case ButtonState.Pressed: {
            lastButtonPressedTick.set(event.player, system.currentTick);
            break;
        }
        case ButtonState.Released: {
            if (system.currentTick - lastButtonPressedTick.get(event.player)! <= 1) {
                events.emit("sneakButtonReleaseQuickly", { player: event.player });
            }
            break;
        }
    }
});

world.beforeEvents.playerLeave.subscribe(event => {
    lastButtonPressedTick.delete(event.player);
});
