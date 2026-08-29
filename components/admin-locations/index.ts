/**
 * Public surface of the Admin Location Management module.
 *
 * Import from here rather than reaching into individual files, so internal
 * structure can change without breaking the host admin panel:
 *
 *     import { LocationManagement } from '@/components/admin-locations';
 */

export { LocationManagement } from './LocationManagement';
export type { LocationManagementProps } from './LocationManagement';

export { LocationList } from './LocationList';
export type { LocationListProps } from './LocationList';

export { LocationForm } from './LocationForm';
export type { LocationFormProps } from './LocationForm';

export { LocationMap } from './LocationMap';
export type { LocationMapProps } from './LocationMap';

// Logic layer — usable on its own if the panel wants a custom UI.
export { useLocations } from '@/lib/admin-locations/useLocations';
export type { UseLocationsResult } from '@/lib/admin-locations/useLocations';

export {
  getLocations,
  getLocationById,
  createLocation,
  updateLocation,
  deleteLocation,
  configureLocationService,
} from '@/lib/admin-locations/service';

export {
  LOCATION_CATEGORIES,
  getCategory,
  categoryLabel,
  categoryOrFallback,
  isKnownCategory,
} from '@/lib/admin-locations/categories';
export type { CategoryDefinition } from '@/lib/admin-locations/categories';

export {
  validateCreate,
  validateUpdate,
  validateCoordinates,
  findProbableDuplicate,
} from '@/lib/admin-locations/validation';

export type {
  AdminLocation,
  CreateLocationInput,
  UpdateLocationInput,
  LocationCategory,
  LocationStatus,
  LocationAvailability,
  LocationFilters,
  ServiceResult,
} from '@/lib/admin-locations/types';
