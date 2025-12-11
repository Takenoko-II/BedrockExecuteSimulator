/**
 * @author @Takenoko-II
 * @copyright 2024/06/23
 */

import { NumberRange } from "@minecraft/common";
import { Player, RawMessage, system } from "@minecraft/server";
import { ActionFormData, ModalFormData, MessageFormData, FormCancelationReason } from "@minecraft/server-ui";
import { sentry, TypeModel } from "./TypeSentry";

const numberRangeModel: TypeModel<NumberRange> = sentry.structOf({
    min: sentry.number.nonNaN(),
    max: sentry.number.nonNaN()
});

const dropdownOptionModel: TypeModel<DropdownOption> = sentry.structOf({
    id: sentry.string,
    text: sentry.unionOf(sentry.string, sentry.structOf({}))
});

/**
 * このライブラリが投げる例外のクラス
 */
export class ServerFormError extends TypeError {
    public constructor(public override readonly cause: Error) {
        super("Unhandled Promise Rejection: " + cause.message);
    }
}

/**
 * フォームが閉じられる要因
 */
export enum ServerFormCancelationCause {
    /**
     * `UserBusy`, `UserClosed`のどちらも含む
     */
    Any = "Any",

    /**
     * プレイヤーがフォームを開くことができる状況下にないとき
     */
    UserBusy = "UserBusy",

    /**
     * プレイヤー自身がフォームを閉じたとき
     */
    UserClosed = "UserClosed"
}

/**
 * フォームの要素の型を絞り込むための関数の集合
 */
export class ServerFormElementPredicates {
    /**
     * @param value
     * @returns `value`が`ActionButton`であれば真
     */
    public static isActionButton(value: unknown): value is ActionButton {
        return sentry.structOf({
            name: sentry.unionOf(sentry.string, sentry.structOf({})),
            iconPath: sentry.undefindableOf(sentry.string),
            callbacks: sentry.setOf(sentry.functionOf([sentry.classOf(Player)], sentry.void)),
            tags: sentry.arrayOf(sentry.string),
            type: sentry.string
        }).test(value) && value.type === ElementType.ACTION_BUTTON;
    }

    /**
     * @param value
     * @returns `value`が`ModalFormElement`であれば真
     */
    public static isModalFormElement(value: unknown): value is ModalFormElement {
        return sentry.structOf({
            id: sentry.string,
            label: sentry.unionOf(sentry.string, sentry.structOf({})),
            type: sentry.string
        }).test(value) && value.type === ElementType.MODAL_FORM_ELEMENT;
    }

    /**
     * @param value
     * @returns `value`が`ModalFormToggle`であれば真
     */
    public static isToggle(value: unknown): value is ModalFormToggle {
        return ServerFormElementPredicates.isModalFormElement(value)
            && sentry.structOf({
                defaultValue: sentry.boolean
            }).test(value);
    }

    /**
     * @param value
     * @returns `value`が`ModalFormSlider`であれば真
     */
    public static isSlider(value: unknown): value is ModalFormSlider {
        return ServerFormElementPredicates.isModalFormElement(value)
            && sentry.structOf({
                range: numberRangeModel,
                step: sentry.number,
                defaultValue: sentry.number
            }).test(value)
    }

    /**
     * @param value
     * @returns `value`が`ModalFormDropdown`であれば真
     */
    public static isDropdown(value: unknown): value is ModalFormDropdown {
        return ServerFormElementPredicates.isModalFormElement(value)
            && sentry.structOf({
                list: sentry.arrayOf(dropdownOptionModel),
                defaultValueIndex: sentry.int
            }).test(value)
    }

    /**
     * @param value
     * @returns `value`が`ModalFormTextField`であれば真
     */
    public static isTextField(value: unknown): value is ModalFormTextField {
        return ServerFormElementPredicates.isModalFormElement(value)
            && sentry.structOf({
                placeHolder: sentry.unionOf(sentry.string, sentry.structOf({})),
                defaultValue: sentry.string
            }).test(value)
    }

    /**
     * @param value
     * @returns `value`が`MessageButton`であれば真
     */
    public static isMessageButton(value: unknown): value is MessageButton {
        return sentry.structOf({
            name: sentry.unionOf(sentry.string, sentry.structOf({})),
            callbacks: sentry.setOf(sentry.functionOf([sentry.classOf(Player)], sentry.void)),
            type: sentry.string
        }).test(value) && value.type === ElementType.MESSAGE_BUTTON
    }

    /**
     * @param value
     * @returns `value`が`Decoration`であれば真
     */
    public static isDecoration(value: unknown): value is Decoration {
        return sentry.structOf({
            id: sentry.string
        }).test(value)
    }

    /**
     * @param value
     * @returns `value`が`Label`であれば真
     */
    public static isLabel(value: unknown): value is Label {
        return this.isDecoration(value)
            && value.type === "LABEL";
    }

