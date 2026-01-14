import { DownloadIcon, PlusIcon } from "lucide-react";
import { StatCard } from "../components/stat-card";

const DevConsoleDashboardPage = () => (
  <div className="dev-console-stack">
    <header className="dev-console-header">
      <div>
        <p className="dev-console-breadcrumb">Platform / Overview</p>
        <h1 className="dev-console-title">Dashboard</h1>
      </div>
      <div className="dev-console-header-actions">
        <button className="dev-console-button dev-console-button-ghost" type="button">
          <DownloadIcon className="h-4 w-4" />
          Export Report
        </button>
        <button className="dev-console-button dev-console-button-primary" type="button">
          <PlusIcon className="h-4 w-4" />
          New Application
        </button>
      </div>
    </header>

    <section className="dev-console-grid dev-console-grid-4">
      <StatCard
        label="Total Tenants"
        value="1,248"
        trend="+12% from last month"
        trendTone="positive"
      />
      <StatCard
        label="API Requests (24h)"
        value="45.2M"
        trend="+5.4% from yesterday"
        trendTone="positive"
      />
      <StatCard label="Avg Latency" value="42ms" trend="Within SLA limits" />
      <StatCard label="Error Rate" value="0.04%" trend="Stable" trendTone="neutral" />
    </section>

    <section className="dev-console-grid dev-console-grid-2">
      <div className="dev-console-panel">
        <div className="dev-console-panel-header">
          <div>
            <h2>API Traffic Volume</h2>
            <p>Requests per hour over the last 24 hours</p>
          </div>
          <div className="dev-console-pill-group">
            <span className="dev-console-pill active">24h</span>
            <span className="dev-console-pill">7d</span>
            <span className="dev-console-pill">30d</span>
          </div>
        </div>
        <div className="dev-console-chart">
          <div className="dev-console-chart-bars">
            {Array.from({ length: 24 }).map((_, index) => (
              <span key={index} style={{ height: `${18 + (index % 7) * 6}%` }} />
            ))}
          </div>
          <div className="dev-console-chart-axis">
            <span>00:00</span>
            <span>06:00</span>
            <span>12:00</span>
            <span>18:00</span>
            <span>23:59</span>
          </div>
        </div>
      </div>

      <div className="dev-console-panel">
        <div className="dev-console-panel-header">
          <div>
            <h2>System Health</h2>
            <p>Real-time platform status</p>
          </div>
          <span className="dev-console-status-pill">All systems operational</span>
        </div>
        <div className="dev-console-health-list">
          <div>
            <span>API Gateway</span>
            <span>100% uptime</span>
          </div>
          <div>
            <span>Auth Service</span>
            <span>100% uptime</span>
          </div>
          <div>
            <span>Webhooks</span>
            <span>98ms latency</span>
          </div>
          <div>
            <span>Database</span>
            <span>Healthy</span>
          </div>
        </div>
      </div>
    </section>

    <section className="dev-console-grid dev-console-grid-2">
      <div className="dev-console-panel">
        <div className="dev-console-panel-header">
          <div>
            <h2>Recent Activity</h2>
            <p>Notable events across all tenants</p>
          </div>
        </div>
        <div className="dev-console-activity-list">
          <div>
            <p>New Tenant Registration</p>
            <span>Acme Corp (Enterprise) provisioned in us-east-1</span>
          </div>
          <div>
            <p>Suspicious Login Attempt</p>
            <span>Multiple failed attempts detected for admin@globex.net</span>
          </div>
          <div>
            <p>API Key Rollover</p>
            <span>Umbrella Corp rotated production keys</span>
          </div>
        </div>
        <button className="dev-console-link" type="button">
          View all logs
        </button>
      </div>

      <div className="dev-console-panel">
        <div className="dev-console-panel-header">
          <div>
            <h2>Quick Links</h2>
            <p>Common management tasks</p>
          </div>
        </div>
        <div className="dev-console-quick-links">
          <button className="dev-console-quick-link" type="button">
            Documentation
          </button>
          <button className="dev-console-quick-link" type="button">
            Support Center
          </button>
          <button className="dev-console-quick-link" type="button">
            Global Config
          </button>
        </div>
      </div>
    </section>
  </div>
);

export default DevConsoleDashboardPage;
