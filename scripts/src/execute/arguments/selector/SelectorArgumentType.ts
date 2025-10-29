import { GameMode, InputPermissionCategory } from "@minecraft/server";
import { sentry, TypeModel } from "../../../lib/TypeSentry";
import { VectorComponent } from "../vector/AbstractVectorResolver";
import { IntRange } from "../../../util/NumberRange";

export interface SelectorArgumentType<T> {
    readonly invertible: boolean;

    readonly duplicatable: SelectorArgumentDuplicationRule;

    readonly type: TypeModel<T>;
}

export interface InvertibleValue<T = unknown> {
    readonly isInverted: boolean;

    readonly value: T;
}

export interface UninvertibleValue<T = unknown> extends InvertibleValue<T> {
    readonly isInverted: false;
}

function invertibleValueOf<T>(t: TypeModel<T>) :TypeModel<InvertibleValue<T>> {
    return sentry.objectOf({
        isInverted: sentry.boolean,
        value: t
    });
}

function uninvertibleValueOf<T>(t: TypeModel<T>) :TypeModel<UninvertibleValue<T>> {
    return sentry.objectOf({
        isInverted: sentry.literalOf(false),
        value: t
    });
}

export interface EntitySelectorArgumentTypeMap {
    readonly c: number;
    readonly dx: number;
    readonly dy: number;
    readonly dz: number;
    readonly family: string;
    readonly has_property: HasProperty;
    readonly hasitem: HasItem | HasItem[];
    readonly haspermission: HasPermission;
    readonly l: number;
    readonly lm: number;
    readonly m: GameModeLike;
    readonly name: string;
    readonly r: number;
    readonly rm: number;
    readonly rx: number;
    readonly rxm: number;
    readonly ry: number;
    readonly rym: number;
    readonly scores: Scores;
    readonly tag: string;
    readonly type: string;
    readonly x: VectorComponent | number;
    readonly y: VectorComponent | number;
    readonly z: VectorComponent | number;
}

export type GameModeLike = 0 | 1 | 2 | 's' | 'c' | 'a' | "survival" | "creative" | "adventure" | "spectator" | GameMode;

export type ProperyIdUnion
    = "minecraft:armadillo_state"
    | "minecraft:can_move"
    | "minecraft:chest_interaction"
    | "minecraft:climate_variant"
    | "minecraft:creaking_state"
    | "minecraft:creaking_swaying_ticks"
    | "minecraft:has_flower"
    | "minecraft:has_increased_max_health"
    | "minecraft:has_nectar"
    | "minecraft:is_armorable"
    | "minecraft:is_becoming_statue"
    | "minecraft:is_playing_idle_ground_sound"
    | "minecraft:is_waxed"
    | "minecraft:oxidation_level"
    | "minecraft:sound_variant"
    | "minecraft:was_upgraded_to_1_21_100";

export type HasProperty = {
    readonly [K in ProperyIdUnion]?: InvertibleValue<boolean>[];
} & {
    readonly property?: InvertibleValue<ProperyIdUnion>[];
}

export interface HasItem {
    // BEのサブセレクタ引数の入力はつねに重複を許可する
    readonly item: UninvertibleValue<string>[];

    readonly location?: UninvertibleValue<string>[];

    readonly slot?: UninvertibleValue<number>[];

    readonly quantity?: UninvertibleValue<IntRange | number>[];

    // 幻
    readonly data?: UninvertibleValue<number>[];
}

export type PermissionState = "enabled" | "disabled";

export interface HasPermission {
    readonly camera?: UninvertibleValue<PermissionState>[];

    readonly dismount?: UninvertibleValue<PermissionState>[];

    readonly jump?: UninvertibleValue<PermissionState>[];

    readonly lateral_movement?: UninvertibleValue<PermissionState>[];

    readonly mount?: UninvertibleValue<PermissionState>[];

    readonly move_backward?: UninvertibleValue<PermissionState>[];

    readonly move_forward?: UninvertibleValue<PermissionState>[];

    readonly move_left?: UninvertibleValue<PermissionState>[];

    readonly move_right?: UninvertibleValue<PermissionState>[];

    readonly movement?: UninvertibleValue<PermissionState>[];

    readonly sneak?: UninvertibleValue<PermissionState>[];
}

export type PermissionNameInputCategoryMap = {
    readonly [K in (keyof HasPermission)[][number]]: InputPermissionCategory;
}

export type Scores = Record<string, InvertibleValue<number | IntRange>[]>;

export enum SelectorArgumentDuplicationRule {
    ALWAYS = "ALWAYS",
    INVERTED_ONLY = "EXCLUDE_INVERTED",
    NEVER = "NEVER"
}