    /**
     * @param value
     * @returns `value`が`Header`であれば真
     */
    public static isHeader(value: unknown): value is Header {
        return this.isDecoration(value)
            && value.type === "HEADER";
    }

    /**
     * @param value
     * @returns `value`が`Divider`であれば真
     */
    public static isDivider(value: unknown): value is Divider {
        return this.isDecoration(value)
            && value.type === "DIVIDER";
    }
}

/**
 * フォームを作成するためのクラスが継承するクラス
 */
export abstract class ServerFormWrapper {
    protected titleText: string | RawMessage = "";

    protected readonly cancelationCallbacks: Map<keyof typeof ServerFormCancelationCause, Set<(event: ServerFormCancelEvent) => void>> = new Map([
        [ServerFormCancelationCause.Any, new Set()],
        [ServerFormCancelationCause.UserBusy, new Set()],
        [ServerFormCancelationCause.UserClosed, new Set()]
    ]);

    protected readonly errorCatcherCallbacks: Set<(event: ServerFormCatchErrorEvent) => void> = new Set();

    /**
     * `ServerFormWrapper`のインスタンスを生成します。
     */
    protected constructor() {}

    /**
     * フォームのタイトルを変更します。
     * @param text タイトル
     * @returns `this`
     */
    public title(text: string | RawMessage): this {
        this.titleText = text;
        return this;
    }

    /**
     * フォームが閉じられた際に呼び出されるコールバック関数を登録します。
     * @param value 閉じた要因
     * @param callbackFn コールバック関数
     * @returns `this`
     */
    public onCancel(value: keyof typeof ServerFormCancelationCause, callbackFn: (event: ServerFormCancelEvent) => void): this {
        this.cancelationCallbacks.get(value)!.add(callbackFn);
        return this;
    }

    /**
     * フォームが例外を捕捉した際に呼び出されるコールバック関数を登録します。
     * @param callbackFn コールバック関数
     * @returns `this`
     */
    public onCatch(callbackFn: (event: ServerFormCatchErrorEvent) => void): this {
        this.errorCatcherCallbacks.add(callbackFn);
        return this;
    }

    /**
     * フォームを表示します。
     * @param player プレイヤー
     */
    public abstract open(player: Player): void;
}

export interface Decoratable {
    /**
     * フォームにラベルを追加します。
     */
    label(label: Label): Decoratable;

    /**
     * フォームにヘッダーを追加します。
     */
    header(header: Header): Decoratable;

    /**
     * フォームに区切りを追加します。
     */
    divider(divider: Divider): Decoratable;
}

export enum ElementType {
    LABEL = "LABEL",
    HEADER = "HEADER",
    DIVIDER = "DIVIDER",
    ACTION_BUTTON = "ACTION_BUTTON",
    MESSAGE_BUTTON = "MESSAGE_BUTTON",
    MODAL_FORM_ELEMENT = "MODAL_FORM_ELEMENT"
}

export interface Element {
    readonly type: keyof typeof ElementType;
}

export interface Decoration extends Element {
    readonly id: string;
}

export interface Label extends Decoration {
    text: string | RawMessage;

    readonly type: "LABEL";
}

export interface Header extends Decoration {
    text: string | RawMessage;

    readonly type: "HEADER";
}

export interface Divider extends Decoration {
    readonly type: "DIVIDER";
}

export interface DecorationInput {
    id: string;
}

export interface LabelInput extends DecorationInput {
    text: string | RawMessage;
}

export interface HeaderInput extends DecorationInput {
    text: string | RawMessage;
}

export interface DividerInput extends DecorationInput {}

/**
 * Actionボタンが操作の主軸となるフォームのクラスが実装するインターフェース
 */
export interface ActionPushable {
    /**
     * ボタンを押した際に発火するイベントのコールバックを登録します。
     * @param predicate ボタンの条件
     * @param callbackFn コールバック関数
     * @returns `this`
     */
    onPush(callbackFn: (player: ServerFormActionButtonPushEvent) => void): ActionPushable;
}

/**
 * 送信ボタンのあるフォームのクラスが実装するインターフェース
 */
export interface Submittable {
    /**
     * 送信ボタンの設定を行います。
     * @param button 送信ボタン
     */
    submitButton(button: SubmitButtonInput): Submittable;
}

/**
 * Messageボタンが操作の主軸となるフォームのクラスが実装するインターフェース
 */
export interface MessagePushable {
    /**
     * ボタンを押した際に発火するイベントのコールバックを登録します。
     * @param callbackFn コールバック関数
     * @returns `this`
     */
    onPush(callbackFn: (player: ServerFormMessageButtonPushEvent) => void): MessagePushable;
}

/**
 * フォームが閉じられたときに発火するイベントのコールバックに渡される引数
 */
export interface ServerFormCancelEvent {
    /**
     * プレイヤー
     */
    readonly player: Player;

    /**
     * 閉じた理由
     */
    readonly reason: keyof typeof ServerFormCancelationCause;

