import fs from 'node:fs';
import path from 'node:path';

export type DiscoveredPage = {
  route: string;
  filePath: string;
  protected: boolean;
};

export type DiscoveredApiRoute = {
  route: string;
  filePath: string;
  methods: string[];
  protected: boolean;
};

const AUTH_ROUTES = new Set(['/login', '/signup', '/forgot-password', '/reset-password']);

function walkFiles(root: string, predicate: (filePath: string) => boolean, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const filePath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      walkFiles(filePath, predicate, out);
    } else if (predicate(filePath)) {
      out.push(filePath);
    }
  }

  return out;
}

function toPageRoute(filePath: string, appRoot: string) {
  const relative = path.relative(appRoot, filePath).replace(/\\/g, '/');
  const withoutExt = relative.replace(/\/page\.(js|jsx|ts|tsx)$/, '');
  return withoutExt === '' ? '/' : `/${withoutExt}`;
}

function toApiRoute(filePath: string, appRoot: string) {
  const relative = path.relative(appRoot, filePath).replace(/\\/g, '/');
  const withoutRoute = relative.replace(/\/route\.(js|ts)$/, '');
  const withoutApiPrefix = withoutRoute.replace(/^api\//, '');
  return `/api/${withoutApiPrefix.replace(/\[(.+?)\]/g, ':$1')}`;
}

export function discoverPageRoutes(appRoot = path.join(process.cwd(), 'src', 'app')): DiscoveredPage[] {
  const files = walkFiles(appRoot, (filePath) => /\/page\.(js|jsx|ts|tsx)$/.test(filePath.replace(/\\/g, '/')));
  return files
    .map((filePath) => {
      const route = toPageRoute(filePath, appRoot);
      return {
        route,
        filePath,
        protected: !AUTH_ROUTES.has(route),
      };
    })
    .sort((left, right) => left.route.localeCompare(right.route));
}

export function discoverApiRoutes(appRoot = path.join(process.cwd(), 'src', 'app')): DiscoveredApiRoute[] {
  const files = walkFiles(appRoot, (filePath) => /\/route\.(js|ts)$/.test(filePath.replace(/\\/g, '/')));
  return files
    .map((filePath) => {
      const source = fs.readFileSync(filePath, 'utf8');
      const methods = Array.from(source.matchAll(/export\s+async\s+function\s+([A-Z]+)/g)).map((match) => match[1]);
      return {
        route: toApiRoute(filePath, appRoot),
        filePath,
        methods,
        protected: !toApiRoute(filePath, appRoot).startsWith('/api/auth'),
      };
    })
    .sort((left, right) => left.route.localeCompare(right.route));
}

export function getAppRouteSummary() {
  return {
    pages: discoverPageRoutes(),
    apiRoutes: discoverApiRoutes(),
  };
}
