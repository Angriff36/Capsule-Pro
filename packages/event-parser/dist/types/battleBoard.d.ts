export type BattleBoardMeta = {
    eventName: string;
    eventNumber: string;
    eventDate: string;
    staffRestrooms: string;
    staffParking: string;
    lastUpdatedISO?: string;
};
export type BattleBoardStaff = {
    name: string;
    role: string;
    shiftStart: string;
    shiftEnd: string;
    station: string;
};
export type BattleBoardLayout = {
    type: string;
    instructions: string;
    linkedMapImage?: string;
};
export type TimelineStyle = "setup" | "service" | "breakdown" | "other";
export type BattleBoardTimeline = {
    time: string;
    item: string;
    team: string;
    location: string;
    style: TimelineStyle | string;
    notes: string;
    hl: boolean;
};
export type BattleBoardAttachment = {
    label: string;
    name: string;
    type: string;
    size: number;
    src: string;
};
export type BattleBoardTask = {
    id: string;
    name: string;
    description: string;
    category: string;
    defaultTeam: string;
    defaultLocation: string;
    defaultStyle: TimelineStyle;
};
export type BattleBoardData = {
    schema?: string;
    version?: string;
    meta: BattleBoardMeta;
    staff: BattleBoardStaff[];
    layouts: BattleBoardLayout[];
    timeline: BattleBoardTimeline[];
    attachments: BattleBoardAttachment[];
    taskLibrary?: BattleBoardTask[];
};
export type PartialBattleBoardData = Partial<BattleBoardData> & {
    meta?: Partial<BattleBoardMeta>;
};
export declare const DEFAULT_TASK_LIBRARY: BattleBoardTask[];
//# sourceMappingURL=battleBoard.d.ts.map