// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { html, render } from 'lit-html';
import { createRef, ref } from 'lit-html/directives/ref.js'
import { styleMap, StyleInfo } from 'lit-html/directives/style-map.js';

interface InfobarProps {
    message: string;
}

export default class InfobarComponent {
    #buttonRef = createRef();
    #message: string;
    #container: HTMLElement | undefined;

    constructor(props: InfobarProps, container?: HTMLElement) {
        this.#message = props.message;
        this.#container = container;
        this.#update();
    }

    #update(styles?: StyleInfo) {
        let customStyles = styles ?? {
            display: 'flex'
        };

        if (!this.#container) {
            return;
        }
        render(this.template(customStyles), this.#container);
    }

    template(styles: StyleInfo) {
        return html`
            <div class="infobar" style=${styleMap(styles)}>
                <div class="infobar-message">${this.#message}</div>
                <button class="infobar-close-button" ${ref(this.#buttonRef)} @click=${this.#onClick}></button>
            </div>
        `;
    }

    #onClick = () => {
        let styles = {
            display: 'none',
        } as StyleInfo;

        this.#update(styles);
    };

    static render(props: InfobarProps, elementId: string) {
        const currentContainer = document.getElementById(elementId);
        if (currentContainer) {
            new InfobarComponent(props, currentContainer);
        }
    }
}
