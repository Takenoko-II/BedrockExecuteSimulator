import { GameMode, InputPermissionCategory } from "@minecraft/server";
import { sentry, TypeModel } from "../../../lib/TypeSentry";
import { VectorComponent } from "../vector/AbstractVectorResolver";
import { IntRange } from "../../../util/NumberRange";

export interface SelectorArgumentType<T> {
    readonly invertible: boolean;

    readonly duplicatable: SelectorArgumentDuplicationRule;

    readonly type: TypeModel<T>;
}

export enum SelectorArgumentDuplicationRule {
    ALWAYS = "ALWAYS",
    INVERTED_ONLY = "EXCLUDE_INVERTED",
    NEVER = "NEVER"
}

export interface InvertibleValue<T = unknown> {
    readonly isInverted: boolean;

    readonly value: T;
}

function invertibleValueOf<T>(t: TypeModel<T>) :TypeModel<InvertibleValue<T>> {
    return sentry.objectOf({
        isInverted: sentry.boolean,
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

type GameModeLike = 0 | 1 | 2 | 's' | 'c' | 'a' | "survival" | "creative" | "adventure" | "spectator" | GameMode;

export const GameModeLikeModel: TypeModel<GameModeLike> = sentry.unionOf(
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

export type HasProperty = Record<string, InvertibleValue<boolean>[]> & {
    readonly property?: InvertibleValue<string>[];
}

export const HasPropertyModel: TypeModel<HasProperty> = sentry.intersectionOf(
    sentry.objectOf({
        property: sentry.optionalOf(
            sentry.arrayOf(
                invertibleValueOf(sentry.string)
            )
        )
    }),
    sentry.recordOf(
        sentry.string,
        sentry.arrayOf(
            invertibleValueOf(
                sentry.boolean
            )
        )
    )
) as TypeModel<HasProperty>;

export interface HasItem {
    // BEのサブセレクタ引数の入力はつねに重複を許可する
    readonly item: InvertibleValue<string>[];

    readonly location?: InvertibleValue<string>[];

    readonly slot?: InvertibleValue<number>[];

    readonly quantity?: InvertibleValue<IntRange | number>[];

    // 幻
    readonly data?: InvertibleValue<number>[];
}

export const IntRangeModel: TypeModel<IntRange> = sentry.classOf(IntRange);

export const HasItemModel: TypeModel<HasItem> = sentry.objectOf({
    item: sentry.arrayOf(
        invertibleValueOf(
            sentry.string
        )
    ),
    location: sentry.optionalOf(
        sentry.arrayOf(
            invertibleValueOf(
                sentry.string
            )
        )
    ),
    slot: sentry.optionalOf(
        sentry.arrayOf(
            invertibleValueOf(
                sentry.number.nonNaN().int()
            )
        )
    ),
    quantity: sentry.optionalOf(
        sentry.arrayOf(
            sentry.unionOf(
                invertibleValueOf(
                    sentry.number.nonNaN().int()
                ),
                invertibleValueOf(
                    IntRangeModel
                )
            )
        )
    ),
    data: sentry.optionalOf(
        sentry.arrayOf(
            invertibleValueOf(
                sentry.number.nonNaN().int()
            )
        )
    )
}) as TypeModel<HasItem>;

export type PermissionState = "enabled" | "disabled";

export interface HasPermission {
    readonly camera?: InvertibleValue<PermissionState>[];

    readonly dismount?: InvertibleValue<PermissionState>[];

    readonly jump?: InvertibleValue<PermissionState>[];

    readonly lateral_movement?: InvertibleValue<PermissionState>[];

    readonly mount?: InvertibleValue<PermissionState>[];

    readonly move_backward?: InvertibleValue<PermissionState>[];

    readonly move_forward?: InvertibleValue<PermissionState>[];

    readonly move_left?: InvertibleValue<PermissionState>[];

    readonly move_right?: InvertibleValue<PermissionState>[];

    readonly movement?: InvertibleValue<PermissionState>[];

    readonly sneak?: InvertibleValue<PermissionState>[];
}

export const PermissionStateModel = sentry.unionOf(
    sentry.literalOf("enabled"),
    sentry.literalOf("disabled")
);

export const HasPermissionModel: TypeModel<HasPermission> = sentry.objectOf({
    camera: sentry.optionalOf(
        sentry.arrayOf(
            invertibleValueOf(
                PermissionStateModel
            )
        )
    ),
    dismount: sentry.optionalOf(
        sentry.arrayOf(
            invertibleValueOf(
                PermissionStateModel
            )
        )
    ),
    jump: sentry.optionalOf(
        sentry.arrayOf(
            invertibleValueOf(
                PermissionStateModel
            )
        )
    ),
    lateral_movement: sentry.optionalOf(
        sentry.arrayOf(
            invertibleValueOf(
                PermissionStateModel
            )
        )
    ),
    mount: sentry.optionalOf(
        sentry.arrayOf(
            invertibleValueOf(
                PermissionStateModel
            )
        )
    ),
    move_backward: sentry.optionalOf(
        sentry.arrayOf(
            invertibleValueOf(
                PermissionStateModel
            )
        )
    ),
    move_forward: sentry.optionalOf(
        sentry.arrayOf(
            invertibleValueOf(
                PermissionStateModel
            )
        )
    ),
    move_left: sentry.optionalOf(
        sentry.arrayOf(
            invertibleValueOf(
                PermissionStateModel
            )
        )
    ),
    move_right: sentry.optionalOf(
        sentry.arrayOf(
            invertibleValueOf(
                PermissionStateModel
            )
        )
    ),
    movement: sentry.optionalOf(
        sentry.arrayOf(
            invertibleValueOf(
                PermissionStateModel
            )
        )
    ),
    sneak: sentry.optionalOf(
        sentry.arrayOf(
            invertibleValueOf(
                PermissionStateModel
            )
        )
    )
}) as TypeModel<HasPermission>;

export type PermissionNameInputCategoryMap = {
    readonly [K in (keyof HasPermission)[][number]]: InputPermissionCategory;
}

export const PERMISSION_NAME_INPUT_PERMISSION_CATEGORY_MAP: PermissionNameInputCategoryMap = {
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

export type Scores = Record<string, InvertibleValue<number | IntRange>[]>;

export const ScoresModel: TypeModel<Scores> = sentry.recordOf(
    sentry.string,
    sentry.arrayOf(
        invertibleValueOf(
            sentry.unionOf(
                sentry.number,
                IntRangeModel
            )
        )
    )
);
