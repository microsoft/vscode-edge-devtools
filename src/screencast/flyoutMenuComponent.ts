// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import {html, render} from 'lit-html';
import {createRef, ref} from 'lit-html/directives/ref.js';
import {styleMap, StyleInfo} from 'lit-html/directives/style-map.js';

export enum OffsetDirection {
    Right = 'Right',
    Left = 'Left'
}

interface MenuItem {
    name: string;
    value: string;
}

interface MenuItemSection {
    onItemSelected: (value: string) => void;
    selectedItem?: string;
    menuItems: MenuItem[];
}

interface FlyoutMenuProps {
    title?: string;
    iconName: string;
    offsetDirection?: OffsetDirection.Left | OffsetDirection.Right;
    menuItemSections: MenuItemSection[];
}

export default class FlyoutMenuComponent {
    #buttonRef = createRef();
    #title: string | undefined;
    #iconName: string;
    #container: HTMLElement | undefined;
    #offsetDirection: OffsetDirection = OffsetDirection.Left;
    #menuItemSections: MenuItemSection[];

    constructor(props: FlyoutMenuProps, container?: HTMLElement) {
        this.#title = props.title || undefined;
        this.#iconName = props.iconName;
        this.#menuItemSections = props.menuItemSections;
        this.#container = container;

        if (props.offsetDirection) {
            this.#offsetDirection = props.offsetDirection;
        }

        this.#update();
    }

    #onItemSelected = (value: string, sectionIndex: number, fn: (value: string) => void) => {
        return () => {
            fn(value);
            this.#menuItemSections[sectionIndex].selectedItem = value;
        }
    }

    #onClick = () => {
        const thisComponent = this.#buttonRef.value;
        const boundingRect = thisComponent!.getBoundingClientRect();

        let styles = {
            display: 'block',
            position: 'absolute',
        } as StyleInfo;

        render(this.#menuTemplate(styles), document.body);

        const popoverElement = document.getElementById('popover');
        styles.top = Math.min(boundingRect.top - popoverElement!.offsetHeight).toString() + 'px';

        if (this.#offsetDirection === OffsetDirection.Left) {
            styles.left = Math.min(boundingRect.left).toString() + 'px';
        } else if (this.#offsetDirection === OffsetDirection.Right) {
            styles.right = Math.min(document.body.offsetWidth - boundingRect.right).toString() + 'px';
        }

        render(this.#menuTemplate(styles), document.body);
        document.body.addEventListener('mousedown', this.#closeMenu)

    };

    #closeMenu = (e: Event) => {
        document.getElementById('popover')!.style.display = 'none';
        document.body.removeEventListener('mousedown', this.#closeMenu);
    }

    #menuSectionTemplate(menuItemSection: MenuItemSection, menuItemSectionIndex: number) {
        const renderedMenuItems = menuItemSection.menuItems.map((item, i) => {
            const isSelected = menuItemSection.selectedItem ?
                item.value === menuItemSection.selectedItem : i === 0;
            return html`
                <li @mousedown=${this.#onItemSelected(item.value, menuItemSectionIndex, menuItemSection.onItemSelected)}>
                    <i class='codicon codicon-check' style=${styleMap({
                        visibility: isSelected ? 'visible' : 'hidden'
                    })}></i>
                    ${item.name}
                </li>
            `;
        });

        return html`
            <ul>${renderedMenuItems}</ul>
        `
    }

    #menuTemplate(styles: StyleInfo) {
        let partials = [];
        for (let i = 0; i < this.#menuItemSections.length; i++) {
            const section = this.#menuItemSections[i];
            partials.push(this.#menuSectionTemplate(section, i));
            if (i !== this.#menuItemSections.length - 1) {
                partials.push(html`<hr />`)
            }
        }
        return html`
            <div id='popover' style=${styleMap(styles)}>
                ${partials}
            </div>
        `;
    }

    #update() {
        if (!this.#container) {
            return;
        }
        render(this.template(), this.#container); 
    }

    template() {
        return html`
            <button ${ref(this.#buttonRef)} @click=${this.#onClick}>
                ${this.#title
                    ? html`${this.#title}`
                    : ''
                }
                <i class='codicon ${this.#iconName}'></i>
            </button>
        `;
    }

    static render(props: FlyoutMenuProps, elementId: string) {
        const flyoutMenuContainer = document.getElementById(elementId);
        if (flyoutMenuContainer) {
            new FlyoutMenuComponent(props, flyoutMenuContainer);
        }
    } 
}
