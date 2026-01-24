Object.defineProperty(exports, "__esModule", { value: true });
const lucide_react_1 = require("lucide-react");
const DevConsoleTenantsPage = () => (
  <div className="dev-console-tenant">
    <div className="dev-console-tenant-header">
      <div>
        <p className="dev-console-breadcrumb">Tenants</p>
        <h1>Acme Corp</h1>
        <div className="dev-console-tenant-meta">
          <span className="dev-console-badge">Active</span>
          <span className="dev-console-muted">Enterprise Plan</span>
          <span className="dev-console-muted">Tenant ID: ten_82934ha9</span>
          <span className="dev-console-muted">Region: us-east-1</span>
        </div>
      </div>
      <div className="dev-console-header-actions">
        <button
          className="dev-console-button dev-console-button-ghost"
          type="button"
        >
          <lucide_react_1.RotateCcwIcon className="h-4 w-4" />
          Reset Keys
        </button>
        <button
          className="dev-console-button dev-console-button-primary"
          type="button"
        >
          <lucide_react_1.KeyRoundIcon className="h-4 w-4" />
          Impersonate
        </button>
      </div>
    </div>

    <div className="dev-console-tenant-grid">
      <aside className="dev-console-tenant-list">
        <input className="dev-console-input" placeholder="Find tenant..." />
        <div className="dev-console-tenant-card active">
          <div className="dev-console-tenant-avatar">AC</div>
          <div>
            <div className="dev-console-tenant-name">Acme Corp</div>
            <div className="dev-console-muted">Enterprise</div>
          </div>
        </div>
        <div className="dev-console-tenant-card">
          <div className="dev-console-tenant-avatar">GL</div>
          <div>
            <div className="dev-console-tenant-name">Globex Inc</div>
            <div className="dev-console-muted">Pro Plan</div>
          </div>
        </div>
        <div className="dev-console-tenant-card">
          <div className="dev-console-tenant-avatar">SO</div>
          <div>
            <div className="dev-console-tenant-name">Soyuz Nerf</div>
            <div className="dev-console-muted">Starter</div>
          </div>
        </div>
        <div className="dev-console-tenant-card danger">
          <div className="dev-console-tenant-avatar">UM</div>
          <div>
            <div className="dev-console-tenant-name">Umbrella</div>
            <div className="dev-console-danger">Suspended</div>
          </div>
        </div>
      </aside>

      <section className="dev-console-tenant-panel">
        <div className="dev-console-panel-header">
          <div>
            <h2>Create Tenant &amp; Owner</h2>
            <p>POST /api/auth/register · Admin only</p>
          </div>
          <span className="dev-console-tag">Top Priority</span>
        </div>
        <div className="dev-console-form-grid">
          <label>
            Company name
            <input
              className="dev-console-input"
              placeholder="e.g. Acme Corporation"
            />
          </label>
          <label>
            Owner email
            <input
              className="dev-console-input"
              placeholder="owner@company.com"
            />
          </label>
          <label>
            Temp password
            <input
              className="dev-console-input"
              placeholder="Generate strong password"
            />
          </label>
          <label>
            Owner role
            <input
              className="dev-console-input"
              placeholder="Tenant Owner (default)"
            />
          </label>
          <label>
            Owner first name
            <input className="dev-console-input" placeholder="Sarah" />
          </label>
          <label>
            Owner last name
            <input className="dev-console-input" placeholder="Connor" />
          </label>
        </div>
        <div className="dev-console-form-actions">
          <span className="dev-console-muted">
            Result will return tenantId and owner credentials.
          </span>
          <div>
            <button
              className="dev-console-button dev-console-button-ghost"
              type="button"
            >
              Clear
            </button>
            <button
              className="dev-console-button dev-console-button-primary"
              type="button"
            >
              Create tenant &amp; owner
            </button>
          </div>
        </div>
        <div className="dev-console-tenant-result">
          <div>
            <div className="dev-console-tenant-name">Created tenant id</div>
            <span className="dev-console-muted">
              ten_92afc3b1 · region: us-east-1
            </span>
          </div>
          <span className="dev-console-status-pill">Owner can sign in</span>
        </div>
      </section>
    </div>
  </div>
);
exports.default = DevConsoleTenantsPage;
