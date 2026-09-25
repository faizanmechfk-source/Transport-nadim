import React, { useState, useMemo } from 'react';
import {
  MapPin,
  Navigation,
  Plus,
  Trash2,
  Star,
  StarOff,
  Building2,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
  Sparkles,
  Info,
  Clock,
  Scale,
  DollarSign,
  Layers,
  Edit2,
  X,
  Check
} from 'lucide-react';
import { CompanySettings, OperatingCity, QuickRoute, UserSession } from '../../types';
import { defaultOperatingCities, defaultQuickRoutes } from '../../database/seedData';

interface CityRouteSettingsTabProps {
  currentUser: UserSession;
  settings: CompanySettings;
  formData: CompanySettings;
  setFormData: React.Dispatch<React.SetStateAction<CompanySettings>>;
  onSaveSettings: (updatedSettings: CompanySettings) => Promise<void>;
  onShowToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  onRequestConfirm: (title: string, message: string, onConfirm: () => void, isDanger?: boolean) => void;
  subTab?: 'cities' | 'routes';
}

export const CityRouteSettingsTab: React.FC<CityRouteSettingsTabProps> = ({
  currentUser,
  settings,
  formData,
  setFormData,
  onSaveSettings,
  onShowToast,
  onRequestConfirm,
  subTab = 'cities',
}) => {
  // Normalize operating cities from formData and settings
  const currentCities: OperatingCity[] = useMemo(() => {
    const raw = Array.isArray(formData.operatingCities)
      ? formData.operatingCities
      : (Array.isArray(settings.operatingCities) ? settings.operatingCities : defaultOperatingCities);

    const deletedSet = new Set(
      [...(formData.deletedCityNames || []), ...(settings.deletedCityNames || [])].map((n) =>
        n.trim().toLowerCase()
      )
    );

    return (raw as any[])
      .map((c, i) =>
        typeof c === 'string'
          ? { id: `ct-${i}-${String(c).toLowerCase()}`, name: String(c), isHub: false, showOnHomeShortcut: true }
          : { ...c, showOnHomeShortcut: c.showOnHomeShortcut ?? true }
      )
      .filter((c) => !deletedSet.has((c.name || '').trim().toLowerCase()));
  }, [formData.operatingCities, formData.deletedCityNames, settings.operatingCities, settings.deletedCityNames]);

  // Normalize quick routes from formData
  const currentRoutes: QuickRoute[] = useMemo(() => {
    if (Array.isArray(formData.quickRoutes)) return formData.quickRoutes;
    if (Array.isArray(settings.quickRoutes)) return settings.quickRoutes;
    return defaultQuickRoutes;
  }, [formData.quickRoutes, settings.quickRoutes]);

  // City form states
  const [cityName, setCityName] = useState('');
  const [cityState, setCityState] = useState('');
  const [cityCode, setCityCode] = useState('');
  const [isHub, setIsHub] = useState(false);
  const [showOnHomeShortcut, setShowOnHomeShortcut] = useState(true);
  const [cityNotes, setCityNotes] = useState('');
  const [editingCityId, setEditingCityId] = useState<string | null>(null);

  // Route form states
  const [fromCity, setFromCity] = useState('');
  const [toCity, setToCity] = useState('');
  const [distanceKm, setDistanceKm] = useState<string>('');
  const [approxTransitTime, setApproxTransitTime] = useState('');
  const [defaultFreightRate, setDefaultFreightRate] = useState<string>('');
  const [routeCode, setRouteCode] = useState('');
  const [routeRemarks, setRouteRemarks] = useState('');
  const [editingRouteId, setEditingRouteId] = useState<string | null>(null);

  // Filter state for searching existing cities
  const [searchCityQuery, setSearchCityQuery] = useState('');

  // Handle Add / Update City
  const handleSaveCity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cityName.trim()) {
      onShowToast('City name is required', 'warning');
      return;
    }

    const trimmedName = cityName.trim();
    const existingIndex = currentCities.findIndex(
      (c) => c.name.toLowerCase() === trimmedName.toLowerCase() && c.id !== editingCityId
    );

    if (existingIndex >= 0) {
      onShowToast(`City "${trimmedName}" already exists in operating list`, 'warning');
      return;
    }

    let updatedCities: OperatingCity[];
    if (editingCityId) {
      updatedCities = currentCities.map((c) =>
        c.id === editingCityId
          ? {
              ...c,
              name: trimmedName,
              state: cityState.trim() || undefined,
              code: cityCode.trim().toUpperCase() || undefined,
              isHub,
              showOnHomeShortcut,
              notes: cityNotes.trim() || undefined,
            }
          : c
      );
      onShowToast(`Updated city ${trimmedName}`, 'success');
    } else {
      const newCity: OperatingCity = {
        id: 'ct-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        name: trimmedName,
        state: cityState.trim() || undefined,
        code: cityCode.trim().toUpperCase() || (trimmedName.substring(0, 3).toUpperCase()),
        isHub,
        showOnHomeShortcut,
        notes: cityNotes.trim() || undefined,
      };
      updatedCities = [...currentCities, newCity];
      onShowToast(`City "${trimmedName}" added! Shortcut is now active on Home Page.`, 'success');
    }

    // If this city was previously in deletedCityNames, remove it from the blacklist
    const updatedDeletedList = (formData.deletedCityNames || []).filter(
      (n) => n.trim().toLowerCase() !== trimmedName.toLowerCase()
    );

    const newSettings: CompanySettings = {
      ...formData,
      operatingCities: updatedCities,
      deletedCityNames: updatedDeletedList,
    };

    setFormData(newSettings);
    await onSaveSettings(newSettings);

    // Reset City Form
    setCityName('');
    setCityState('');
    setCityCode('');
    setIsHub(false);
    setShowOnHomeShortcut(true);
    setCityNotes('');
    setEditingCityId(null);
  };

  // Toggle Home Shortcut for City
  const handleToggleHomeShortcut = async (cityId: string) => {
    const updatedCities = currentCities.map((c) =>
      c.id === cityId ? { ...c, showOnHomeShortcut: !c.showOnHomeShortcut } : c
    );
    const targetCity = updatedCities.find((c) => c.id === cityId);
    const newSettings: CompanySettings = {
      ...formData,
      operatingCities: updatedCities,
    };
    setFormData(newSettings);
    await onSaveSettings(newSettings);
    if (targetCity) {
      onShowToast(
        targetCity.showOnHomeShortcut
          ? `Added "${targetCity.name}" to Home Page Shortcuts!`
          : `Removed "${targetCity.name}" from Home Page Shortcuts`,
        'info'
      );
    }
  };

  // Toggle Hub Status for City
  const handleToggleHub = async (cityId: string) => {
    const updatedCities = currentCities.map((c) =>
      c.id === cityId ? { ...c, isHub: !c.isHub } : c
    );
    const newSettings: CompanySettings = {
      ...formData,
      operatingCities: updatedCities,
    };
    setFormData(newSettings);
    await onSaveSettings(newSettings);
  };

  // Edit City
  const handleStartEditCity = (city: OperatingCity) => {
    setEditingCityId(city.id);
    setCityName(city.name);
    setCityState(city.state || '');
    setCityCode(city.code || '');
    setIsHub(!!city.isHub);
    setShowOnHomeShortcut(city.showOnHomeShortcut ?? true);
    setCityNotes(city.notes || '');
  };

  const handleCancelEditCity = () => {
    setEditingCityId(null);
    setCityName('');
    setCityState('');
    setCityCode('');
    setIsHub(false);
    setShowOnHomeShortcut(true);
    setCityNotes('');
  };

  // Delete City Permanently
  const handleDeleteCity = (city: OperatingCity) => {
    onRequestConfirm(
      `Permanently Remove City "${city.name}"?`,
      `This will permanently remove "${city.name}" from configured operating hubs, home page shortcuts, and filter menus. It will not return on reload. Existing bilties will remain intact.`,
      async () => {
        const targetId = (city.id || '').trim();
        const targetName = (city.name || '').trim().toLowerCase();

        const updatedCities = currentCities.filter((c) => {
          const cId = (c.id || '').trim();
          const cName = (c.name || '').trim().toLowerCase();
          if (targetId && cId === targetId) return false;
          if (targetName && cName === targetName) return false;
          return true;
        });

        const updatedDeletedList = Array.from(
          new Set([
            ...(formData.deletedCityNames || []),
            ...(settings.deletedCityNames || []),
            targetName,
          ])
        ).filter(Boolean);

        const newSettings: CompanySettings = {
          ...formData,
          operatingCities: updatedCities,
          deletedCityNames: updatedDeletedList,
        };

        setFormData(newSettings);
        await onSaveSettings(newSettings);
        onShowToast(`Permanently removed "${city.name}" from operating cities`, 'success');
      },
      true
    );
  };

  // Restore Default Cities
  const handleRestoreDefaultCities = () => {
    onRequestConfirm(
      'Restore Default Operating Hub Cities?',
      'This will reset your operating cities list to the standard 10 Indian logistics hubs (Mumbai, Delhi, Ahmedabad, Jaipur, etc.) and clear the deleted cities blacklist.',
      async () => {
        const newSettings: CompanySettings = {
          ...formData,
          operatingCities: defaultOperatingCities,
          deletedCityNames: [],
        };
        setFormData(newSettings);
        await onSaveSettings(newSettings);
        onShowToast('Restored default operating hub cities', 'success');
      }
    );
  };

  // ROUTE ACTIONS
  // Handle Save Quick Route
  const handleSaveRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromCity.trim() || !toCity.trim()) {
      onShowToast('Both Origin (From) and Destination (To) cities are required', 'warning');
      return;
    }
    if (fromCity.trim().toLowerCase() === toCity.trim().toLowerCase()) {
      onShowToast('Origin and Destination cities cannot be the same', 'warning');
      return;
    }

    const trimmedFrom = fromCity.trim();
    const trimmedTo = toCity.trim();

    let updatedRoutes: QuickRoute[];
    if (editingRouteId) {
      updatedRoutes = currentRoutes.map((r) =>
        r.id === editingRouteId
          ? {
              ...r,
              fromCity: trimmedFrom,
              toCity: trimmedTo,
              distanceKm: distanceKm ? Number(distanceKm) : undefined,
              approxTransitTime: approxTransitTime.trim() || undefined,
              defaultFreightRate: defaultFreightRate ? Number(defaultFreightRate) : undefined,
              routeCode: routeCode.trim() || `${trimmedFrom.substring(0, 3)}-${trimmedTo.substring(0, 3)}`.toUpperCase(),
              remarks: routeRemarks.trim() || undefined,
            }
          : r
      );
      onShowToast(`Updated Quick Route ${trimmedFrom} → ${trimmedTo}`, 'success');
    } else {
      const newRoute: QuickRoute = {
        id: 'qr-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        fromCity: trimmedFrom,
        toCity: trimmedTo,
        distanceKm: distanceKm ? Number(distanceKm) : undefined,
        approxTransitTime: approxTransitTime.trim() || undefined,
        defaultFreightRate: defaultFreightRate ? Number(defaultFreightRate) : undefined,
        routeCode: routeCode.trim() || `${trimmedFrom.substring(0, 3)}-${trimmedTo.substring(0, 3)}`.toUpperCase(),
        remarks: routeRemarks.trim() || undefined,
        active: true,
      };
      updatedRoutes = [...currentRoutes, newRoute];
      onShowToast(`Quick Route ${trimmedFrom} → ${trimmedTo} created! Visible on Home Page.`, 'success');
    }

    const newSettings: CompanySettings = {
      ...formData,
      quickRoutes: updatedRoutes,
    };
    setFormData(newSettings);
    await onSaveSettings(newSettings);

    // Reset Route Form
    setFromCity('');
    setToCity('');
    setDistanceKm('');
    setApproxTransitTime('');
    setDefaultFreightRate('');
    setRouteCode('');
    setRouteRemarks('');
    setEditingRouteId(null);
  };

  // Toggle Route Active
  const handleToggleRouteActive = async (routeId: string) => {
    const updatedRoutes = currentRoutes.map((r) =>
      r.id === routeId ? { ...r, active: r.active === false ? true : false } : r
    );
    const newSettings: CompanySettings = {
      ...formData,
      quickRoutes: updatedRoutes,
    };
    setFormData(newSettings);
    await onSaveSettings(newSettings);
  };

  // Edit Route
  const handleStartEditRoute = (route: QuickRoute) => {
    setEditingRouteId(route.id);
    setFromCity(route.fromCity);
    setToCity(route.toCity);
    setDistanceKm(route.distanceKm ? String(route.distanceKm) : '');
    setApproxTransitTime(route.approxTransitTime || '');
    setDefaultFreightRate(route.defaultFreightRate ? String(route.defaultFreightRate) : '');
    setRouteCode(route.routeCode || '');
    setRouteRemarks(route.remarks || '');
  };

  const handleCancelEditRoute = () => {
    setEditingRouteId(null);
    setFromCity('');
    setToCity('');
    setDistanceKm('');
    setApproxTransitTime('');
    setDefaultFreightRate('');
    setRouteCode('');
    setRouteRemarks('');
  };

  // Delete Route
  const handleDeleteRoute = (route: QuickRoute) => {
    onRequestConfirm(
      `Delete Quick Route "${route.fromCity} → ${route.toCity}"?`,
      'This corridor shortcut will be removed from the Home Page and route planner.',
      async () => {
        const updatedRoutes = currentRoutes.filter((r) => r.id !== route.id);
        const newSettings: CompanySettings = {
          ...formData,
          quickRoutes: updatedRoutes,
        };
        setFormData(newSettings);
        await onSaveSettings(newSettings);
        onShowToast(`Removed route ${route.fromCity} → ${route.toCity}`, 'info');
      },
      true
    );
  };

  // Restore Default Routes
  const handleRestoreDefaultRoutes = () => {
    onRequestConfirm(
      'Restore Default Quick Routes?',
      'This will reset your quick routes list to standard National Highway corridors (Mumbai-Delhi, Ahmedabad-Indore, etc.).',
      async () => {
        const newSettings: CompanySettings = {
          ...formData,
          quickRoutes: defaultQuickRoutes,
        };
        setFormData(newSettings);
        await onSaveSettings(newSettings);
        onShowToast('Restored default quick routes corridors', 'success');
      }
    );
  };

  // Filtered cities list
  const filteredCities = currentCities.filter((c) =>
    searchCityQuery
      ? c.name.toLowerCase().includes(searchCityQuery.toLowerCase()) ||
        (c.state && c.state.toLowerCase().includes(searchCityQuery.toLowerCase())) ||
        (c.code && c.code.toLowerCase().includes(searchCityQuery.toLowerCase()))
      : true
  );

  return (
    <div className="space-y-6">
      {/* ===================== TAB 1: OPERATING CITIES ===================== */}
      {subTab === 'cities' && (
        <div className="space-y-5">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-4 sm:p-5 rounded-xl border border-blue-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-blue-500/20 border border-blue-400/40 text-blue-300 text-[10px] uppercase font-mono font-black px-2 py-0.5 rounded">
                  City Master & Hub Management
                </span>
                <span className="text-emerald-400 font-bold text-xs flex items-center gap-1 font-mono">
                  <Star className="w-3.5 h-3.5 fill-emerald-400" />
                  <span>Home Shortcuts Sync Active</span>
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black tracking-tight mt-1 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-sky-400" />
                <span>Operating Cities (Transport Hubs & Home Shortcuts)</span>
              </h2>
              <p className="text-xs text-blue-200 mt-0.5">
                Add cities here. Any city added will immediately appear on the <strong>Home Page / Dashboard as a Quick City Shortcut</strong> for 1-click filtering and dispatch creation.
              </p>
            </div>

            <button
              type="button"
              onClick={handleRestoreDefaultCities}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-800/80 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold border border-blue-700 transition-colors self-start sm:self-center"
            >
              <RotateCcw className="w-3.5 h-3.5 text-sky-300" />
              <span>Restore Defaults</span>
            </button>
          </div>

          {/* Add / Edit City Card */}
          <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between border-b pb-2 mb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-600" />
                <span>{editingCityId ? 'Edit Operating City' : 'Add New Operating City (City Add Karein)'}</span>
              </h3>
              {editingCityId && (
                <button
                  type="button"
                  onClick={handleCancelEditCity}
                  className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Cancel Edit</span>
                </button>
              )}
            </div>

            <form onSubmit={handleSaveCity} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {/* City Name */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    City Name (Shehar Ka Naam) *
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 absolute left-2.5 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      value={cityName}
                      onChange={(e) => setCityName(e.target.value)}
                      placeholder="e.g. Surat, Ludhiana, Bhopal, Nagpur..."
                      className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                {/* State / Region */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    State / Region
                  </label>
                  <input
                    type="text"
                    value={cityState}
                    onChange={(e) => setCityState(e.target.value)}
                    placeholder="e.g. Gujarat, Punjab, MP..."
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Hub Short Code */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    City Code (e.g. ST, LDH)
                  </label>
                  <input
                    type="text"
                    value={cityCode}
                    onChange={(e) => setCityCode(e.target.value.toUpperCase())}
                    placeholder="e.g. ST"
                    maxLength={5}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono uppercase font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Toggles & Options */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
                {/* Show on Home Shortcut */}
                <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 bg-amber-50/50 hover:bg-amber-50 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={showOnHomeShortcut}
                    onChange={(e) => setShowOnHomeShortcut(e.target.checked)}
                    className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500"
                  />
                  <div>
                    <span className="font-bold text-slate-900 text-xs flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      <span>Home Page Shortcut</span>
                    </span>
                    <span className="text-[11px] text-slate-500 block leading-tight">
                      Show quick-card on dashboard
                    </span>
                  </div>
                </label>

                {/* Primary Hub */}
                <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 bg-blue-50/50 hover:bg-blue-50 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={isHub}
                    onChange={(e) => setIsHub(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <div>
                    <span className="font-bold text-slate-900 text-xs flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-blue-600" />
                      <span>Primary Logistics Hub</span>
                    </span>
                    <span className="text-[11px] text-slate-500 block leading-tight">
                      Main branch or transit junction
                    </span>
                  </div>
                </label>

                {/* Submit Action */}
                <div className="flex items-center justify-end">
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-md shadow-blue-500/20 flex items-center justify-center gap-1.5 transition-all"
                  >
                    {editingCityId ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Update City</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        <span>Add Operating City (Save)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Configured Cities List */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-xs sm:text-sm">
                  Configured Operating Cities ({currentCities.length} Total)
                </h3>
                <span className="bg-amber-100 text-amber-800 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                  <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                  <span>{currentCities.filter((c) => c.showOnHomeShortcut).length} on Home</span>
                </span>
              </div>

              {/* Search city filter */}
              <div className="w-full sm:w-56">
                <input
                  type="text"
                  value={searchCityQuery}
                  onChange={(e) => setSearchCityQuery(e.target.value)}
                  placeholder="Filter cities..."
                  className="w-full px-2.5 py-1 text-xs border border-slate-300 rounded-lg bg-white"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100/80 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3 text-center w-10">#</th>
                    <th className="py-2.5 px-3">City Name</th>
                    <th className="py-2.5 px-3">State / Region</th>
                    <th className="py-2.5 px-3 text-center">Code</th>
                    <th className="py-2.5 px-3 text-center">Type</th>
                    <th className="py-2.5 px-3 text-center">Home Shortcut</th>
                    <th className="py-2.5 px-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCities.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-slate-400 italic">
                        No operating cities matched your search.
                      </td>
                    </tr>
                  ) : (
                    filteredCities.map((city, idx) => (
                      <tr
                        key={city.id}
                        className={`hover:bg-blue-50/40 transition-colors ${
                          city.id === editingCityId ? 'bg-amber-50/60 font-semibold' : ''
                        }`}
                      >
                        <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span>{city.name}</span>
                            {city.notes && (
                              <span className="text-[10px] text-slate-400 font-normal truncate max-w-[120px]">
                                ({city.notes})
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">{city.state || '-'}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="font-mono text-[10px] bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded font-bold border border-slate-200">
                            {city.code || city.name.substring(0, 3).toUpperCase()}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleHub(city.id)}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                              city.isHub
                                ? 'bg-blue-100 text-blue-800 border-blue-300'
                                : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                            }`}
                            title="Click to toggle Major Hub status"
                          >
                            {city.isHub ? 'Major Hub' : 'Branch City'}
                          </button>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleHomeShortcut(city.id)}
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border transition-all ${
                              city.showOnHomeShortcut
                                ? 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200'
                                : 'bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200 hover:text-slate-700'
                            }`}
                            title="Click to toggle display on Home Page Shortcut cards"
                          >
                            <Star
                              className={`w-3 h-3 ${
                                city.showOnHomeShortcut ? 'text-amber-500 fill-amber-500' : 'text-slate-400'
                              }`}
                            />
                            <span>{city.showOnHomeShortcut ? 'Visible on Home' : 'Hidden'}</span>
                          </button>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleStartEditCity(city)}
                              className="p-1 hover:bg-blue-100 text-blue-600 rounded transition-colors"
                              title="Edit City Details"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCity(city)}
                              className="p-1 hover:bg-rose-100 text-rose-600 rounded transition-colors"
                              title="Remove City"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-blue-600" />
                <span>Cities marked with ⭐ <strong>Visible on Home</strong> appear immediately on the dashboard shortcut strip.</span>
              </span>
              <span className="font-mono">{currentCities.length} registered hubs</span>
            </div>
          </div>
        </div>
      )}

      {/* ===================== TAB 2: QUICK CITY ROUTES ===================== */}
      {subTab === 'routes' && (
        <div className="space-y-5">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white p-4 sm:p-5 rounded-xl border border-emerald-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] uppercase font-mono font-black px-2 py-0.5 rounded">
                  Quick Route Planner & Corridors
                </span>
                <span className="text-teal-300 font-bold text-xs flex items-center gap-1 font-mono">
                  <Navigation className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Instant 1-Click Dispatch Links</span>
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black tracking-tight mt-1 flex items-center gap-2">
                <Navigation className="w-5 h-5 text-emerald-400" />
                <span>Quick City Routes (Fast Corridor Setup)</span>
              </h2>
              <p className="text-xs text-emerald-200 mt-0.5">
                Set up frequently dispatched transport routes (Origin &rarr; Destination). These appear on the <strong>Home Page as 1-click Dispatch shortcuts</strong> with pre-filled routes!
              </p>
            </div>

            <button
              type="button"
              onClick={handleRestoreDefaultRoutes}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-800/80 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold border border-emerald-700 transition-colors self-start sm:self-center"
            >
              <RotateCcw className="w-3.5 h-3.5 text-teal-300" />
              <span>Restore Default Corridors</span>
            </button>
          </div>

          {/* Add / Edit Route Form */}
          <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between border-b pb-2 mb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-600" />
                <span>{editingRouteId ? 'Edit Quick Route' : 'Create Quick City Route (Quick Route Banayein)'}</span>
              </h3>
              {editingRouteId && (
                <button
                  type="button"
                  onClick={handleCancelEditRoute}
                  className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Cancel Edit</span>
                </button>
              )}
            </div>

            <form onSubmit={handleSaveRoute} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {/* From City */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    From City (Origin) *
                  </label>
                  <input
                    type="text"
                    list="city-options-from"
                    value={fromCity}
                    onChange={(e) => setFromCity(e.target.value)}
                    placeholder="e.g. Mumbai"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                  <datalist id="city-options-from">
                    {currentCities.map((c) => (
                      <option key={`opt-from-${c.id}`} value={c.name} />
                    ))}
                  </datalist>
                </div>

                {/* To City */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    To City (Destination) *
                  </label>
                  <input
                    type="text"
                    list="city-options-to"
                    value={toCity}
                    onChange={(e) => setToCity(e.target.value)}
                    placeholder="e.g. Delhi"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                  <datalist id="city-options-to">
                    {currentCities.map((c) => (
                      <option key={`opt-to-${c.id}`} value={c.name} />
                    ))}
                  </datalist>
                </div>

                {/* Distance in Km */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Distance (Km)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={distanceKm}
                      onChange={(e) => setDistanceKm(e.target.value)}
                      placeholder="e.g. 1420"
                      min={0}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <span className="absolute right-2.5 top-2 text-[11px] font-bold text-slate-400">Km</span>
                  </div>
                </div>

                {/* Approx Transit Time */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Approx Transit Time
                  </label>
                  <input
                    type="text"
                    value={approxTransitTime}
                    onChange={(e) => setApproxTransitTime(e.target.value)}
                    placeholder="e.g. 36-40 hrs, 2 Days"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Second row: Rate, Code, Remarks */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
                {/* Default Freight Rate */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Standard Freight Rate ({formData.currencySymbol})
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-2 text-xs font-bold text-emerald-600">
                      {formData.currencySymbol}
                    </span>
                    <input
                      type="number"
                      value={defaultFreightRate}
                      onChange={(e) => setDefaultFreightRate(e.target.value)}
                      placeholder="e.g. 35000"
                      min={0}
                      className="w-full pl-6 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Corridor Remarks */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Corridor Notes / Remarks
                  </label>
                  <input
                    type="text"
                    value={routeRemarks}
                    onChange={(e) => setRouteRemarks(e.target.value)}
                    placeholder="e.g. NH48 Expressway, Pharma route..."
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Save Button */}
                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-md shadow-emerald-500/20 flex items-center justify-center gap-1.5 transition-all"
                  >
                    {editingRouteId ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Update Route</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        <span>Save Quick Route (Add)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Configured Routes List */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Navigation className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-xs sm:text-sm">
                  Active Quick Routes ({currentRoutes.length} Corridors)
                </h3>
              </div>
              <span className="text-[11px] text-slate-500">
                Directly accessible on Dashboard Dispatch Planner
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100/80 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3 text-center w-10">#</th>
                    <th className="py-2.5 px-3">Corridor (From &rarr; To)</th>
                    <th className="py-2.5 px-3 text-right">Distance</th>
                    <th className="py-2.5 px-3">Transit Time</th>
                    <th className="py-2.5 px-3 text-right">Std Rate</th>
                    <th className="py-2.5 px-3">Corridor Notes</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentRoutes.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-6 text-center text-slate-400 italic">
                        No quick city routes configured yet. Add your first corridor above!
                      </td>
                    </tr>
                  ) : (
                    currentRoutes.map((route, idx) => (
                      <tr
                        key={route.id}
                        className={`hover:bg-emerald-50/40 transition-colors ${
                          route.id === editingRouteId ? 'bg-emerald-50/60 font-semibold' : ''
                        }`}
                      >
                        <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">
                          <div className="flex items-center gap-1.5">
                            <span className="text-blue-900 font-bold">{route.fromCity}</span>
                            <span className="text-slate-400">&rarr;</span>
                            <span className="text-emerald-900 font-bold">{route.toCity}</span>
                            {route.routeCode && (
                              <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1 rounded ml-1">
                                {route.routeCode}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-700">
                          {route.distanceKm ? `${route.distanceKm.toLocaleString()} Km` : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          {route.approxTransitTime ? (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span>{route.approxTransitTime}</span>
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-800">
                          {route.defaultFreightRate
                            ? `${formData.currencySymbol} ${route.defaultFreightRate.toLocaleString()}`
                            : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 max-w-[150px] truncate" title={route.remarks}>
                          {route.remarks || '-'}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleRouteActive(route.id)}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                              route.active !== false
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                : 'bg-slate-100 text-slate-500 border-slate-300'
                            }`}
                          >
                            {route.active !== false ? 'Active' : 'Disabled'}
                          </button>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleStartEditRoute(route)}
                              className="p-1 hover:bg-emerald-100 text-emerald-700 rounded transition-colors"
                              title="Edit Route"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteRoute(route)}
                              className="p-1 hover:bg-rose-100 text-rose-600 rounded transition-colors"
                              title="Delete Route"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-emerald-600" />
                <span>Configured corridors automatically populate the Quick Dispatch Planner and Home Page Shortcuts.</span>
              </span>
              <span className="font-mono">{currentRoutes.length} corridors defined</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
