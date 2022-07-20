import { useParams } from '@remix-run/react';

export default function Nested() {
  const params = useParams();
  return <div>Outlet 2 {params.name}</div>;
}
