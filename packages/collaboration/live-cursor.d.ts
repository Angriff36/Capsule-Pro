type CursorProps = {
  x: number;
  y: number;
  color: string;
  name: string;
};
declare function Cursor({
  x,
  y,
  color,
  name,
}: CursorProps): import("react").JSX.Element;
export declare const LiveCursor: import("react").MemoExoticComponent<
  typeof Cursor
>;
//# sourceMappingURL=live-cursor.d.ts.map
