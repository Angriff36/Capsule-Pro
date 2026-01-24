// Venue model does not exist in schema - this page is disabled
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = EditVenuePage;
const card_1 = require("@repo/design-system/components/ui/card");
function EditVenuePage() {
  return (
    <div className="container mx-auto py-8">
      <card_1.Card>
        <card_1.CardHeader>
          <card_1.CardTitle>Edit Venue</card_1.CardTitle>
        </card_1.CardHeader>
        <card_1.CardContent>
          <p className="text-muted-foreground">
            Venue editing is not yet implemented. The Venue model needs to be
            added to the database schema.
          </p>
        </card_1.CardContent>
      </card_1.Card>
    </div>
  );
}
