import type { Meta, StoryObj } from "@storybook/react";
import {
  EmptyListState,
  FilteredEmptyState,
  NoAuditLogsState,
  NoClientsState,
  NoDataState,
  NoEventsState,
  NoInventoryState,
  NoNotificationsState,
  NoPrepListsState,
  NoRecipesState,
  NoSearchResultsState,
  NoShipmentsState,
  NoTasksState,
} from "./illustrated-empty-states";

const meta = {
  title: "Blocks/Illustrated Empty States",
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta;

export default meta;

type Story = StoryObj;

export const EmptyList: Story = {
  render: () => (
    <div className="w-96">
      <EmptyListState itemName="invoices" />
    </div>
  ),
};

export const NoSearchResults: Story = {
  render: () => (
    <div className="w-96">
      <NoSearchResultsState searchQuery="test query" />
    </div>
  ),
};

export const NoSearchResultsNoQuery: Story = {
  render: () => (
    <div className="w-96">
      <NoSearchResultsState searchableItemName="clients" />
    </div>
  ),
};

export const NoSearchResultsWithClear: Story = {
  render: () => {
    const handleClear = () => alert("Filters cleared!");
    return (
      <div className="w-96">
        <NoSearchResultsState onClearFilters={handleClear} searchQuery="xyz" />
      </div>
    );
  },
};

export const NoNotifications: Story = {
  render: () => (
    <div className="w-96">
      <NoNotificationsState />
    </div>
  ),
};

export const NoClients: Story = {
  render: () => {
    const handleCreate = () => alert("Opening client creation form...");
    return (
      <div className="w-96">
        <NoClientsState onCreateClient={handleCreate} />
      </div>
    );
  },
};

export const NoTasks: Story = {
  render: () => (
    <div className="w-96">
      <NoTasksState
        description="Check back later for new assignments."
        taskType="available tasks"
      />
    </div>
  ),
};

export const NoTasksWithActions: Story = {
  render: () => {
    const handleClaim = () => alert("Viewing all tasks...");
    const handleCreate = () => alert("Creating new task...");
    return (
      <div className="w-96">
        <NoTasksState
          onClaimTask={handleClaim}
          onCreateTask={handleCreate}
          taskType="prep tasks"
        />
      </div>
    );
  },
};

export const NoInventory: Story = {
  render: () => {
    const handleAdd = () => alert("Opening add item form...");
    return (
      <div className="w-96">
        <NoInventoryState onAddItem={handleAdd} />
      </div>
    );
  },
};

export const NoShipments: Story = {
  render: () => {
    const handleCreate = () => alert("Opening shipment form...");
    return (
      <div className="w-96">
        <NoShipmentsState onCreateShipment={handleCreate} />
      </div>
    );
  },
};

export const NoEvents: Story = {
  render: () => {
    const handleCreate = () => alert("Opening event form...");
    return (
      <div className="w-96">
        <NoEventsState dateRange="today" onCreateEvent={handleCreate} />
      </div>
    );
  },
};

export const NoRecipes: Story = {
  render: () => {
    const handleCreate = () => alert("Opening recipe form...");
    return (
      <div className="w-96">
        <NoRecipesState onCreateRecipe={handleCreate} />
      </div>
    );
  },
};

export const NoData: Story = {
  render: () => (
    <div className="w-96">
      <NoDataState dataDescription="sales data" />
    </div>
  ),
};

export const NoDataWithAction: Story = {
  render: () => {
    const actionButton = (
      <button
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        onClick={() => alert("Importing data...")}
        type="button"
      >
        Import Data
      </button>
    );
    return (
      <div className="w-96">
        <NoDataState
          actionButton={actionButton}
          dataDescription="analytics data"
        />
      </div>
    );
  },
};

export const NoAuditLogs: Story = {
  render: () => {
    const handleClear = () => alert("Clearing filters...");
    return (
      <div className="w-96">
        <NoAuditLogsState onClearFilters={handleClear} />
      </div>
    );
  },
};

export const NoPrepLists: Story = {
  render: () => {
    const handleCreate = () => alert("Creating prep list...");
    return (
      <div className="w-96">
        <NoPrepListsState onCreateList={handleCreate} />
      </div>
    );
  },
};

export const FilteredEmpty: Story = {
  render: () => {
    const handleClear = () => alert("Clearing all filters...");
    return (
      <div className="w-96">
        <FilteredEmptyState itemName="orders" onClearFilters={handleClear} />
      </div>
    );
  },
};

// Grid view for comparison
export const AllIllustrationsGrid: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-8 p-8 max-w-6xl">
      <div className="border rounded-lg p-4">
        <h3 className="text-sm font-medium mb-2">Empty List</h3>
        <EmptyListState itemName="items" />
      </div>
      <div className="border rounded-lg p-4">
        <h3 className="text-sm font-medium mb-2">No Search Results</h3>
        <NoSearchResultsState />
      </div>
      <div className="border rounded-lg p-4">
        <h3 className="text-sm font-medium mb-2">No Notifications</h3>
        <NoNotificationsState />
      </div>
      <div className="border rounded-lg p-4">
        <h3 className="text-sm font-medium mb-2">No Clients</h3>
        <NoClientsState />
      </div>
      <div className="border rounded-lg p-4">
        <h3 className="text-sm font-medium mb-2">No Tasks</h3>
        <NoTasksState />
      </div>
      <div className="border rounded-lg p-4">
        <h3 className="text-sm font-medium mb-2">No Inventory</h3>
        <NoInventoryState />
      </div>
      <div className="border rounded-lg p-4">
        <h3 className="text-sm font-medium mb-2">No Shipments</h3>
        <NoShipmentsState />
      </div>
      <div className="border rounded-lg p-4">
        <h3 className="text-sm font-medium mb-2">No Events</h3>
        <NoEventsState />
      </div>
      <div className="border rounded-lg p-4">
        <h3 className="text-sm font-medium mb-2">No Recipes</h3>
        <NoRecipesState />
      </div>
      <div className="border rounded-lg p-4">
        <h3 className="text-sm font-medium mb-2">No Data</h3>
        <NoDataState />
      </div>
    </div>
  ),
};
