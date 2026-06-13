export interface BattleBoardMeta {
    eventDate: string;
    eventName: string;
    eventNumber: string;
    lastUpdatedISO?: string;
    staffParking: string;
    staffRestrooms: string;
}
export interface BattleBoardStaff {
    name: string;
    role: string;
    shiftEnd: string;
    shiftStart: string;
    station: string;
}
export interface BattleBoardLayout {
    instructions: string;
    linkedMapImage?: string;
    type: string;
}
export type TimelineStyle = "setup" | "service" | "breakdown" | "other";
export interface BattleBoardTimeline {
    hl: boolean;
    item: string;
    location: string;
    notes: string;
    style: TimelineStyle | string;
    team: string;
    time: string;
}
export interface BattleBoardAttachment {
    label: string;
    name: string;
    size: number;
    src: string;
    type: string;
}
export interface BattleBoardTask {
    category: string;
    defaultLocation: string;
    defaultStyle: TimelineStyle;
    defaultTeam: string;
    description: string;
    id: string;
    name: string;
}
export interface BattleBoardData {
    attachments: BattleBoardAttachment[];
    layouts: BattleBoardLayout[];
    meta: BattleBoardMeta;
    schema?: string;
    staff: BattleBoardStaff[];
    taskLibrary?: BattleBoardTask[];
    timeline: BattleBoardTimeline[];
    version?: string;
}
export type PartialBattleBoardData = Partial<BattleBoardData> & {
    meta?: Partial<BattleBoardMeta>;
};
export declare const DEFAULT_TASK_LIBRARY: BattleBoardTask[];
//# sourceMappingURL=battleBoard.d.ts.map