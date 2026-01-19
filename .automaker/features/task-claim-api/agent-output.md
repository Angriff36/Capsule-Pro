I'll implement the task claiming API with optimistic concurrency control. Let me start by exploring the codebase to understand the existing structure.

🔧 Tool: Task
Input: {
  "description": "Explore kitchen task structure",
  "prompt": "Explore the codebase to understand:\n1. The KitchenTask, KitchenTaskClaim, and KitchenTaskProgress models in the Prisma schema\n2. Existing server actions or API routes related to kitchen tasks\n3. How the kitchen module is structured in apps/app\n4. Any existing patterns for optimistic concurrency control or claiming resources\n\nFocus on:\n- packages/database/prisma/schema.prisma - look for KitchenTask related models\n- apps/app/app/(authenticated)/kitchen/ - look for existing actions or API routes\n- Any existing claim or transaction patterns\n\nBe thorough - this is medium complexity exploration.",
  "subagent_type": "Explore"
}
