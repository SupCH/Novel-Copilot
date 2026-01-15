"use client";

import { useEffect, useRef, useState, useCallback, ReactNode } from "react";
import { createPortal } from "react-dom";
import { Copy, Clipboard, Scissors, Wand2, ChevronRight, RefreshCw, Minimize2, Maximize2, MessageSquare, User, Edit } from "lucide-react";

export interface ContextMenuItem {
    label?: string;  // Optional for separators
    icon?: ReactNode;
    shortcut?: string;
    onClick?: () => void;
    disabled?: boolean;
    danger?: boolean;
    children?: ContextMenuItem[];  // 子菜单
    separator?: boolean;  // 分隔线
}

interface ContextMenuProps {
    items: ContextMenuItem[];
    position: { x: number; y: number };
    onClose: () => void;
}

function ContextMenuContent({ items, position, onClose, isSubmenu = false }: ContextMenuProps & { isSubmenu?: boolean }) {
    const menuRef = useRef<HTMLDivElement>(null);
    const [submenuItem, setSubmenuItem] = useState<{ item: ContextMenuItem; rect: DOMRect } | null>(null);
    const [adjustedPosition, setAdjustedPosition] = useState(position);

    // 调整位置避免超出屏幕
    useEffect(() => {
        if (menuRef.current) {
            const rect = menuRef.current.getBoundingClientRect();
            const newPos = { ...position };

            if (rect.right > window.innerWidth) {
                newPos.x = isSubmenu ? position.x - rect.width - 8 : window.innerWidth - rect.width - 8;
            }
            if (rect.bottom > window.innerHeight) {
                newPos.y = window.innerHeight - rect.height - 8;
            }

            setAdjustedPosition(newPos);
        }
    }, [position, isSubmenu]);

    const handleItemClick = (item: ContextMenuItem) => {
        if (item.disabled) return;
        if (item.children) return; // 有子菜单的项点击无反应，需要悬停
        item.onClick?.();
        onClose();
    };

    const handleItemHover = (item: ContextMenuItem, e: React.MouseEvent<HTMLDivElement>) => {
        console.log("[ContextMenu] hover item:", item.label, "has children:", !!item.children, "disabled:", item.disabled);
        if (item.children && !item.disabled) {
            const rect = e.currentTarget.getBoundingClientRect();
            console.log("[ContextMenu] showing submenu at:", rect.right, rect.top);
            setSubmenuItem({ item, rect });
        } else if (!item.children) {
            setSubmenuItem(null);
        }
    };

    return (
        <div
            ref={menuRef}
            className="fixed z-[9999] min-w-[180px] py-1.5 rounded-lg border bg-popover/95 backdrop-blur-md shadow-xl animate-in fade-in-0 zoom-in-95 duration-100"
            style={{ left: adjustedPosition.x, top: adjustedPosition.y }}
            onClick={(e) => e.stopPropagation()}  // 阻止点击事件冒泡，避免触发关闭
        >
            {items.map((item, index) => {
                if (item.separator) {
                    return <div key={index} className="my-1 h-px bg-border" />;
                }

                return (
                    <div
                        key={index}
                        className={`
                            flex items-center gap-2 px-3 py-1.5 mx-1 rounded cursor-pointer text-sm
                            ${item.disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-accent"}
                            ${item.danger ? "text-destructive hover:bg-destructive/10" : ""}
                        `}
                        onClick={() => handleItemClick(item)}
                        onMouseEnter={(e) => handleItemHover(item, e)}
                    >
                        {item.icon && <span className="w-4 h-4 flex items-center justify-center">{item.icon}</span>}
                        <span className="flex-1">{item.label}</span>
                        {item.shortcut && (
                            <span className="text-xs text-muted-foreground">{item.shortcut}</span>
                        )}
                        {item.children && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                    </div>
                );
            })}

            {/* 子菜单 - 通过 Portal 渲染到 body */}
            {submenuItem && submenuItem.item.children && createPortal(
                <ContextMenuContent
                    items={submenuItem.item.children}
                    position={{
                        x: submenuItem.rect.right + 4,
                        y: submenuItem.rect.top - 6,
                    }}
                    onClose={onClose}
                    isSubmenu
                />,
                document.body
            )}
        </div>
    );
}

export function ContextMenu({ items, position, onClose }: ContextMenuProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // 点击外部关闭
    useEffect(() => {
        const handleClick = () => onClose();
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };

        document.addEventListener("click", handleClick);
        document.addEventListener("keydown", handleEsc);

        return () => {
            document.removeEventListener("click", handleClick);
            document.removeEventListener("keydown", handleEsc);
        };
    }, [onClose]);

    if (!mounted) return null;

    return createPortal(
        <ContextMenuContent items={items} position={position} onClose={onClose} />,
        document.body
    );
}

