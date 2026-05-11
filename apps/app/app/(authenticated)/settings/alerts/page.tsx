import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import {
	CommandBand,
	CommandBandActions,
	CommandBandBody,
	CommandBandHeader,
	CommandBandLede,
	DisplayHeading,
	MetricBand,
	MetricCell,
	MetricLabel,
	MetricValue,
	MonoLabel,
	OperationalColumn,
	PageCanvas,
	SectionHeader,
} from "@repo/design-system/components/blocks/page-shell";
import { Button } from "@repo/design-system/components/ui/button";
import { redirect } from "next/navigation";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { AlertsConfigClient } from "./alerts-client";

export default async function AlertsConfigPage() {
	const { userId, orgId } = await auth();
	if (!(userId && orgId)) redirect("/sign-in");

	const tenantId = await getTenantIdForOrg(orgId);
	if (!tenantId) redirect("/");

	const [total, channels] = await Promise.all([
		database.alertsConfig.count({ where: { tenantId } }),
		database.alertsConfig.groupBy({
			by: ["channel"],
			where: { tenantId },
			_count: { channel: true },
		}),
	]);

	const channelCount = channels.length;
	const emailConfigs = channels.find((c) => c.channel === "email")?._count.channel ?? 0;
	const smsConfigs = channels.find((c) => c.channel === "sms")?._count.channel ?? 0;
	const webhookConfigs = channels.find((c) => c.channel === "webhook")?._count.channel ?? 0;

	return (
		<PageCanvas>
			<CommandBand>
				<CommandBandHeader>
					<div className="space-y-4">
						<MonoLabel tone="dark">Settings / Alert Configuration</MonoLabel>
						<DisplayHeading>Alert Configuration</DisplayHeading>
						<CommandBandLede>
							Configure alert notification channels and destinations. Define where
							and how system alerts are delivered for inventory, scheduling, and
							operational events.
						</CommandBandLede>
					</div>
					<CommandBandActions>
						<Button
							asChild
							className="bg-white text-deep-green hover:bg-white/90"
							size="sm"
						>
							<a href="/settings">Back to Settings</a>
						</Button>
					</CommandBandActions>
				</CommandBandHeader>

				<CommandBandBody>
					<MetricBand cols={4}>
						<MetricCell>
							<MetricLabel>Total Configs</MetricLabel>
							<MetricValue>{total}</MetricValue>
							<p className="text-sm text-white/70">
								{channelCount} channel{channelCount !== 1 ? "s" : ""} configured
							</p>
						</MetricCell>
						<MetricCell>
							<MetricLabel>Email</MetricLabel>
							<MetricValue>{emailConfigs}</MetricValue>
							<p className="text-sm text-white/70">Email destinations</p>
						</MetricCell>
						<MetricCell>
							<MetricLabel>SMS</MetricLabel>
							<MetricValue>{smsConfigs}</MetricValue>
							<p className="text-sm text-white/70">SMS destinations</p>
						</MetricCell>
						<MetricCell>
							<MetricLabel>Webhook</MetricLabel>
							<MetricValue>{webhookConfigs}</MetricValue>
							<p className="text-sm text-white/70">Webhook endpoints</p>
						</MetricCell>
					</MetricBand>
				</CommandBandBody>
			</CommandBand>

			<OperationalColumn>
				<section className="space-y-4">
					<SectionHeader
						count={`${total} config${total !== 1 ? "s" : ""}`}
						description="Manage alert notification channels and delivery destinations."
						eyebrow="Alerts"
						title="Alert Configurations"
					/>
					<AlertsConfigClient initialMetrics={{ total, channelCount }} />
				</section>
			</OperationalColumn>
		</PageCanvas>
	);
}
