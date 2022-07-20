import * as path from 'path';
import * as fs from 'fs';

type RouteManifest = {
  [key: string]: ConfigRoute;
};

type ConfigRoute = {
  path?: string;
  index?: boolean;
  caseSensitive?: boolean;
  id: string;
  parentId?: string;
  file: string;
};

type DefineRouteOptions = {
  caseSensitive?: boolean;
  index?: boolean;
};

type DefineRouteChildren = {
  (): void;
};

type DefineRouteFunction = (
  path: string | undefined,
  file: string,
  optionsOrChildren?: DefineRouteOptions | DefineRouteChildren,
  children?: DefineRouteChildren
) => void;

const routeModuleExts = ['.js', '.jsx', '.ts', '.tsx', '.md', '.mdx'];

function isRouteModuleFile(filename: string): boolean {
  return routeModuleExts.includes(path.extname(filename));
}
function isRouteFile(filename: string, outletDir: string): boolean {
  const path = filename.split('/');
  if (path.length === 1) {
    return true;
  }
  if (path.length === 2 && stripFileExtension(path[1]) === 'index') {
    return true;
  }
  if (path[1] === outletDir && path[0] !== 'index') {
    return isRouteFile(path.slice(2).join('/'), outletDir);
  }

  return false;
}
type DefineRoutesFunction = (callback: (defineRoute: DefineRouteFunction) => void) => RouteManifest;

function createRouteId(file: string, outletDir: string) {
  let path = normalizeSlashes(stripFileExtension(file));
  if (path.length > 2 && path[path.length - 1] === 'index') {
    if (path[path.length - 2] === outletDir) {
      path.splice(-2, 1);
    } else {
      path.splice(-1, 1);
    }
  }
  path = path.filter((name, i) => i === 0 || name !== outletDir);

  return path.join('/');
}

function normalizeSlashes(file: string) {
  return file.split(path.win32.sep).flatMap((f) => f.split('/'));
}

function stripFileExtension(file: string) {
  return file.replace(/\.[a-z0-9]+$/i, '');
}
export function defineFeatureRoutes(
  appDir: string,
  routesDir: string,
  outletDir: string,
  defineRoutes: DefineRoutesFunction
): RouteManifest {
  let files: { [routeId: string]: string } = {};

  // First, find all route modules in app/routes
  visitFiles(path.join(appDir, routesDir), (file) => {
    if (isRouteModuleFile(file) && isRouteFile(file, outletDir)) {
      let routeId = createRouteId(path.join(routesDir, file), outletDir);
      if (!files[routeId]) {
        files[routeId] = path.join(routesDir, file);
      } else {
        console.error('[Define routes] routeId is already defined :', routeId);
      }
      return;
    }
  });

  let routeIds = Object.keys(files).sort(byLongestFirst);

  let uniqueRoutes = new Map<string, string>();

  // Then, recurse through all routes using the public defineRoutes() API
  function defineNestedRoutes(defineRoute: DefineRouteFunction, parentId?: string): void {
    let childRouteIds = routeIds.filter((id) => findParentRouteId(routeIds, id) === parentId);

    for (let routeId of childRouteIds) {
      let routePath: string | undefined = createRoutePath(routeId.slice((parentId || routesDir).length + 1));

      let isIndexRoute = routeId.endsWith('/index');
      let fullPath = createRoutePath(routeId.slice(routesDir.length + 1));
      let uniqueRouteId = (fullPath || '') + (isIndexRoute ? '?index' : '');

      if (uniqueRouteId) {
        if (uniqueRoutes.has(uniqueRouteId)) {
          throw new Error(
            `Path ${JSON.stringify(fullPath)} defined by route ${JSON.stringify(
              routeId
            )} conflicts with route ${JSON.stringify(uniqueRoutes.get(uniqueRouteId))}`
          );
        } else {
          uniqueRoutes.set(uniqueRouteId, routeId);
        }
      }

      if (isIndexRoute) {
        let invalidChildRoutes = routeIds.filter((id) => findParentRouteId(routeIds, id) === routeId);

        if (invalidChildRoutes.length > 0) {
          throw new Error(`Child routes are not allowed in index routes. Please remove child routes of ${routeId}`);
        }

        defineRoute(routePath, files[routeId], {
          index: true,
        });
      } else {
        defineRoute(routePath, files[routeId], () => {
          defineNestedRoutes(defineRoute, routeId);
        });
      }
    }
  }

  return defineRoutes(defineNestedRoutes);
}

let escapeStart = '[';
let escapeEnd = ']';

function createRoutePath(partialRouteId: string): string | undefined {
  let result = '';
  let rawSegmentBuffer = '';

  let inEscapeSequence = 0;
  let skipSegment = false;
  for (let i = 0; i < partialRouteId.length; i++) {
    let char = partialRouteId.charAt(i);
    let lastChar = i > 0 ? partialRouteId.charAt(i - 1) : undefined;
    let nextChar = i < partialRouteId.length - 1 ? partialRouteId.charAt(i + 1) : undefined;

    function isNewEscapeSequence() {
      return !inEscapeSequence && char === escapeStart && lastChar !== escapeStart;
    }

    function isCloseEscapeSequence() {
      return inEscapeSequence && char === escapeEnd && nextChar !== escapeEnd;
    }

    function isStartOfLayoutSegment() {
      return char === '_' && nextChar === '_' && !rawSegmentBuffer;
    }

    if (skipSegment) {
      if (char === '/' || char === '.' || char === path.win32.sep) {
        skipSegment = false;
      }
      continue;
    }

    if (isNewEscapeSequence()) {
      inEscapeSequence++;
      continue;
    }

    if (isCloseEscapeSequence()) {
      inEscapeSequence--;
      continue;
    }

    if (inEscapeSequence) {
      result += char;
      continue;
    }

    if (char === '/' || char === path.win32.sep || char === '.') {
      if (rawSegmentBuffer === 'index' && result.endsWith('index')) {
        result = result.replace(/\/?index$/, '');
      } else {
        result += '/';
      }
      rawSegmentBuffer = '';
      continue;
    }

    if (isStartOfLayoutSegment()) {
      skipSegment = true;
      continue;
    }

    rawSegmentBuffer += char;

    if (char === '$') {
      result += typeof nextChar === 'undefined' ? '*' : ':';
      continue;
    }

    result += char;
  }

  if (rawSegmentBuffer === 'index' && result.endsWith('index')) {
    result = result.replace(/\/?index$/, '');
  }

  return result || undefined;
}

function findParentRouteId(routeIds: string[], childRouteId: string): string | undefined {
  return routeIds.find((id) => childRouteId.startsWith(`${id}/`));
}

function byLongestFirst(a: string, b: string): number {
  return b.length - a.length;
}

function visitFiles(dir: string, visitor: (file: string) => void, baseDir = dir): void {
  for (let filename of fs.readdirSync(dir)) {
    let file = path.resolve(dir, filename);
    let stat = fs.lstatSync(file);

    if (stat.isDirectory()) {
      visitFiles(file, visitor, baseDir);
    } else if (stat.isFile()) {
      visitor(path.relative(baseDir, file));
    }
  }
}
