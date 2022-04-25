// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import {html, render} from 'lit-html';

interface DimensionComponentProps {
    width: number;
    height: number;
    heightOffset?: number;
    onUpdateDimensions: (width: number, height: number) => void;
}

let component: DimensionComponent;
export default class DimensionComponent {
    width: number;
    height: number;
    heightOffset: number;
    updateOnResize = false;
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

        window.addEventListener('resize', this.#onResize.bind(this));

        this.update();
    }

    template() {
        return html`
            <input type="number" .value=${this.width.toString()} /> 
            <i class="codicon codicon-close"></i>
            <input type="number" .value=${this.height.toString()} /> 
            <button @click=${this.#onRotate}>
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

    #onResize() {
        if (!this.screenCastView || !this.updateOnResize) {
            return;
        }

        this.width = this.screenCastView.offsetWidth;
        this.height = this.screenCastView.offsetHeight - this.heightOffset;

        this.update();
    }

    #onRotate = () => {
        const temp = this.width;
        this.width = this.height;
        this.height = temp;

        this.update();
        this.onUpdateDimensions(this.width, this.height);
    }

    #setDimensionState(width: number, height: number, updateOnResize: boolean) {
        this.width = width;
        this.height = height;
        this.updateOnResize = updateOnResize;

        this.update();
    }

    static render(props: DimensionComponentProps, elementId: string) {
        const dimensionContainer = document.getElementById(elementId);
        if (dimensionContainer) {
            component = new DimensionComponent(props, dimensionContainer);
        }
    } 

    static setDimensionState(width: number, height: number, updateOnResize: boolean) {
        component.#setDimensionState(width, height, updateOnResize);
    }
}
