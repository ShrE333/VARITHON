/**
 * Public surface of the Admin Location Management module.
 *
 * Import from here rather than reaching into individual files, so internal
 * structure can change without breaking the host admin panel:
 *
 *     import { LocationManagement } from './admin-locations';
 *
 *     <LocationManagement />
 *
 * That one component is the whole feature — list, map, form, search,
 * filters, CRUD. No providers, no context, no wrapper required.
 */

export { LocationManagement } from './components/LocationManagement';
export type { LocationManagementProps } from './components/LocationManagement';

export { LocationList } from './components/LocationList';
export type { LocationListProps } from './components/LocationList';

export { LocationForm } from './components/LocationForm';
export type { LocationFormProps } from './components/LocationForm';

export { LocationMap } from './components/LocationMap';
export type { LocationMapProps } from './components/LocationMap';

// Logic layer — usable on its own if the panel wants a custom UI.
export { useLocations } from './useLocations';
export type { UseLocationsResult } from './useLocations';

export {
  getLocations,
  getLocationById,
  createLocation,
  updateLocation,
  deleteLocation,
  configureLocationService,
} from './service';

export {
  LOCATION_CATEGORIES,
  getCategory,
  categoryLabel,
  categoryOrFallback,
  isKnownCategory,
} from './categories';
export type { CategoryDefinition } from './categories';

export {
  validateCreate,
  validateUpdate,
  validateCoordinates,
  findProbableDuplicate,
} from './validation';

export type {
  AdminLocation,
  CreateLocationInput,
  UpdateLocationInput,
  LocationCategory,
  LocationStatus,
  LocationAvailability,
  LocationFilters,
  ServiceResult,
} from './types';

/**
 * NOT exported here on purpose: `mapper.ts` and `auth.ts` are server-only.
 *
 * This barrel is what client components import, so anything re-exported from
 * it lands in the browser bundle. `auth.ts` reads ADMIN_API_TOKEN and must
 * never be reachable from client code, even though a bundler would replace
 * the value with `undefined`.
 *
 * Server code imports them directly:
 *
 *     import { rowToLocation } from './admin-locations/mapper';
 *     import { isAdminAuthorised } from './admin-locations/auth';
 */
