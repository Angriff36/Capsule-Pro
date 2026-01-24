var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? (o, m, k, k2) => {
        if (k2 === undefined) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (
          !desc ||
          ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)
        ) {
          desc = {
            enumerable: true,
            get() {
              return m[k];
            },
          };
        }
        Object.defineProperty(o, k2, desc);
      }
    : (o, m, k, k2) => {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
var __setModuleDefault =
  (this && this.__setModuleDefault) ||
  (Object.create
    ? (o, v) => {
        Object.defineProperty(o, "default", { enumerable: true, value: v });
      }
    : (o, v) => {
        o["default"] = v;
      });
var __importStar =
  (this && this.__importStar) ||
  (() => {
    var ownKeys = (o) => {
      ownKeys =
        Object.getOwnPropertyNames ||
        ((o) => {
          var ar = [];
          for (var k in o) if (Object.hasOwn(o, k)) ar[ar.length] = k;
          return ar;
        });
      return ownKeys(o);
    };
    return (mod) => {
      if (mod && mod.__esModule) return mod;
      var result = {};
      if (mod != null)
        for (var k = ownKeys(mod), i = 0; i < k.length; i++)
          if (k[i] !== "default") __createBinding(result, mod, k[i]);
      __setModuleDefault(result, mod);
      return result;
    };
  })();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Default = void 0;
const zod_1 = require("@hookform/resolvers/zod");
const form_1 = require("@repo/design-system/components/ui/form");
const react_hook_form_1 = require("react-hook-form");
const actions_1 = require("storybook/actions");
const z = __importStar(require("zod"));
/**
 * Building forms with React Hook Form and Zod.
 */
const meta = {
  title: "ui/Form",
  component: form_1.Form,
  tags: ["autodocs"],
  argTypes: {},
  render: (args) => <ProfileForm {...args} />,
};
exports.default = meta;
const formSchema = z.object({
  username: z.string().min(2, {
    message: "Username must be at least 2 characters.",
  }),
});
const ProfileForm = (args) => {
  const form = (0, react_hook_form_1.useForm)({
    resolver: (0, zod_1.zodResolver)(formSchema),
    defaultValues: {
      username: "",
    },
  });
  function onSubmit(values) {
    (0, actions_1.action)("onSubmit")(values);
  }
  return (
    <form_1.Form {...args} {...form}>
      <form className="space-y-8" onSubmit={form.handleSubmit(onSubmit)}>
        <form_1.FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <form_1.FormItem>
              <form_1.FormLabel>Username</form_1.FormLabel>
              <form_1.FormControl>
                <input
                  className="w-full rounded-md border border-input bg-background px-3 py-2"
                  placeholder="username"
                  {...field}
                />
              </form_1.FormControl>
              <form_1.FormDescription>
                This is your public display name.
              </form_1.FormDescription>
              <form_1.FormMessage />
            </form_1.FormItem>
          )}
        />
        <button
          className="rounded bg-primary px-4 py-2 text-primary-foreground"
          type="submit"
        >
          Submit
        </button>
      </form>
    </form_1.Form>
  );
};
/**
 * The default form of the form.
 */
exports.Default = {};
