import { Link, Outlet } from '@remix-run/react';

export default function Nested() {
  return (
    <div>
      <Link to='outlet'>Outlet</Link>
      <Link to='.'>Index</Link>
      <Outlet />
    </div>
  );
}
