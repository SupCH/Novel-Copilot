import { Mark, mergeAttributes } from "@tiptap/core";

export interface CharacterMentionOptions {
    HTMLAttributes: Record<string, unknown>;
}

declare module "@tiptap/core" {
    interface Commands<ReturnType> {
        characterMention: {
            setCharacterMention: (attributes: { name: string }) => ReturnType;
            unsetCharacterMention: () => ReturnType;
        };
    }
}

export const CharacterMention = Mark.create<CharacterMentionOptions>({
    name: "characterMention",

    addOptions() {
        return {
            HTMLAttributes: {},
        };
    },

    addAttributes() {
        return {
            name: {
                default: null,
                parseHTML: (element) => element.getAttribute("data-character-name"),
                renderHTML: (attributes) => {
                    if (!attributes.name) return {};
                    return { "data-character-name": attributes.name };
                },
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: "span[data-character-name]",
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return [
            "span",
            mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
                class: "character-mention",
                style: "text-decoration: underline; text-decoration-style: dotted; text-underline-offset: 3px; cursor: pointer;",
            }),
            0,
        ];
    },

    addCommands() {
        return {
            setCharacterMention:
                (attributes) =>
                    ({ commands }) => {
                        return commands.setMark(this.name, attributes);
                    },
            unsetCharacterMention:
                () =>
                    ({ commands }) => {
                        return commands.unsetMark(this.name);
                    },
        };
    },
});

// 工具函数：在文本中查找并标记角色名
export function findCharacterMentions(text: string, characterNames: string[]): Array<{ from: number; to: number; name: string }> {
    const mentions: Array<{ from: number; to: number; name: string }> = [];

    // 按名字长度降序排列，优先匹配长名字
    const sortedNames = [...characterNames].sort((a, b) => b.length - a.length);

    for (const name of sortedNames) {
        if (!name || name.length < 2) continue;

        let startIndex = 0;
        while (true) {
            const index = text.indexOf(name, startIndex);
            if (index === -1) break;

            // 检查是否已被其他 mention 覆盖
            const overlaps = mentions.some(
                (m) => (index >= m.from && index < m.to) || (index + name.length > m.from && index + name.length <= m.to)
            );

            if (!overlaps) {
                mentions.push({
                    from: index,
                    to: index + name.length,
                    name,
                });
            }

            startIndex = index + 1;
        }
    }

    // 按位置排序
    return mentions.sort((a, b) => a.from - b.from);
}