export class SelectorArgumentTypes {
    private constructor() {}

    public static readonly IntRangeModel: TypeModel<IntRange> = sentry.classOf(IntRange);

    public static readonly ScoresModel: TypeModel<Scores> = sentry.recordOf(
        sentry.string,
        sentry.arrayOf(
            invertibleValueOf(
                sentry.unionOf(
                    sentry.number,
                    SelectorArgumentTypes.IntRangeModel
                )
            )
        )
    );

    public static readonly PermissionStateModel: TypeModel<PermissionState> = sentry.unionOf(
        sentry.literalOf("enabled"),
        sentry.literalOf("disabled")
    );

    public static readonly HasPermissionModel: TypeModel<HasPermission> = sentry.objectOf({
        camera: sentry.optionalOf(
            sentry.arrayOf(
                uninvertibleValueOf(
                    SelectorArgumentTypes.PermissionStateModel
                )
            )
        ),
        dismount: sentry.optionalOf(
            sentry.arrayOf(
                uninvertibleValueOf(
                    SelectorArgumentTypes.PermissionStateModel
                )
            )
        ),
        jump: sentry.optionalOf(
            sentry.arrayOf(
                uninvertibleValueOf(
                    SelectorArgumentTypes.PermissionStateModel
                )
            )
        ),
        lateral_movement: sentry.optionalOf(
            sentry.arrayOf(
                uninvertibleValueOf(
                    SelectorArgumentTypes.PermissionStateModel
                )
            )
        ),
        mount: sentry.optionalOf(
            sentry.arrayOf(
                uninvertibleValueOf(
                    SelectorArgumentTypes.PermissionStateModel
                )
            )
        ),
        move_backward: sentry.optionalOf(
            sentry.arrayOf(
                uninvertibleValueOf(
                    SelectorArgumentTypes.PermissionStateModel
                )
            )
        ),
        move_forward: sentry.optionalOf(
            sentry.arrayOf(
                uninvertibleValueOf(
                    SelectorArgumentTypes.PermissionStateModel
                )
            )
        ),
        move_left: sentry.optionalOf(
            sentry.arrayOf(
                uninvertibleValueOf(
                    SelectorArgumentTypes.PermissionStateModel
                )
            )
        ),
        move_right: sentry.optionalOf(
            sentry.arrayOf(
                uninvertibleValueOf(
                    SelectorArgumentTypes.PermissionStateModel
                )
            )
        ),
        movement: sentry.optionalOf(
            sentry.arrayOf(
                uninvertibleValueOf(
                    SelectorArgumentTypes.PermissionStateModel
                )
            )
        ),
        sneak: sentry.optionalOf(
            sentry.arrayOf(
                uninvertibleValueOf(
                    SelectorArgumentTypes.PermissionStateModel
                )
            )
        )
    }) as TypeModel<HasPermission>;

    public static readonly HasItemModel: TypeModel<HasItem> = sentry.neoObjectOf({
        item: sentry.arrayOf(
            uninvertibleValueOf(
                sentry.string
            )
        ),
        location: sentry.neoOptionalOf(
            sentry.arrayOf(
                uninvertibleValueOf(
                    sentry.string
                )
            )
        ),
        slot: sentry.neoOptionalOf(
            sentry.arrayOf(
                uninvertibleValueOf(
                    sentry.number.nonNaN().int()
                )
            )
        ),
        quantity: sentry.neoOptionalOf(
            sentry.arrayOf(
                sentry.unionOf(
                    uninvertibleValueOf(
                        sentry.number.nonNaN().int()
                    ),
                    uninvertibleValueOf(
                        SelectorArgumentTypes.IntRangeModel
                    )
                )
            )
        ),
        data: sentry.neoOptionalOf(
            sentry.arrayOf(
                uninvertibleValueOf(
                    sentry.number.nonNaN().int()
                )
            )
        )
    }).exact();

    public static readonly GameModeLikeModel: TypeModel<GameModeLike> = sentry.unionOf(
        sentry.literalOf(0),
        sentry.literalOf(1),
        sentry.literalOf(2),
        sentry.literalOf('s'),
        sentry.literalOf('c'),
        sentry.literalOf('a'),
        sentry.literalOf("survival"),
        sentry.literalOf("creative"),
        sentry.literalOf("adventure"),
        sentry.literalOf("spectator"),
        sentry.enumLikeOf(GameMode)
    );

