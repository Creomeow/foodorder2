import Pay from './Pay';

export async function generateStaticParams() {
  return [{ orderId: '_' }];
}

export default function Page() {
  return <Pay />;
}
