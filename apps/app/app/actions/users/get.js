"use server";

Object.defineProperty(exports, "__esModule", { value: true });
exports.getUsers = void 0;
const server_1 = require("@repo/auth/server");
const getName = (user) => {
  let name = user.publicUserData?.firstName;
  if (name && user.publicUserData?.lastName) {
    name = `${name} ${user.publicUserData.lastName}`;
  } else if (!name) {
    name = user.publicUserData?.identifier;
  }
  return name;
};
const colors = [
  "var(--color-red-500)",
  "var(--color-orange-500)",
  "var(--color-amber-500)",
  "var(--color-yellow-500)",
  "var(--color-lime-500)",
  "var(--color-green-500)",
  "var(--color-emerald-500)",
  "var(--color-teal-500)",
  "var(--color-cyan-500)",
  "var(--color-sky-500)",
  "var(--color-blue-500)",
  "var(--color-indigo-500)",
  "var(--color-violet-500)",
  "var(--color-purple-500)",
  "var(--color-fuchsia-500)",
  "var(--color-pink-500)",
  "var(--color-rose-500)",
];
const getUsers = async (userIds) => {
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
    const data = members.data
      .filter(
        (user) =>
          user.publicUserData?.userId &&
          userIds.includes(user.publicUserData.userId)
      )
      .map((user) => ({
        name: getName(user) ?? "Unknown user",
        picture: user.publicUserData?.imageUrl ?? "",
        color: colors[Math.floor(Math.random() * colors.length)],
      }));
    return { data };
  } catch (error) {
    return { error };
  }
};
exports.getUsers = getUsers;
