import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export interface CharacterHighlightOptions {
    characterNames: string[];
}

// 存储当前角色名列表的全局变量（用于动态更新）
let currentCharacterNames: string[] = [];

// 更新角色名列表的函数
export function updateCharacterNames(names: string[]) {
    currentCharacterNames = names;
}

// 获取当前角色名列表
export function getCharacterNames(): string[] {
    return currentCharacterNames;
}

export const CharacterHighlight = Extension.create<CharacterHighlightOptions>({
    name: "characterHighlight",

    addOptions() {
        return {
            characterNames: [],
        };
    },

    addProseMirrorPlugins() {
        return [
            new Plugin({
                key: new PluginKey("characterHighlight"),
                props: {
                    decorations: (state) => {
                        // 使用全局变量中的角色名列表
                        const characterNames = getCharacterNames();

                        if (!characterNames || characterNames.length === 0) {
                            return DecorationSet.empty;
                        }

                        const decorations: Decoration[] = [];
                        const doc = state.doc;

                        // 按名字长度降序排列，优先匹配长名字
                        const sortedNames = [...characterNames].sort((a, b) => b.length - a.length);

                        doc.descendants((node, pos) => {
                            if (!node.isText || !node.text) return;

                            const text = node.text;
                            const usedRanges: Array<{ from: number; to: number }> = [];

                            for (const name of sortedNames) {
                                if (!name || name.length < 2) continue;

                                let startIndex = 0;
                                while (true) {
                                    const index = text.indexOf(name, startIndex);
                                    if (index === -1) break;

                                    const from = pos + index;
                                    const to = from + name.length;

                                    // 检查是否与已有范围重叠
                                    const overlaps = usedRanges.some(
                                        (r) => (from >= r.from && from < r.to) || (to > r.from && to <= r.to)
                                    );

                                    if (!overlaps) {
                                        usedRanges.push({ from, to });
                                        decorations.push(
                                            Decoration.inline(from, to, {
                                                class: "character-name",
                                                "data-character-name": name,
                                                // 可交互样式：下划线 + 鼠标指针
                                                style: "border-bottom: 1px solid #888; padding-bottom: 1px; cursor: pointer;",
                                            })
                                        );
                                    }

                                    startIndex = index + 1;
                                }
                            }

                            return true;
                        });

                        return DecorationSet.create(doc, decorations);
                    },
                },
            }),
        ];
    },
});
