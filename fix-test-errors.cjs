const fs = require('fs');
const path = require('path');

const filesToFix = [
  'apps/api/__tests__/command-board/board-connections.test.ts',
  'apps/api/__tests__/command-board/board-annotations.test.ts',
  'apps/api/__tests__/command-board/board-crud.test.ts',
];

filesToFix.forEach((filePath) => {
  const dir = path.dirname(filePath);
  const fileName = path.basename(filePath);

  // Read the file
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace mockRequireCurrentUser.mockResolvedValue with missing properties
  // Pattern matches: mockRequireCurrentUser.mockResolvedValue({ with id, tenantId, role })
  // but NOT including email, firstName, lastName
  const pattern = /mockRequireCurrentUser\.mockResolvedValue\(\{[\s\S]*?)id: ([\s\S]*?)tenantId: ([\s\S]*?)role: ([\s\S]*?)\}/g;

  // Add missing properties
  const replacement = `mockRequireCurrentUser.mockResolvedValue({
        id: $1,
        tenantId: $2,
        role: $3,
        email: "test@example.com",
        firstName: "Test",
        lastName: "User",
      })`;

  content = content.replace(pattern, replacement);

  // Write the updated file
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Fixed: ${filePath}`);
});

console.log('Done!');
