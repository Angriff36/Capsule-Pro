import { Metadata } from 'next';
import { RoutesView } from './routes-view';

export const metadata: Metadata = {
  title: 'Delivery Routes',
  description: 'Optimize delivery and catering routes',
};

export default function RoutesPage() {
  return <RoutesView />;
}
