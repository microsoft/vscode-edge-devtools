// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import {html, render} from 'lit-html';
import {createRef, ref} from 'lit-html/directives/ref.js'
import {styleMap, StyleInfo} from 'lit-html/directives/style-map.js';

export enum OffsetDirection {
    Right = 'Right',
    Left = 'Left'
}

export interface MenuItem {
    name: string;
    value: string;
}

export interface MenuItemSection {
    onItemSelected: (value: string) => void;
    selectedItem?: string;
    menuItems: MenuItem[];
}

interface FlyoutMenuProps {
    iconName: string;
    title: string;
    displayCurrentSelection?: boolean;
    globalSelectedItem?: string;
    offsetDirection?: OffsetDirection.Left | OffsetDirection.Right;
    menuItemSections: MenuItemSection[];
}

export default class FlyoutMenuComponent {
    #buttonRef = createRef();
    #globalSelectedItem: string | undefined;
    #iconName: string;
    #title: string;
    #container: HTMLElement | undefined;
    #offsetDirection: OffsetDirection = OffsetDirection.Left;
    #displayCurrentSelection = false;
    #menuItemSections: MenuItemSection[];

    constructor(props: FlyoutMenuProps, container?: HTMLElement) {
        this.#globalSelectedItem = props.globalSelectedItem;
        this.#iconName = props.iconName;
        this.#title = props.title;
        this.#menuItemSections = props.menuItemSections;
        this.#container = container;

        if (props.offsetDirection) {
            this.#offsetDirection = props.offsetDirection;
        }

        if (props.displayCurrentSelection) {
            this.#displayCurrentSelection = props.displayCurrentSelection;
        }

        this.#update();
    }

    #onItemSelected = (value: string, sectionIndex: number, fn: (value: string) => void) => {
        return () => {
            fn(value);
            if (this.#globalSelectedItem) {
                this.#globalSelectedItem = value;
                this.#update();
            } else {
                this.#menuItemSections[sectionIndex].selectedItem = value;
            }
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

    #closeMenu = () => {
        document.getElementById('popover')!.style.display = 'none';
        document.body.removeEventListener('mousedown', this.#closeMenu);
    }

    #menuSectionTemplate(menuItemSection: MenuItemSection, menuItemSectionIndex: number) {
        const renderedMenuItems = menuItemSection.menuItems.map((item, i) => {
            let isSelected = false;
            if (this.#globalSelectedItem) {
                isSelected = this.#globalSelectedItem === item.value;
            } else {
                isSelected = menuItemSection.selectedItem ?
                    item.value === menuItemSection.selectedItem : i === 0;
            }
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
            <button ${ref(this.#buttonRef)} @click=${this.#onClick} .title=${this.#title}>
                ${this.#displayCurrentSelection
                    ? html`${this.#getTitleFromMenuItemSections(this.#globalSelectedItem)}`
                    : ''
                }
                <i class='codicon ${this.#iconName}'></i>
            </button>
        `;
    }

    #getTitleFromMenuItemSections(value: string | undefined) {
        if (!value) {
            return '';
        }
        for (const section of this.#menuItemSections) {
            for (const entry of section.menuItems) {
                if (value === entry.value) {
                    return entry.name;
                }
            }
        }
        return '';
    }

    static render(props: FlyoutMenuProps, elementId: string) {
        const flyoutMenuContainer = document.getElementById(elementId);
        if (flyoutMenuContainer) {
            new FlyoutMenuComponent(props, flyoutMenuContainer);
        }
    } 
}
