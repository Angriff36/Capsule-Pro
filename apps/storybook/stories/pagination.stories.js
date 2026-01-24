Object.defineProperty(exports, "__esModule", { value: true });
exports.Default = void 0;
const pagination_1 = require("@repo/design-system/components/ui/pagination");
/**
 * Pagination with page navigation, next and previous links.
 */
const meta = {
  title: "ui/Pagination",
  component: pagination_1.Pagination,
  tags: ["autodocs"],
  argTypes: {},
  render: (args) => (
    <pagination_1.Pagination {...args}>
      <pagination_1.PaginationContent>
        <pagination_1.PaginationItem>
          <pagination_1.PaginationPrevious href="#" />
        </pagination_1.PaginationItem>
        <pagination_1.PaginationItem>
          <pagination_1.PaginationLink href="#">1</pagination_1.PaginationLink>
        </pagination_1.PaginationItem>
        <pagination_1.PaginationItem>
          <pagination_1.PaginationLink href="#">2</pagination_1.PaginationLink>
        </pagination_1.PaginationItem>
        <pagination_1.PaginationItem>
          <pagination_1.PaginationLink href="#">3</pagination_1.PaginationLink>
        </pagination_1.PaginationItem>
        <pagination_1.PaginationItem>
          <pagination_1.PaginationEllipsis />
        </pagination_1.PaginationItem>
        <pagination_1.PaginationItem>
          <pagination_1.PaginationNext href="#" />
        </pagination_1.PaginationItem>
      </pagination_1.PaginationContent>
    </pagination_1.Pagination>
  ),
  parameters: {
    layout: "centered",
  },
};
exports.default = meta;
/**
 * The default form of the pagination.
 */
exports.Default = {};
