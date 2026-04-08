/**
 * TipTap Node extension for non-editable inline values.
 *
 * Renders locked values (amounts, days, percentages, dates) as styled badges
 * within the editor. Users can delete them, but regeneration restores them.
 *
 * Token format: {{type:value:display}}
 * Parsed from HTML: <span data-locked-value="..." data-locked-type="...">display</span>
 */

import { Node, mergeAttributes } from '@tiptap/core';
import { NodeSelection } from '@tiptap/pm/state';
import type { LockedValueType } from '$lib/utils/lockedValueTokens';

export const LockedValueNode = Node.create({
  name: 'lockedValue',

  atom: true,
  inline: true,
  group: 'inline',
  selectable: true,
  draggable: true,

  addKeyboardShortcuts() {
    const deleteIfSelected = () => {
      const { selection } = this.editor.state;
      if (selection instanceof NodeSelection && selection.node.type.name === this.name) {
        this.editor.commands.deleteSelection();
        return true;
      }
      return false;
    };
    return {
      Backspace: deleteIfSelected,
      Delete: deleteIfSelected,
    };
  },

  addAttributes() {
    return {
      type: {
        default: 'tekst',
        parseHTML: (element: HTMLElement) => element.getAttribute('data-locked-type'),
        renderHTML: (attributes: Record<string, string>) => ({
          'data-locked-type': attributes.type,
        }),
      },
      value: {
        default: '',
        parseHTML: (element: HTMLElement) => element.getAttribute('data-locked-value'),
        renderHTML: (attributes: Record<string, string>) => ({
          'data-locked-value': attributes.value,
        }),
      },
      display: {
        default: '',
        parseHTML: (element: HTMLElement) => element.textContent,
        renderHTML: () => ({}),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-locked-value]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-locked-value': node.attrs.value,
        'data-locked-type': node.attrs.type,
        class: `locked-value locked-value--${node.attrs.type}`,
        contenteditable: 'false',
      }),
      node.attrs.display,
    ];
  },
});

export default LockedValueNode;