    /**
     * このフォームを再度開く
     */
    reopen(): void;
}

/**
 * フォームが例外を捕捉したときに発火するイベントのコールバックに渡される引数
 */
export interface ServerFormCatchErrorEvent {
    /**
     * プレイヤー
     */
    readonly player: Player;

    /**
     * エラー
     */
    readonly error: ServerFormError;
}

/**
 * フォームのボタンが押されたときに発火するイベントのコールバックに渡される引数
 */
export interface ServerFormActionButtonPushEvent {
    /**
     * プレイヤー
     */
    readonly player: Player;

    /**
     * ボタンの名前
     */
    readonly button: ActionButton;
}

/**
 * フォームが送信されたときに発火するイベントのコールバックに渡される引数
 */
export interface ModalFormSubmitEvent {
    /**
     * プレイヤー
     */
    readonly player: Player;

    /**
     * 特定のIDのトグルを取得します。
     * @param id 要素のID
     */
    getToggleInput(id: string): boolean | undefined;

    /**
     * 特定のIDのスライダーを取得します。
     * @param id 要素のID
     */
    getSliderInput(id: string): number | undefined;

    /**
     * 特定のIDのドロップダウンを取得します。
     * @param id 要素のID
     */
    getDropdownInput(id: string): SelectedDropdownValue | undefined;

    /**
     * 特定のIDのテキストフィールドを取得します。
     * @param id 要素のID
     */
    getTextFieldInput(id: string): string | undefined;

    /**
     * 入力された値を順にすべて返します。
     */
    getAllInputs(): (string | number | boolean | SelectedDropdownValue)[];
}

/**
 * フォームのボタンが押されたときに発火するイベントのコールバックに渡される引数
 */
export interface ServerFormMessageButtonPushEvent {
    /**
     * プレイヤー
     */
    readonly player: Player;

    /**
     * ボタンの名前
     */
    readonly button: MessageButton;
}

/**
 * ActionFormのボタンを表現する型
 */
export interface ActionButton extends Element {
    /**
     * ボタンの名前
     */
    name: string | RawMessage;

    /**
     * ボタンのアイコンのテクスチャパス
     */
    iconPath?: string;

    /**
     * ボタンを押したときに呼び出されるコールバック関数
     */
    readonly callbacks: Set<(player: Player) => void>

    /**
     * ボタンのタグ
     */
    readonly tags: string[];

    readonly type: "ACTION_BUTTON";
}

/**
 * ActionFormのボタン入力用の型
 */
export interface ActionButtonInput {
    /**
     * ボタンの名前
     */
    name: string | RawMessage;

    /**
     * ボタンのアイコンのテクスチャパス
     */
    iconPath?: string;

    /**
     * ボタンを押したときに呼び出されるコールバック関数
     */
    on?(player: Player): void;

    /**
     * ボタンのタグ
     */
    tags?: string[];
}

/**
 * MessageFormのボタン入力用の型
 */
export interface MessageButton extends Element {
    /**
     * ボタンの名前
     */
    name: string | RawMessage;

    /**
     * ボタンを押したときに呼び出されるコールバック関数
     */
    readonly callbacks: Set<(player: Player) => void>
}

/**
 * MessageFormのボタン入力用の型
 */
export interface MessageButtonInput {
    /**
     * ボタンの名前
     */
    name: string | RawMessage;

    /**
     * ボタンを押したときに呼び出されるコールバック関数
     */
    on?(player: Player): void;
}

/**
 * ModalFormの要素を表現する型
 */
export interface ModalFormElement extends Element {
    /**
     * 要素のID
     */
    readonly id: string;

    /**
     * ラベル
     */
    label: string | RawMessage;
}

/**
 * トグルを表現する型
 */
export interface ModalFormToggle extends ModalFormElement {
    /**
     * デフォルト値
     */
    defaultValue: boolean;
}

/**
 * スライダーを表現する型
 */
export interface ModalFormSlider extends ModalFormElement {
    /**
     * スライダーの数値の範囲
     */
    readonly range: NumberRange;

    /**
     * スライダーの数値の間隔
     */
    step: number;

    /**
     * デフォルト値
     */
    defaultValue: number;
}

/**
 * テキストフィールドを表現する型
 */
export interface ModalFormTextField extends ModalFormElement {    
    /**
     * テキストフィールドの入力欄が未入力状態のときに表示する文字列
     */
    placeHolder: string | RawMessage;

    /**
     * デフォルト値
     */
    defaultValue: string;
}

/**
 * ドロップダウンの選択肢
 */
export interface DropdownOption {
    readonly id: string;

    text: string | RawMessage;
}

/**
 * 選択されたドロップダウンの選択肢
 */
export interface SelectedDropdownValue {
    readonly index: number;

    readonly value: DropdownOption;
}

/**
 * ドロップダウンを表現する型
 */
