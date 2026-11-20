import PrivateJetsContent from './PrivateJetsContent';

const title='Private Jet Charter Miami — On-Demand Flights | Miami Elio';
export const metadata={
 title,
 description:'Book private jet charters to and from Miami (OPF, MIA, FXE). Flexible aircraft options, transparent quotes, and 24/7 AI concierge coordination.',
 alternates:{canonical:'https://gorgona-one.com/private-jets'},
 openGraph:{title,description:'Private charters with PrivateJetFinder.',url:'https://gorgona-one.com/private-jets'}
};
export default function PrivateJetsPage(){return <PrivateJetsContent/>;}
