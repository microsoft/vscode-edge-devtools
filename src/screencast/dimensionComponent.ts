// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import {html, render} from 'lit-html';
import {createRef, ref} from 'lit-html/directives/ref.js'

interface DimensionComponentProps {
    width: number;
    height: number;
    heightOffset?: number;
    onUpdateDimensions: (width: number, height: number) => void;
}

let component: DimensionComponent;
export default class DimensionComponent {
    textInputWidth = createRef();
    textInputHeight = createRef();
    width: number;
    height: number;
    heightOffset: number;
    updateOnResize = true;
    disableUserDimensionInputs = false;
    onUpdateDimensions: (width: number, height: number) => void;
    container: HTMLElement | undefined;

    // sampling the canvas element doesn't consistently fire `resize` event
    screenCastView = document.getElementById('main');

    constructor(props: DimensionComponentProps, container?: HTMLElement) {
        this.heightOffset = props.heightOffset || 0;
        this.width = props.width;
        this.height = props.height - this.heightOffset;
        this.onUpdateDimensions = props.onUpdateDimensions;
        this.container = container;

        window.addEventListener('resize', this.#onResize);

        this.update();
        this.onUpdateDimensions(this.width, this.height);
    }

    template() {
        return html`
            <input
                ${ref(this.textInputWidth)}
                type="number"
                title="Width"
                @blur=${this.#onBlur}
                @keydown=${this.#onKeyDown}
                .disabled=${this.disableUserDimensionInputs}
                .value=${this.width.toString()} /> 
            <i class="codicon codicon-close"></i>
            <input
                ${ref(this.textInputHeight)}
                type="number"
                title="Height"
                @blur=${this.#onBlur}
                @keydown=${this.#onKeyDown}
                .disabled=${this.disableUserDimensionInputs}
                .value=${this.height.toString()} /> 
            <button title="Rotate" @click=${this.#onRotate}>
                <i class="codicon codicon-arrow-swap"></i>
            </button>
        `;
    }

    update() {
        if (!this.container) {
            return;
        }
        render(this.template(), this.container); 
    }

    #onKeyDown = (e: KeyboardEvent) => {
        if (e.code !== 'Enter') {
            return;
        }
        this.#onBlur(e);
    }

    #onBlur = (e: Event) => {
        if (!e.target) {
            return;
        }

        const oldWidth = this.width;
        const oldHeight = this.height;

        if (e.target === this.textInputWidth.value) {
            this.width = parseInt((this.textInputWidth.value as HTMLInputElement).value);
        } else if (e.target === this.textInputHeight.value) {
            this.height = parseInt((this.textInputHeight.value as HTMLInputElement).value);
        }

        if (this.width === oldWidth && this.height === oldHeight) {
            return;
        }

        this.update();
        this.onUpdateDimensions(this.width, this.height);
    }

    #onResize = () => {
        if (!this.screenCastView || !this.updateOnResize) {
            return;
        }

        this.width = this.screenCastView.offsetWidth;
        this.height = this.screenCastView.offsetHeight - this.heightOffset;

        this.update();
        this.onUpdateDimensions(this.width, this.height);
    }

    #onRotate = () => {
        const temp = this.width;
        this.width = this.height;
        this.height = temp;

        this.update();
        this.onUpdateDimensions(this.width, this.height);
    }

    #setDimensionState(width: number, height: number, updateOnResize: boolean, disableInputs: boolean) {
        this.width = width;
        this.height = height;
        this.updateOnResize = updateOnResize;
        this.disableUserDimensionInputs = disableInputs;

        this.update();
    }

    static render(props: DimensionComponentProps, elementId: string) {
        const dimensionContainer = document.getElementById(elementId);
        if (dimensionContainer) {
            component = new DimensionComponent(props, dimensionContainer);
        }
    } 

    static setDimensionState(width: number, height: number, updateOnResize: boolean, disableInputs: boolean) {
        component.#setDimensionState(width, height, updateOnResize, disableInputs);
    }
}