export interface ModalFormDropdown extends ModalFormElement {
    /**
     * ドロップダウンのリスト
     */
    readonly list: DropdownOption[];

    /**
     * デフォルト値のインデックス
     */
    defaultValueIndex: number;
}

/**
 * ModalFormの要素入力用の型
 */
export interface ModalFormElementInput {
    /**
     * 要素のID
     */
    id: string;

    /**
     * ラベル
     */
    label: string | RawMessage;
}

/**
 * トグルの入力用の型
 */
export interface ModalFormToggleInput extends ModalFormElementInput {
    /**
     * デフォルト値
     */
    defaultValue?: boolean;
}

/**
 * スライダーの入力用の型
 */
export interface ModalFormSliderInput extends ModalFormElementInput {
    /**
     * スライダーの数値の範囲
     */
    range: NumberRange;

    /**
     * スライダーの数値の間隔
     */
    step?: number;

    /**
     * デフォルト値
     */
    defaultValue?: number;
}

/**
 * テキストフィールドの入力用の型
 */
export interface ModalFormTextFieldInput extends ModalFormElementInput {
    /**
     * テキストフィールドの入力欄が未入力状態のときに表示する文字列
     */
    placeHolder: string | RawMessage;

    /**
     * デフォルト値
     */
    defaultValue?: string;
}

/**
 * ドロップダウンの入力用の型
 */
export interface ModalFormDropdownInput extends ModalFormElementInput {
    /**
     * ドロップダウンのリスト
     */
    list: DropdownOption[];

    /**
     * デフォルト値のインデックス
     */
    defaultValueIndex?: number;
}

export interface SubmitButton {
    name: string | RawMessage;

    on(event: ModalFormSubmitEvent): void;
}

/**
 * 送信ボタンの入力用の型
 */
export interface SubmitButtonInput {
    name: string | RawMessage;

    on?(event: ModalFormSubmitEvent): void;
}

export interface Definitions {}

export interface DecorationDefinitions extends Definitions {
    /**
     * 特定のIDのラベルを取得します。
     */
    getLabel(id: string): Label | undefined;

    /**
     * 特定のIDのヘッダーを取得します。
     */
    getHeader(id: string): Header | undefined;

    /**
     * 特定のIDの区切りを取得します。
     */
    getDivider(id: string): Divider | undefined;
}

/**
 * ActionFormの要素の定義情報
 */
export interface ActionFormElementDefinitions extends DecorationDefinitions {
    /**
     * 条件に一致するボタンを取得します。
     * @param predicate ボタンの条件
     */
    getButtons(predicate?: (button: ActionButton) => boolean): ActionButton[];

    /**
     * 全ての要素を含む配列を取得します。
     */
    getAll(): (ActionButton | Header | Label | Divider)[];
}

/**
 * ModalFormの要素の定義情報
 */
export interface ModalFormElementDefinitions extends DecorationDefinitions {
    /**
     * 特定のIDのトグルを取得します。
     * @param id 要素のID
     */
    getToggle(id: string): ModalFormToggle | undefined;

    /**
     * 特定のIDのスライダーを取得します。
     * @param id 要素のID
     */
    getSlider(id: string): ModalFormSlider | undefined;

    /**
     * 特定のIDのドロップダウンを取得します。
     * @param id 要素のID
     */
    getDropdown(id: string): ModalFormDropdown | undefined;

    /**
     * 特定のIDのテキストフィールドを取得します。
     * @param id 要素のID
     */
    getTextField(id: string): ModalFormTextField | undefined;

    /**
     * 送信ボタンを取得します。
     */
    getSubmitButton(): SubmitButton;

    /**
     * 条件に一致する要素を取得します。
     * @param predicate 要素の条件
     */
    getElements<T extends ModalFormElement>(predicate?: (element: ModalFormElement) => element is T): T[];

    /**
     * 全ての要素を含む配列を取得します。
     */
    getAll(): (ModalFormToggle | ModalFormSlider | ModalFormDropdown | ModalFormTextField | Header | Label | Divider)[];
}

/**
 * ボタンの定義情報
 */
export interface MessageFormElementDefinitions extends Definitions {
    /**
     * 二つのボタンを取得します。
     */
    getButtons(): [MessageButton, MessageButton];
}

export interface DefinitionEnumerable<T extends Definitions> {
    readonly elements: T;
}

/**
 * `ActionFormData`をより直感的かつ簡潔に扱うことを目的としたクラス
 */
export class ActionFormWrapper extends ServerFormWrapper implements ActionPushable, Decoratable, DefinitionEnumerable<ActionFormElementDefinitions> {
    private bodyText: string | RawMessage | undefined = undefined;

    private readonly values: (ActionButton | Label | Header | Divider)[] = [];

    private readonly pushEventCallbacks: Set<(event: ServerFormActionButtonPushEvent) => void> = new Set();

