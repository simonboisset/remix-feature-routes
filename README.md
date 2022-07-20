# remix-feature-routes

Feature routes convention for Remix

This package is a custom remix routes definition. It enables you to get your feature folders in your routes folders.

## Installation

```bash
yarn add -D remix-feature-routes
```

## Configuration

Update your `remix.config.js`.

```ts
const { defineFeatureRoutes } = require('../remix-feature-routes/dist');
module.exports = {
  ignoredRouteFiles: ['**/*'],
  routes: async (defineRoutes) => {
    return defineFeatureRoutes('app', 'routes', 'routes', defineRoutes);
  },
};
```

### Function defineFeatureRoutes parameters

1. appDir
   is your remix base folder by default set to `app`
2. routesDir
   is your remix routes folder by default set to `routes`
3. outletDir
   is your conventionnal nested routes folder by default set to `routes`

## Feature routes convention

- Every file and folder in the routes folder will be a route.
- Every file and folder in the nested routes folder will be a nested route.
- If a folder is defined as a route his index file will be defined as the route file of the folder
- Other files are skipped

### Example

```
routes/
    auth/
        components/
            LogoutButton.tsx
            LoginForm.tsx
        route/
            index.tsx
            join.tsx
            login.tsx
            logout.ts
    profile.$userId/
        routes/
            index.tsx
            settings.tsx
        index.tsx
    index.tsx
```

## Some exceptions

Ther is some exceptions for this convention :

- route folder has priority over route file : `profile/index.tsx will` override `profile.tsx`
- index route folder can't have nested route. You must define nested route on the parent folder.