    /**
     * TODO
     */
    public static readonly HasPropertyModel: TypeModel<HasProperty> = sentry.neoObjectOf({
        "minecraft:armadillo_state": sentry.neoOptionalOf(
            sentry.arrayOf(
                invertibleValueOf(sentry.boolean)
            )
        ),
        "minecraft:can_move": sentry.neoOptionalOf(
            sentry.arrayOf(
                invertibleValueOf(sentry.boolean)
            )
        ),
        "minecraft:chest_interaction": sentry.neoOptionalOf(
            sentry.arrayOf(
                invertibleValueOf(sentry.boolean)
            )
        ),
        "minecraft:climate_variant": sentry.neoOptionalOf(
            sentry.arrayOf(
                invertibleValueOf(sentry.boolean)
            )
        ),
        "minecraft:creaking_state": sentry.neoOptionalOf(
            sentry.arrayOf(
                invertibleValueOf(sentry.boolean)
            )
        ),
        "minecraft:creaking_swaying_ticks": sentry.neoOptionalOf(
            sentry.arrayOf(
                invertibleValueOf(sentry.boolean)
            )
        ),
        "minecraft:has_flower": sentry.neoOptionalOf(
            sentry.arrayOf(
                invertibleValueOf(sentry.boolean)
            )
        ),
        "minecraft:has_increased_max_health": sentry.neoOptionalOf(
            sentry.arrayOf(
                invertibleValueOf(sentry.boolean)
            )
        ),
        "minecraft:has_nectar": sentry.neoOptionalOf(
            sentry.arrayOf(
                invertibleValueOf(sentry.boolean)
            )
        ),
        "minecraft:is_armorable": sentry.neoOptionalOf(
            sentry.arrayOf(
                invertibleValueOf(sentry.boolean)
            )
        ),
        "minecraft:is_becoming_statue": sentry.neoOptionalOf(
            sentry.arrayOf(
                invertibleValueOf(sentry.boolean)
            )
        ),
        "minecraft:is_playing_idle_ground_sound": sentry.neoOptionalOf(
            sentry.arrayOf(
                invertibleValueOf(sentry.boolean)
            )
        ),
        "minecraft:is_waxed": sentry.neoOptionalOf(
            sentry.arrayOf(
                invertibleValueOf(sentry.boolean)
            )
        ),
        "minecraft:oxidation_level": sentry.neoOptionalOf(
            sentry.arrayOf(
                invertibleValueOf(sentry.boolean)
            )
        ),
        "minecraft:sound_variant": sentry.neoOptionalOf(
            sentry.arrayOf(
                invertibleValueOf(sentry.boolean)
            )
        ),
        "minecraft:was_upgraded_to_1_21_100": sentry.neoOptionalOf(
            sentry.arrayOf(
                invertibleValueOf(sentry.boolean)
            )
        ),
        property: sentry.neoOptionalOf(
            sentry.arrayOf(
                invertibleValueOf(sentry.unionOf(
                    sentry.literalOf("minecraft:armadillo_state"),
                    sentry.literalOf("minecraft:can_move"),
                    sentry.literalOf("minecraft:chest_interaction"),
                    sentry.literalOf("minecraft:climate_variant"),
                    sentry.literalOf("minecraft:creaking_state"),
                    sentry.literalOf("minecraft:creaking_swaying_ticks"),
                    sentry.literalOf("minecraft:has_flower"),
                    sentry.literalOf("minecraft:has_increased_max_health"),
                    sentry.literalOf("minecraft:has_nectar"),
                    sentry.literalOf("minecraft:is_armorable"),
                    sentry.literalOf("minecraft:is_becoming_statue"),
                    sentry.literalOf("minecraft:is_playing_idle_ground_sound"),
                    sentry.literalOf("minecraft:is_waxed"),
                    sentry.literalOf("minecraft:oxidation_level"),
                    sentry.literalOf("minecraft:sound_variant"),
                    sentry.literalOf("minecraft:was_upgraded_to_1_21_100")
                ))
            )
        )
    }).exact();

    private static readonly PERMISSION_NAME_INPUT_PERMISSION_CATEGORY_MAP: PermissionNameInputCategoryMap = {
        camera: InputPermissionCategory.Camera,
        dismount: InputPermissionCategory.Dismount,
        jump: InputPermissionCategory.Jump,
        lateral_movement: InputPermissionCategory.LateralMovement,
        mount: InputPermissionCategory.Mount,
        move_backward: InputPermissionCategory.MoveBackward,
        move_forward: InputPermissionCategory.MoveForward,
        move_left: InputPermissionCategory.MoveLeft,
        move_right: InputPermissionCategory.MoveRight,
        movement: InputPermissionCategory.Movement,
        sneak: InputPermissionCategory.Sneak
    };

    public static getInputPermissionCategory<T extends keyof HasPermission>(name: T): PermissionNameInputCategoryMap[T] {
        return this.PERMISSION_NAME_INPUT_PERMISSION_CATEGORY_MAP[name];
    }
}
