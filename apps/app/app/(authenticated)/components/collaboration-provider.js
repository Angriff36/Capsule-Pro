"use client";

Object.defineProperty(exports, "__esModule", { value: true });
exports.CollaborationProvider = void 0;
const room_1 = require("@repo/collaboration/room");
const get_1 = require("@/app/actions/users/get");
const search_1 = require("@/app/actions/users/search");
const CollaborationProvider = ({ orgId, children }) => {
  const resolveUsers = async ({ userIds }) => {
    const response = await (0, get_1.getUsers)(userIds);
    if ("error" in response) {
      throw new Error("Problem resolving users");
    }
    return response.data;
  };
  const resolveMentionSuggestions = async ({ text }) => {
    const response = await (0, search_1.searchUsers)(text);
    if ("error" in response) {
      throw new Error("Problem resolving mention suggestions");
    }
    return response.data;
  };
  return (
    <room_1.Room
      authEndpoint="/api/collaboration/auth"
      fallback={
        <div className="px-3 text-muted-foreground text-xs">Loading...</div>
      }
      id={`${orgId}:presence`}
      resolveMentionSuggestions={resolveMentionSuggestions}
      resolveUsers={resolveUsers}
    >
      {children}
    </room_1.Room>
  );
};
exports.CollaborationProvider = CollaborationProvider;
