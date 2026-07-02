import TableEntry from './TableEntry';

export async function generateStaticParams() {
  return [{ qrToken: '_' }];
}

export default function Page() {
  return <TableEntry />;
}
