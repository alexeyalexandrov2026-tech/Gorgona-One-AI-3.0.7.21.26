import { notFound } from 'next/navigation';
import PilotBoundary from './PilotBoundary';
import snapshots from '../../i18n/pilot/snapshots.json';

export const metadata = {
  title: 'Miami Elio — localization qualification',
  robots: { index: false, follow: false }
};

export default function I18nPilotPage() {
  if (process.env.MIAMI_I18N_PILOT !== '1') notFound();
  return <PilotBoundary snapshots={snapshots} />;
}
