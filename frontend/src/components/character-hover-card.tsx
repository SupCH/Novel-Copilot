"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { User, Heart, MapPin, Briefcase, Star, Edit2, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface CharacterData {
    name: string;
    avatar_url?: string;
    thumbnail_url?: string;
    traits?: string;           // 身体特征
    personality?: string;      // 性格
    role?: string;             // 职业/角色
    hobbies?: string;          // 爱好
    likes?: string;            // 喜欢的事物
    residence?: string;        // 住所
    other?: string;            // 其他重要信息
    relationships?: Array<{
        name: string;
        relation: string;
        attitude?: string;
        affection?: string;
    }>;
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3506";

interface CharacterHoverCardProps {
    character: CharacterData;
    position: { x: number; y: number };
    onClose: () => void;
    onSave?: (data: CharacterData) => void;
}

export function CharacterHoverCard({ character, position, onClose, onSave }: CharacterHoverCardProps) {
    const [mounted, setMounted] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState(character);
    const cardRef = useRef<HTMLDivElement>(null);
    // 初始位置设置为屏幕外，等测量完成后再移到正确位置
    const [adjustedPosition, setAdjustedPosition] = useState({ x: -9999, y: -9999 });
    const [isPositioned, setIsPositioned] = useState(false);
    const [imgError, setImgError] = useState(false);

    const displayUrl = character.thumbnail_url
        ? `${API_BASE}${character.thumbnail_url}`
        : character.avatar_url;
    const hasAvatar = displayUrl && !imgError;

    useEffect(() => {
        setMounted(true);
    }, []);

    // 智能调整位置，确保完全显示在视口内
    useEffect(() => {
        if (!cardRef.current || !mounted) return;

        // 使用 setTimeout 确保 DOM 已完全渲染
        const timer = setTimeout(() => {
            if (!cardRef.current) return;

            const rect = cardRef.current.getBoundingClientRect();
            const padding = 16;
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            // 使用实际尺寸计算
            const cardWidth = rect.width;
            const cardHeight = rect.height;

            let x = position.x;
            let y = position.y;

            // 计算各方向的可用空间
            const spaceRight = viewportWidth - position.x - padding;
            const spaceLeft = position.x - padding;
            const spaceBottom = viewportHeight - position.y - padding;
            const spaceTop = position.y - padding;

            // 水平方向：优先显示在右边，空间不足则显示在左边
            if (cardWidth <= spaceRight) {
                x = position.x;
            } else if (cardWidth <= spaceLeft) {
                x = position.x - cardWidth;
            } else {
                // 两边都放不下，居中显示
                x = Math.max(padding, (viewportWidth - cardWidth) / 2);
            }

            // 确保不超出左右边界
            x = Math.max(padding, Math.min(x, viewportWidth - cardWidth - padding));

            // 垂直方向：优先显示在下方，空间不足则显示在上方
            if (cardHeight + 10 <= spaceBottom) {
                y = position.y + 10;
            } else if (cardHeight + 10 <= spaceTop) {
                y = position.y - cardHeight - 10;
            } else {
                // 上下都放不下，从顶部开始显示
                y = padding;
            }

            // 确保不超出上下边界
            y = Math.max(padding, Math.min(y, viewportHeight - cardHeight - padding));

            setAdjustedPosition({ x, y });
            setIsPositioned(true);
        }, 50);

        return () => clearTimeout(timer);
    }, [position, mounted]);

    const handleSave = () => {
        onSave?.(editData);
        setIsEditing(false);
    };

    const updateField = (field: keyof CharacterData, value: string) => {
        setEditData(prev => ({ ...prev, [field]: value }));
    };

    // 点击外部关闭
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [onClose]);

    if (!mounted) return null;

    const content = (
        <div
            ref={cardRef}
            className="fixed z-[99999] w-80 max-h-[80vh] overflow-y-auto rounded-xl border bg-popover backdrop-blur-lg shadow-2xl transition-opacity duration-150"
            style={{
                left: adjustedPosition.x,
                top: adjustedPosition.y,
                opacity: isPositioned ? 1 : 0,
            }}
        >
            {/* 头部 */}
            <div className="p-4 border-b bg-gradient-to-r from-primary/10 to-transparent rounded-t-xl">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden shrink-0 border">
                            {hasAvatar ? (
                                <img
                                    src={displayUrl}
                                    alt={character.name}
                                    className="h-full w-full object-cover"
                                    onError={() => setImgError(true)}
                                />
                            ) : (
                                <User className="w-5 h-5 text-primary" />
                            )}
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg">{character.name}</h3>
                            {character.role && (
                                <span className="text-xs text-muted-foreground">{character.role}</span>
                            )}
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                    >
                        {isEditing ? <Save className="h-4 w-4" /> : <Edit2 className="h-4 w-4" />}
                    </Button>
                </div>
            </div>

            {/* 内容 */}
            <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
                {/* 基本信息 */}
                {(character.traits || isEditing) && (
                    <InfoRow
                        icon={<User className="w-4 h-4" />}
                        label="特征"
                        value={editData.traits || ""}
                        isEditing={isEditing}
                        onChange={(v) => updateField("traits", v)}
                    />
                )}

                {(character.personality || isEditing) && (
                    <InfoRow
                        icon={<Heart className="w-4 h-4" />}
                        label="性格"
                        value={editData.personality || ""}
                        isEditing={isEditing}
                        onChange={(v) => updateField("personality", v)}
                    />
                )}

                {(character.residence || isEditing) && (
                    <InfoRow
                        icon={<MapPin className="w-4 h-4" />}
                        label="住所"
                        value={editData.residence || ""}
                        isEditing={isEditing}
                        onChange={(v) => updateField("residence", v)}
                    />
                )}

                {(character.hobbies || isEditing) && (
                    <InfoRow
                        icon={<Star className="w-4 h-4" />}
                        label="爱好"
                        value={editData.hobbies || ""}
                        isEditing={isEditing}
                        onChange={(v) => updateField("hobbies", v)}
                    />
                )}

                {(character.other || isEditing) && (
                    <InfoRow
                        icon={<Briefcase className="w-4 h-4" />}
                        label="其他"
                        value={editData.other || ""}
                        isEditing={isEditing}
                        onChange={(v) => updateField("other", v)}
                    />
                )}

                {/* 关系网络 */}
                {character.relationships && character.relationships.length > 0 && (
                    <div className="pt-2 border-t">
                        <h4 className="text-xs font-medium text-muted-foreground mb-2">关系网络</h4>
                        <div className="space-y-1.5">
                            {character.relationships.map((rel, i) => (
                                <div key={i} className="flex items-center justify-between text-sm bg-muted/30 rounded px-2 py-1">
                                    <span className="font-medium">{rel.name}</span>
                                    <span className="text-muted-foreground">{rel.relation}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* 取消编辑按钮 */}
            {isEditing && (
                <div className="p-2 border-t flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => { setEditData(character); setIsEditing(false); }}>
                        <X className="h-4 w-4 mr-1" /> 取消
                    </Button>
                    <Button size="sm" onClick={handleSave}>
                        <Save className="h-4 w-4 mr-1" /> 保存
                    </Button>
                </div>
            )}
        </div>
    );

    return createPortal(content, document.body);
}

// 信息行组件
function InfoRow({
    icon,
    label,
    value,
    isEditing,
    onChange
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    isEditing: boolean;
    onChange: (value: string) => void;
}) {
    if (!value && !isEditing) return null;

    return (
        <div className="flex items-start gap-2">
            <span className="text-muted-foreground mt-0.5">{icon}</span>
            <div className="flex-1">
                <span className="text-xs text-muted-foreground">{label}</span>
                {isEditing ? (
                    <Input
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        className="h-7 text-sm mt-0.5"
                    />
                ) : (
                    <p className="text-sm">{value}</p>
                )}
            </div>
        </div>
    );
}