    /**
     * `ActionFormWrapper`のインスタンスを生成します。
     */
    public constructor() {
        super();
        this.elements = undefined as unknown as ActionFormElementDefinitions;
        Object.defineProperty(this, "elements", {
            get: (): ActionFormElementDefinitions => {
                const that = this;
                return {
                    getButtons(predicate) {
                        return that.values
                            .filter(ServerFormElementPredicates.isActionButton)
                            .filter(predicate ?? (() => true));
                    },
                    getLabel(id) {
                        return that.values.filter(ServerFormElementPredicates.isLabel)
                            .find(label => label.id === id);
                    },
                    getHeader(id) {
                        return that.values.filter(ServerFormElementPredicates.isHeader)
                            .find(header => header.id === id);
                    },
                    getDivider(id) {
                        return that.values.filter(ServerFormElementPredicates.isDivider)
                            .find(divider => divider.id === id);
                    },
                    getAll() {
                        return that.values;
                    }
                };
            }
        });
    }

    /**
     * フォームの本文を変更します。
     * @param texts 本文
     */
    public body(...texts: (string | RawMessage)[]): this {
        this.bodyText = {
            rawtext: texts.map((_, i) => {
                const rawMessage = (typeof _ === "string") ? { text: _ } : _;

                if (i < texts.length - 1) return {
                    rawtext: [
                        rawMessage,
                        { text: "\n" }
                    ]
                };
                else return rawMessage;
            })
        };
        return this;
    }

    /**
     * フォームにボタンを追加します。
     * @param button ボタン
     * @overload
     */
    public button(button: ActionButtonInput): this {
        this.values.push({
            name: button.name,
            iconPath: button.iconPath,
            tags: button.tags ?? [],
            callbacks: new Set(button.on ? [button.on] : undefined),
            type: "ACTION_BUTTON"
        } as ActionButton);
        return this;
    }

    public label(label: LabelInput): this {
        this.values.push({
            id: label.id,
            text: label.text,
            type: "LABEL"
        });
        return this;
    }

    public header(header: HeaderInput): this {
        this.values.push({
            id: header.id,
            text: header.text,
            type: "HEADER"
        });
        return this;
    }

    public divider(divider: DividerInput): this {
        this.values.push({
            id: divider.id,
            type: "DIVIDER"
        });
        return this;
    }

    /**
     * ボタンを押した際に発火するイベントのコールバックを登録します。
     * @param predicate ボタンの条件
     * @param callbackFn コールバック関数
     */
    public onPush(callbackFn: (event: ServerFormActionButtonPushEvent) => void): this {
        this.pushEventCallbacks.add(event => {
            callbackFn(event);
        });
        return this;
    }

    /**
     * フォームの要素の定義情報
     */
    public readonly elements: ActionFormElementDefinitions;

    public override open(player: Player): void {
        const form = new ActionFormData()
            .title(this.titleText);

        if (this.bodyText !== undefined) {
            form.body(this.bodyText);
        }

        for (const value of this.values) {
            if (ServerFormElementPredicates.isActionButton(value)) {
                form.button(value.name, value.iconPath);
            }
            else if (ServerFormElementPredicates.isLabel(value)) {
                form.label(value.text);
            }
            else if (ServerFormElementPredicates.isHeader(value)) {
                form.header(value.text);
            }
            else if (ServerFormElementPredicates.isDivider(value)) {
                form.divider();
            }
            else {
                throw new ServerFormError(new Error("無効な要素の型です: " + JSON.stringify(value)));
            }
        }

        // @ts-ignore "@minecraft/server"のPlayerと"@minecraft/server-ui"のPlayerが一致しないんだよねなんか
        const promise = form.show(player).then(response => {
            if (response.selection === undefined) {
                const that = this;

                const cancelEvent: ServerFormCancelEvent = {
                    player,
                    reason: response.cancelationReason as FormCancelationReason,
                    reopen() {
                        system.run(() => {
                            that.open(player);
                        });
                    }
                };

                this.cancelationCallbacks.get("Any")!.forEach(callbackFn => {
                    callbackFn(cancelEvent);
                });

                if (response.cancelationReason === "UserBusy") {
                    this.cancelationCallbacks.get("UserBusy")!.forEach(callbackFn => {
                        callbackFn(cancelEvent);
                    });
                }
                else if (response.cancelationReason === "UserClosed") {
                    this.cancelationCallbacks.get("UserClosed")!.forEach(callbackFn => {
                        callbackFn(cancelEvent);
                    });
                }

                return;
            }

            const button: ActionButton = this.values.filter(ServerFormElementPredicates.isActionButton)[response.selection]!;

            if (button.callbacks.size > 0) {
                button.callbacks.forEach(callbackFn => {
                    callbackFn(player);
                });
            }

            this.pushEventCallbacks.forEach(callbackFn => {
                callbackFn({ button, player })
            });
        });
        
        if (this.errorCatcherCallbacks.size > 0) {
            promise.catch(error => {
                this.errorCatcherCallbacks.forEach(catcher => {
                    catcher({
                        player,
                        error: new ServerFormError(error)
                    });
                });
            });
        }
    }
}

