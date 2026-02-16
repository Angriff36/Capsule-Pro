import { auth } from "@repo/auth/server";
import { Header } from "../../../../../components/header";
import { getMenuById } from "../../actions";
import { MenuFormWithConstraints } from "../../components/menu-form-with-constraints";

export default async function EditMenuPage({
  params,
}: {
  params: Promise<{ menuId: string }>;
}) {
  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  const { menuId } = await params;
  const menu = await getMenuById(menuId);

  if (!menu) {
    return (
      <div className="flex flex-col h-full">
        <Header
          page="Menu Not Found"
          pages={["Kitchen Ops", "Recipes", "Menus"]}
        />
        <div className="flex-1 p-6">
          <div className="max-w-4xl mx-auto">
            <p className="text-muted-foreground">Menu not found.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header
        page={`Edit: ${menu.name}`}
        pages={["Kitchen Ops", "Recipes", "Menus"]}
      />
      <div className="flex-1 p-6">
        <div className="max-w-4xl mx-auto">
          <MenuFormWithConstraints
            formMode="update"
            initialData={menu}
            menuId={menuId}
          >
            {({ handleSubmit, isSubmitting, error, dishesSelector }) => (
              <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="grid gap-6">
                  {/* Basic Info Section */}
                  <div className="space-y-4">
                    <h2 className="text-lg font-semibold">Menu Information</h2>

                    <div className="grid gap-2">
                      <label className="text-sm font-medium" htmlFor="name">
                        Menu Name *
                      </label>
                      <input
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        defaultValue={menu.name}
                        id="name"
                        name="name"
                        placeholder="Enter menu name"
                        required
                      />
                    </div>

                    <div className="grid gap-2">
                      <label
                        className="text-sm font-medium"
                        htmlFor="description"
                      >
                        Description
                      </label>
                      <input
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        defaultValue={menu.description ?? ""}
                        id="description"
                        name="description"
                        placeholder="Enter menu description"
                      />
                    </div>

                    <div className="grid gap-2">
                      <label className="text-sm font-medium" htmlFor="category">
                        Category
                      </label>
                      <input
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        defaultValue={menu.category ?? ""}
                        id="category"
                        name="category"
                        placeholder="e.g., Italian, Asian, Buffet"
                      />
                    </div>

                    <div className="grid gap-2">
                      <label className="text-sm font-medium" htmlFor="isActive">
                        Status
                      </label>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        defaultValue={menu.isActive ? "true" : "false"}
                        id="isActive"
                        name="isActive"
                      >
                        <option value="true">Active</option>
                        <option value="false">Inactive</option>
                      </select>
                    </div>
                  </div>

                  {/* Pricing Section */}
                  <div className="space-y-4">
                    <h2 className="text-lg font-semibold">Pricing</h2>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <label
                          className="text-sm font-medium"
                          htmlFor="basePrice"
                        >
                          Base Price ($)
                        </label>
                        <input
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          defaultValue={menu.basePrice ?? ""}
                          id="basePrice"
                          name="basePrice"
                          placeholder="0.00"
                          step="0.01"
                          type="number"
                        />
                      </div>

                      <div className="grid gap-2">
                        <label
                          className="text-sm font-medium"
                          htmlFor="pricePerPerson"
                        >
                          Price Per Person ($)
                        </label>
                        <input
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          defaultValue={menu.pricePerPerson ?? ""}
                          id="pricePerPerson"
                          name="pricePerPerson"
                          placeholder="0.00"
                          step="0.01"
                          type="number"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <label
                          className="text-sm font-medium"
                          htmlFor="minGuests"
                        >
                          Min Guests
                        </label>
                        <input
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          defaultValue={menu.minGuests ?? ""}
                          id="minGuests"
                          name="minGuests"
                          placeholder="0"
                          type="number"
                        />
                      </div>

                      <div className="grid gap-2">
                        <label
                          className="text-sm font-medium"
                          htmlFor="maxGuests"
                        >
                          Max Guests
                        </label>
                        <input
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          defaultValue={menu.maxGuests ?? ""}
                          id="maxGuests"
                          name="maxGuests"
                          placeholder="0"
                          type="number"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Dishes Section */}
                  {dishesSelector}

                  {/* Submit Button */}
                  <div className="flex justify-end gap-4">
                    <a
                      className="inline-flex items-center justify-center rounded-md text-sm font-medium h-10 px-4 py-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground"
                      href={`/kitchen/recipes/menus/${menuId}`}
                    >
                      Cancel
                    </a>
                    <button
                      className="inline-flex items-center justify-center rounded-md text-sm font-medium h-10 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none"
                      disabled={isSubmitting}
                      type="submit"
                    >
                      {isSubmitting ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </MenuFormWithConstraints>
        </div>
      </div>
    </div>
  );
}
