import { permanentRedirect } from 'next/navigation';

export default function AIReadyRedirect() {
  permanentRedirect('/discovery');
}