/**
 * `ModalFormData`をより直感的かつ簡潔に扱うことを目的としたクラス
 */
export class ModalFormWrapper extends ServerFormWrapper implements Submittable, Decoratable, DefinitionEnumerable<ModalFormElementDefinitions> {
    private readonly values: (ModalFormToggle | ModalFormSlider | ModalFormDropdown | ModalFormTextField | Label | Header | Divider)[] = [];

    private submitButtonInfo: SubmitButton = {
        name: { translate: "gui.submit" },
        on() {}
    };

    /**
     * `ModalFormWrapper`のインスタンスを生成します。
     */
    public constructor() {
        super();
        this.elements = undefined as unknown as ModalFormElementDefinitions;
        Object.defineProperty(this, "elements", {
            get: (): ModalFormElementDefinitions => {
                const that = this;
        
                function getElement(id: string): ModalFormElement | undefined {    
                    return that.values
                        .filter(ServerFormElementPredicates.isModalFormElement)
                        .find(value => (value as ModalFormElement).id === id) as (ModalFormElement | undefined);
                }
        
                return {
                    getToggle(id) {
                        const element = getElement(id);
                        return (ServerFormElementPredicates.isToggle(element)) ? element : undefined;
                    },
                    getSlider(id) {
                        const element = getElement(id);
                        return (ServerFormElementPredicates.isSlider(element)) ? element  : undefined;
                    },
                    getTextField(id) {
                        const element = getElement(id);
                        return (ServerFormElementPredicates.isTextField(element)) ? element : undefined;
                    },
                    getDropdown(id) {
                        const element = getElement(id);
                        return (ServerFormElementPredicates.isDropdown(element)) ? element : undefined;
                    },
                    getSubmitButton() {
                        return that.submitButtonInfo;
                    },
                    getElements<T extends ModalFormElement>(predicate?: (element: ModalFormElement) => element is T) {
                        const vals: T[] = [];
                        for (const val of that.values.filter(ServerFormElementPredicates.isModalFormElement)) {
                            const v = val as ModalFormElement;
                            if (predicate === undefined) {
                                vals.push(v as T);
                            }
                            else if (predicate(v)) {
                                vals.push(v);
                            }
                        }
                        return vals;
                    },
                    getLabel(id) {
                        return that.values
                            .filter(ServerFormElementPredicates.isLabel)
                            .find(label => label.id === id);
                    },
                    getHeader(id) {
                        return that.values
                            .filter(ServerFormElementPredicates.isHeader)
                            .find(header => header.id === id);
                    },
                    getDivider(id) {
                        return that.values
                            .filter(ServerFormElementPredicates.isDivider)
                            .find(divider => divider.id === id);
                    },
                    getAll() {
                        return that.values;
                    }
                };
            }
        })
    }

    /**
     * フォームにトグルを追加します。
     * @param toggle トグル
     * @overload
     */
    public toggle(toggle: ModalFormToggleInput): this {
        this.values.push({
            id: toggle.id,
            label: toggle.label,
            defaultValue: toggle.defaultValue ?? false,
            type: "MODAL_FORM_ELEMENT"
        });
        return this;
    }

    /**
     * フォームにスライダーを追加します。
     * @param slider スライダー
     * @overload
     */
    public slider(slider: ModalFormSliderInput): this {
        this.values.push({
            id: slider.id,
            label: slider.label,
            step: slider.step ?? 1,
            range: slider.range,
            defaultValue: slider.defaultValue ?? 0,
            type: "MODAL_FORM_ELEMENT"
        });
        return this;
    }

    /**
     * フォームにドロップダウンを追加します。
     * @param dropdown ドロップダウン
     * @overload
     */
    public dropdown(dropdown: ModalFormDropdownInput): this {
        this.values.push({
            id: dropdown.id,
            label: dropdown.label,
            list: dropdown.list,
            defaultValueIndex: dropdown.defaultValueIndex ?? 0,
            type: "MODAL_FORM_ELEMENT"
        });
        return this;
    }

    /**
     * フォームにテキストフィールドを追加します。
     * @param textField テキストフィールド
     * @overload
     */
    public textField(textField: ModalFormTextFieldInput): this {
        this.values.push({
            id: textField.id,
            label: textField.label,
            placeHolder: textField.placeHolder,
            defaultValue: textField.defaultValue ?? "",
            type: "MODAL_FORM_ELEMENT"
        });
        return this;
    }

    /**
     * 送信ボタンの設定を行います。
     * @param button 送信ボタン
     */
    public submitButton(button: SubmitButtonInput): this {
        this.submitButtonInfo = {
            name: button.name,
            on: button.on ?? (() => {})
        };
        return this;
    }

