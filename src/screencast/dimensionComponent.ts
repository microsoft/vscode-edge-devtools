// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import {html, render} from 'lit-html';

interface DimensionComponentProps {
    width: number;
    height: number;
    heightOffset?: number;
    onRotate: () => void;
}

export default class DimensionComponent {
    width: number;
    height: number;
    heightOffset: number;
    onRotate: () => void;
    container: HTMLElement | undefined;

    // sampling the canvas element doesn't consistently fire `resize` event
    screenCastView = document.getElementById('main');

    constructor(props: DimensionComponentProps, container?: HTMLElement) {
        this.heightOffset = props.heightOffset || 0;
        this.width = props.width;
        this.height = props.height - this.heightOffset;
        this.onRotate = props.onRotate;
        this.container = container;

        window.addEventListener('resize', this.onResize.bind(this));

        this.update();
    }

    template() {
        return html`
            <input type="number" .value=${this.width.toString()} /> 
            <i class="codicon codicon-close"></i>
            <input type="number" .value=${this.height.toString()} /> 
            <button @click=${this.onRotate}>
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

    onResize() {
        if (!this.screenCastView) {
            return;
        }

        this.width = this.screenCastView.offsetWidth;
        this.height = this.screenCastView.offsetHeight - this.heightOffset;

        this.update();
    }

    static render(props: DimensionComponentProps, elementId: string) {
        const dimensionContainer = document.getElementById(elementId);
        if (dimensionContainer) {
            new DimensionComponent(props, dimensionContainer);
        }
    } 
}
