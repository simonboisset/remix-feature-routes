import { Link } from '@remix-run/react';

export default function Index() {
  return (
    <div>
      <h1>Welcome to Remix</h1>
      <Link to='nested'>Nested</Link>
    </div>
  );
}
