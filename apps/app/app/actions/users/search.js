"use server";

var __importDefault =
  (this && this.__importDefault) ||
  ((mod) => (mod && mod.__esModule ? mod : { default: mod }));
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchUsers = void 0;
const server_1 = require("@repo/auth/server");
const fuse_js_1 = __importDefault(require("fuse.js"));
const getName = (user) => {
  let name = user.publicUserData?.firstName;
  if (name && user.publicUserData?.lastName) {
    name = `${name} ${user.publicUserData.lastName}`;
  } else if (!name) {
    name = user.publicUserData?.identifier;
  }
  return name;
};
const searchUsers = async (query) => {
  try {
    const { orgId } = await (0, server_1.auth)();
    if (!orgId) {
      throw new Error("Not logged in");
    }
    const clerk = await (0, server_1.clerkClient)();
    const members = await clerk.organizations.getOrganizationMembershipList({
      organizationId: orgId,
      limit: 100,
    });
    const users = members.data.map((user) => ({
      id: user.id,
      name: getName(user) ?? user.publicUserData?.identifier,
      imageUrl: user.publicUserData?.imageUrl,
    }));
    const fuse = new fuse_js_1.default(users, {
      keys: ["name"],
      minMatchCharLength: 1,
      threshold: 0.3,
    });
    const results = fuse.search(query);
    const data = results.map((result) => result.item.id);
    return { data };
  } catch (error) {
    return { error };
  }
};
exports.searchUsers = searchUsers;