    public label(label: LabelInput): this {
        this.values.push({
            id: label.id,
            text: label.text,
            type: "LABEL"
        });
        return this;
    }

    public header(header: HeaderInput): this {
        this.values.push({
            id:  header.id,
            text: header.text,
            type: "HEADER"
        });
        return this;
    }

    public divider(divider: DividerInput): this {
        this.values.push({
            id: divider.id,
            type: "DIVIDER"
        });
        return this;
    }

    /**
     * フォームの要素の定義情報
     */
    public readonly elements: ModalFormElementDefinitions;

    public open(player: Player): void {        
        const form = new ModalFormData()
            .title(this.titleText)
            .submitButton(this.submitButtonInfo.name);
        
        for (const value of this.values) {
            if (ServerFormElementPredicates.isToggle(value)) {
                form.toggle(value.label, { defaultValue: value.defaultValue });
            }
            else if (ServerFormElementPredicates.isSlider(value)) {
                form.slider(value.label, value.range.min, value.range.max, { valueStep: value.step, defaultValue: value.defaultValue });
            }
            else if (ServerFormElementPredicates.isDropdown(value)) {
                form.dropdown(value.label, value.list.map(({ text }) => text), { defaultValueIndex: value.defaultValueIndex });
            }
            else if (ServerFormElementPredicates.isTextField(value)) {
                form.textField(value.label, value.placeHolder, { defaultValue: value.defaultValue });
            }
            else if (ServerFormElementPredicates.isLabel(value)) {
                form.label(value.text);
            }
            else if (ServerFormElementPredicates.isHeader(value)) {
                form.header(value.text);
            }
            else if (ServerFormElementPredicates.isDivider(value)) {
                form.divider();
            }
            else {
               throw new ServerFormError(new Error("無効なModalForm要素です"));
            }
        }

        // @ts-ignore "@minecraft/server"のPlayerと"@minecraft/server-ui"のPlayerが一致しないんだよねなんか
        const promise = form.show(player).then(response => {
            if (response.formValues === undefined) {
                const that = this;
                const cancelEvent: ServerFormCancelEvent = {
                    player,
                    reason: response.cancelationReason as FormCancelationReason,
                    reopen() {
                        system.run(() => {
                            that.open(player);
                        });
                    }
                };

                this.cancelationCallbacks.get("Any")!.forEach(callbackFn => {
                    callbackFn(cancelEvent);
                });

                if (response.cancelationReason === "UserBusy") {
                    this.cancelationCallbacks.get("UserBusy")!.forEach(callbackFn => {
                        callbackFn(cancelEvent);
                    });
                }
                else if (response.cancelationReason === "UserClosed") {
                    this.cancelationCallbacks.get("UserClosed")!.forEach(callbackFn => {
                        callbackFn(cancelEvent);
                    });
                }

                return;
            }

            const that = this;
            const elements = that.values.filter(ServerFormElementPredicates.isModalFormElement) as ModalFormElement[];

            function getMatchingElementIndex(id: string, predicate: (element: ModalFormElement) => boolean): number {
                const index = elements.findIndex(value => value.id === id);
                if (index === -1) {
                    throw new ServerFormError(new Error("指定されたIDの要素が見つかりませんでした"));
                }
                else if (predicate(elements[index]!)) return index;
                else {
                    throw new ServerFormError(new Error("指定されたIDの要素の型が正しくありません: " + JSON.stringify(elements) + ", " + predicate.toString() + ", " + id + ", " + index));
                }
            }

            const inputValues = response.formValues!.filter(x => x !== undefined);

            const submitEvent: ModalFormSubmitEvent = {
                player,
                getToggleInput(id) {
                    const index = getMatchingElementIndex(id, ServerFormElementPredicates.isToggle);
                    return inputValues[index] as boolean;
                },
                getSliderInput(id) {
                    const index = getMatchingElementIndex(id, ServerFormElementPredicates.isSlider);
                    return inputValues[index] as number;
                },
                getDropdownInput(id) {
                    const index = getMatchingElementIndex(id, ServerFormElementPredicates.isDropdown);
                    const optionIndex = inputValues[index] as number;
                    return {
                        index: optionIndex,
                        value: (elements[index] as ModalFormDropdown).list[optionIndex]
                    } as SelectedDropdownValue;
                },
                getTextFieldInput(id) {
                    const index = getMatchingElementIndex(id, ServerFormElementPredicates.isTextField);
                    return inputValues[index] as string;
                },
                getAllInputs() {
                    return inputValues
                        .map((formValue, index) => {
                            const value = elements[index];
                            return ServerFormElementPredicates.isDropdown(value)
                                ? ({ index: formValue as number, value: value.list[formValue as number] } as SelectedDropdownValue)
                                : formValue;
                        })
                        .filter(x => x !== undefined);
                }
            };

            this.submitButtonInfo.on(submitEvent);
        });

        if (this.errorCatcherCallbacks.size > 0) {
            promise.catch(error => {
                this.errorCatcherCallbacks.forEach(catcher => {
                    catcher({
                        player,
                        error: new ServerFormError(error)
                    });
                });
            });
        }
    }
}

