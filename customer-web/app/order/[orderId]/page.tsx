import OrderTracking from './OrderTracking';

export async function generateStaticParams() {
  return [{ orderId: '_' }];
}

export default function Page() {
  return <OrderTracking />;
}