// 预定义的 AI 修改菜单项
export function getAIModifyMenuItems(
    selectedText: string,
    onModify: (action: string, text: string) => void
): ContextMenuItem {
    return {
        label: "AI 修改",
        icon: <Wand2 className="w-4 h-4" />,
        children: [
            {
                label: "重写",
                icon: <RefreshCw className="w-4 h-4" />,
                onClick: () => onModify("rewrite", selectedText),
            },
            {
                label: "精简",
                icon: <Minimize2 className="w-4 h-4" />,
                onClick: () => onModify("shorten", selectedText),
            },
            {
                label: "扩写",
                icon: <Maximize2 className="w-4 h-4" />,
                onClick: () => onModify("expand", selectedText),
            },
            { separator: true },
            {
                label: "改为正式语气",
                icon: <MessageSquare className="w-4 h-4" />,
                onClick: () => onModify("formal", selectedText),
            },
            {
                label: "改为轻松语气",
                icon: <MessageSquare className="w-4 h-4" />,
                onClick: () => onModify("casual", selectedText),
            },
            {
                label: "改为严肃语气",
                icon: <MessageSquare className="w-4 h-4" />,
                onClick: () => onModify("serious", selectedText),
            },
            { separator: true },
            {
                label: "自定义修改...",
                icon: <Edit className="w-4 h-4" />,
                onClick: () => {
                    const instruction = prompt("请输入修改指令：\n例如：改成更诗意的表达 / 添加更多细节 / 改成第一人称");
                    if (instruction && instruction.trim()) {
                        onModify(`custom:${instruction.trim()}`, selectedText);
                    }
                },
            },
        ],
    };
}

// 编辑器右键菜单的默认项
export function getEditorContextMenuItems(
    selectedText: string,
    onCopy: () => void,
    onCut: () => void,
    onPaste: () => void,
    onAIModify: (action: string, text: string) => void,
    characterNames?: string[],
    onViewCharacter?: (name: string) => void
): ContextMenuItem[] {
    const hasSelection = selectedText.length > 0;
    const isCharacter = characterNames?.includes(selectedText.trim());

    const items: ContextMenuItem[] = [
        {
            label: "复制",
            icon: <Copy className="w-4 h-4" />,
            shortcut: "Ctrl+C",
            onClick: onCopy,
            disabled: !hasSelection,
        },
        {
            label: "剪切",
            icon: <Scissors className="w-4 h-4" />,
            shortcut: "Ctrl+X",
            onClick: onCut,
            disabled: !hasSelection,
        },
        {
            label: "粘贴",
            icon: <Clipboard className="w-4 h-4" />,
            shortcut: "Ctrl+V",
            onClick: onPaste,
        },
        { separator: true },
        {
            ...getAIModifyMenuItems(selectedText, onAIModify),
            disabled: !hasSelection,
        },
    ];

    // 如果选中的是角色名，添加查看角色信息选项
    if (isCharacter && onViewCharacter) {
        items.push(
            { separator: true },
            {
                label: `查看「${selectedText.trim()}」信息`,
                icon: <User className="w-4 h-4" />,
                onClick: () => onViewCharacter(selectedText.trim()),
            }
        );
    }

    return items;
}