/**
 * `MessageFormData`をより直感的かつ簡潔に扱うことを目的としたクラス
 */
export class MessageFormWrapper extends ServerFormWrapper implements MessagePushable, DefinitionEnumerable<MessageFormElementDefinitions> {
    private bodyText: string | RawMessage | undefined = undefined;

    private readonly buttonPair: [MessageButton, MessageButton] = [
        { name: "1", callbacks: new Set(), type: "MESSAGE_BUTTON" },
        { name: "2", callbacks: new Set(), type: "MESSAGE_BUTTON" }
    ];

    private readonly pushEventCallbacks: Set<(event: ServerFormMessageButtonPushEvent) => void> = new Set();

    /**
     * `MessageFormWrapper`のインスタンスを生成します。
     */
    public constructor() {
        super();
        this.elements = undefined as unknown as MessageFormElementDefinitions;
        Object.defineProperty(this, "elements", {
            get: (): MessageFormElementDefinitions => {
                const that = this;
                return {
                    getButtons() {
                        return that.buttonPair;
                    }
                };
            }
        });
    }

    /**
     * フォームの本文を変更します。
     * @param texts 本文
     */
    public body(...texts: (string | RawMessage)[]): this {
        this.bodyText = {
            rawtext: texts.map((_, i) => {
                const rawMessage = (typeof _ === "string") ? { text: _ } : _;

                if (i < texts.length - 1) return {
                    rawtext: [
                        rawMessage,
                        { text: "\n" }
                    ]
                };
                else return rawMessage;
            })
        };
        return this;
    }

    /**
     * フォームにボタン1を追加します。
     * @param button1 ボタン1
     */
    public button1(button1: MessageButtonInput): this {
        this.buttonPair[0] = {
            name: button1.name,
            callbacks: new Set(button1.on ? [button1.on] : undefined),
            type: "MESSAGE_BUTTON"
        };
        return this;
    }

    /**
     * フォームにボタン2を追加します。
     * @param button2 ボタン2
     */
    public button2(button2: MessageButtonInput): this {
        this.buttonPair[1] = {
            name: button2.name,
            callbacks: new Set(button2.on ? [button2.on] : undefined),
            type: "MESSAGE_BUTTON"
        };
        return this;
    }

    /**
     * ボタンを押した際に発火するイベントのコールバックを登録します。
     * @param callbackFn コールバック関数
     */
    public onPush(callbackFn: (event: ServerFormMessageButtonPushEvent) => void): this {
        this.pushEventCallbacks.add(callbackFn);
        return this;
    }

    /**
     * フォームのボタンの定義情報
     */
    public readonly elements: MessageFormElementDefinitions;

    public open(player: Player): void {    
        if (this.bodyText === undefined) {
            throw new ServerFormError(new Error("bodyが設定されていません"));
        }

        const form = new MessageFormData()
            .title(this.titleText)
            .body(this.bodyText)
            .button1(this.buttonPair[0].name)
            .button2(this.buttonPair[1].name);

        const promise = form.show(player).then(response => {
            if (response.selection === undefined) {
                const that = this;
                const cancelEvent: ServerFormCancelEvent = {
                    player,
                    reason: response.cancelationReason as FormCancelationReason,
                    reopen() {
                        system.run(() => {
                            that.open(player);
                        });
                    }
                };

                this.cancelationCallbacks.get("Any")!.forEach(callbackFn => {
                    callbackFn(cancelEvent);
                });

                if (response.cancelationReason === FormCancelationReason.UserBusy) {
                    this.cancelationCallbacks.get("UserBusy")!.forEach(callbackFn => {
                        callbackFn(cancelEvent);
                    });
                }
                else if (response.cancelationReason === FormCancelationReason.UserClosed) {
                    this.cancelationCallbacks.get("UserClosed")!.forEach(callbackFn => {
                        callbackFn(cancelEvent);
                    });
                }

                return;
            }

            if (response.selection === 0) {
                this.buttonPair[0].callbacks.forEach(callbackFn => {
                    callbackFn(player);
                });

                this.pushEventCallbacks.forEach(callbackFn => {
                    callbackFn({ button: { ...this.buttonPair[0] }, player });
                });
            }
            else {
                this.buttonPair[1].callbacks.forEach(callbackFn => {
                    callbackFn(player);
                });

                this.pushEventCallbacks.forEach(callbackFn => {
                    callbackFn({ button: { ...this.buttonPair[1] }, player });
                });
            }
        });
        
        if (this.errorCatcherCallbacks.size > 0) {
            promise.catch(error => {
                this.errorCatcherCallbacks.forEach(catcher => {
                    catcher({
                        player,
                        error: new ServerFormError(error)
                    });
                });
            });
        }
    }
}
