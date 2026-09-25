import React, { useState, useMemo } from 'react';
import {
  MapPin,
  Navigation,
  Scale,
  FileText,
  Truck,
  Package,
  TrendingUp,
  ArrowRight,
  ArrowLeftRight,
  Plus,
  Star,
  Sparkles,
  Settings,
  ChevronDown,
  ChevronUp,
  Filter,
  CheckCircle2,
  ExternalLink,
  Layers,
  Clock,
  Building2,
  X
} from 'lucide-react';
import { Bilty, CompanySettings, Memo, OperatingCity, QuickRoute } from '../../types';
import { defaultOperatingCities, defaultQuickRoutes } from '../../database/seedData';

interface CityWiseSelectionHubProps {
  bilties: Bilty[];
  memos: Memo[];
  settings: CompanySettings;
  onNavigate: (view: any, recordId?: string, payload?: any) => void;
  onShowToast?: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const CityWiseSelectionHub: React.FC<CityWiseSelectionHubProps> = ({
  bilties,
  memos,
  settings,
  onNavigate,
  onShowToast,
}) => {
  // Normalize operating cities from settings
  const operatingCities: OperatingCity[] = useMemo(() => {
    const raw = Array.isArray(settings.operatingCities)
      ? settings.operatingCities
      : defaultOperatingCities;

    const deletedSet = new Set((settings.deletedCityNames || []).map((n) => n.trim().toLowerCase()));

    return (raw as any[])
      .map((c, i) =>
        typeof c === 'string'
          ? { id: `ct-${i}-${String(c).toLowerCase()}`, name: String(c), isHub: false, showOnHomeShortcut: true }
          : { ...c, showOnHomeShortcut: c.showOnHomeShortcut ?? true }
      )
      .filter((c) => !deletedSet.has((c.name || '').trim().toLowerCase()));
  }, [settings.operatingCities, settings.deletedCityNames]);

  // Cities flagged to show on home page shortcut
  const shortcutCities = useMemo(() => {
    const pinned = operatingCities.filter((c) => c.showOnHomeShortcut !== false);
    return pinned.length > 0 ? pinned : operatingCities.slice(0, 8);
  }, [operatingCities]);

  // Normalize quick routes from settings
  const quickRoutes: QuickRoute[] = useMemo(() => {
    if (settings.quickRoutes && settings.quickRoutes.length > 0) {
      return settings.quickRoutes.filter((r) => r.active !== false);
    }
    return defaultQuickRoutes;
  }, [settings.quickRoutes]);

  // Desktop City Selection State
  // 'ALL' means all cities; otherwise city name string
  const [selectedCity, setSelectedCity] = useState<string>('ALL');
  // Direction filter: 'BOTH' (origin or destination), 'ORIGIN' (fromCity), 'DESTINATION' (toCity)
  const [directionFilter, setDirectionFilter] = useState<'BOTH' | 'ORIGIN' | 'DESTINATION'>('BOTH');
  // Toggle details table for selected city
  const [showCityTable, setShowCityTable] = useState(false);

  // Compute live metrics per city across all bilties
  const cityMetricsMap = useMemo(() => {
    const map: Record<string, { count: number; totalWeightKg: number; totalFreight: number; activeVehicles: Set<string> }> = {};

    bilties.forEach((b) => {
      const from = (b.fromCity || '').trim();
      const to = (b.toCity || '').trim();
      const weight = Number(b.weight) || 0;
      const freight = Number(b.totalAmount) || 0;
      const vehicle = b.vehicleNumber;

      if (from) {
        if (!map[from]) map[from] = { count: 0, totalWeightKg: 0, totalFreight: 0, activeVehicles: new Set() };
        map[from].count += 1;
        map[from].totalWeightKg += weight;
        map[from].totalFreight += freight;
        if (vehicle) map[from].activeVehicles.add(vehicle);
      }
      if (to && to !== from) {
        if (!map[to]) map[to] = { count: 0, totalWeightKg: 0, totalFreight: 0, activeVehicles: new Set() };
        map[to].count += 1;
        map[to].totalWeightKg += weight;
        map[to].totalFreight += freight;
        if (vehicle) map[to].activeVehicles.add(vehicle);
      }
    });

    return map;
  }, [bilties]);

  // Filter bilties for the selected city
  const selectedCityBilties = useMemo(() => {
    if (selectedCity === 'ALL') return bilties;
    const target = selectedCity.toLowerCase();
    return bilties.filter((b) => {
      const fromMatch = (b.fromCity || '').toLowerCase() === target;
      const toMatch = (b.toCity || '').toLowerCase() === target;
      if (directionFilter === 'ORIGIN') return fromMatch;
      if (directionFilter === 'DESTINATION') return toMatch;
      return fromMatch || toMatch;
    });
  }, [bilties, selectedCity, directionFilter]);

  // Selected city aggregated statistics
  const selectedStats = useMemo(() => {
    const totalCount = selectedCityBilties.length;
    const totalWeightKg = selectedCityBilties.reduce((sum, b) => sum + (Number(b.weight) || 0), 0);
    const totalWeightMT = (totalWeightKg / 1000).toFixed(2);
    const totalPackages = selectedCityBilties.reduce((sum, b) => sum + (Number(b.packages) || 0), 0);
    const totalFreight = selectedCityBilties.reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0);
    const totalBalance = selectedCityBilties.reduce((sum, b) => sum + (Number(b.balanceAmount) || 0), 0);
    const vehicles = Array.from(new Set(selectedCityBilties.map((b) => b.vehicleNumber).filter(Boolean)));
    const connectedCities = Array.from(
      new Set(
        selectedCityBilties
          .map((b) => (b.fromCity === selectedCity ? b.toCity : b.fromCity))
          .filter(Boolean)
      )
    );

    return {
      totalCount,
      totalWeightKg,
      totalWeightMT,
      totalPackages,
      totalFreight,
      totalBalance,
      vehicleCount: vehicles.length,
      connectedCitiesCount: connectedCities.length,
      connectedCities,
    };
  }, [selectedCityBilties, selectedCity]);

  // Selected city object if any
  const currentCityObj = operatingCities.find(
    (c) => c.name.toLowerCase() === selectedCity.toLowerCase()
  );

  return (
    <div className="space-y-4">
      {/* ========================================================================= */}
      {/* SECTION 1: HOME PAGE CITY SHORTCUTS STRIP (Setting mein City add hongi vah home per shortcut dikhega) */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-black tracking-widest text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                Dashboard Quick Shortcuts
              </span>
              <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <span>Configured in Settings &bull; Live Volume Sync</span>
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2 mt-1">
              <MapPin className="w-5 h-5 text-blue-600" />
              <span>City Quick Shortcuts (Shehar Shortcuts)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Click any city shortcut to filter desktop analytics, or click ⚡ to instantly book a Bilty for that city.
            </p>
          </div>

          <button
            onClick={() => onNavigate('settings')}
            className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-200 transition-colors self-start sm:self-center shrink-0"
            title="Add or remove operating cities in Settings"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>+ Add / Manage Cities</span>
          </button>
        </div>

        {/* Shortcuts Horizontal Scroll / Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
          {/* "All Cities" Quick Card */}
          <button
            type="button"
            onClick={() => setSelectedCity('ALL')}
            className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden group ${
              selectedCity === 'ALL'
                ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-blue-500/50'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between text-xs mb-1">
              <span className={`text-[10px] uppercase font-mono font-bold ${selectedCity === 'ALL' ? 'text-sky-300' : 'text-slate-500'}`}>
                All India
              </span>
              <Layers className={`w-3.5 h-3.5 ${selectedCity === 'ALL' ? 'text-sky-400' : 'text-slate-400'}`} />
            </div>
            <div className="font-extrabold text-sm truncate">All Hubs</div>
            <div className={`text-[11px] mt-1 font-mono font-semibold ${selectedCity === 'ALL' ? 'text-sky-200' : 'text-blue-700'}`}>
              {bilties.length} Total BTs
            </div>
          </button>

          {/* Dynamic Shortcut Cards from Settings */}
          {shortcutCities.map((city) => {
            const isSelected = selectedCity.toLowerCase() === city.name.toLowerCase();
            const metrics = cityMetricsMap[city.name] || { count: 0, totalWeightKg: 0, totalFreight: 0 };
            const weightMt = (metrics.totalWeightKg / 1000).toFixed(1);

            return (
              <div
                key={city.id}
                className={`rounded-xl border transition-all p-3 relative flex flex-col justify-between group ${
                  isSelected
                    ? 'bg-blue-900 text-white border-blue-900 shadow-md ring-2 ring-blue-500/50'
                    : 'bg-white hover:bg-blue-50/50 border-slate-200 hover:border-blue-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between text-[10px] mb-1">
                    <span
                      className={`font-mono font-bold px-1.5 py-0.2 rounded uppercase ${
                        isSelected ? 'bg-blue-800 text-blue-200' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {city.code || city.name.substring(0, 3).toUpperCase()}
                    </span>
                    {city.isHub && (
                      <span
                        className={`text-[9px] font-bold px-1 rounded ${
                          isSelected ? 'bg-amber-400/20 text-amber-300' : 'bg-blue-50 text-blue-700'
                        }`}
                        title="Major Logistics Hub"
                      >
                        Hub
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedCity(city.name)}
                    className="w-full text-left font-black text-sm tracking-tight truncate hover:underline"
                    title={`Filter dashboard for ${city.name}`}
                  >
                    {city.name}
                  </button>

                  <div className={`text-[10px] truncate ${isSelected ? 'text-blue-200' : 'text-slate-400'}`}>
                    {city.state || 'Active Corridor'}
                  </div>
                </div>

                <div className="mt-2 pt-1.5 border-t border-slate-100/30 flex items-center justify-between text-[11px]">
                  <span className={`font-mono font-bold ${isSelected ? 'text-sky-300' : 'text-blue-700'}`}>
                    {metrics.count} {metrics.count === 1 ? 'BT' : 'BTs'}
                  </span>
                  <span className={`text-[10px] font-mono ${isSelected ? 'text-blue-200' : 'text-slate-500'}`}>
                    {metrics.totalWeightKg > 0 ? `${weightMt} MT` : '0 MT'}
                  </span>
                </div>

                {/* 1-Click Fast Action Buttons on Card */}
                <div className="mt-2 pt-1 border-t border-slate-100/20 flex items-center gap-1 text-[10px]">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCity(city.name);
                      onNavigate('bilty', undefined, { fromCity: city.name });
                    }}
                    className={`flex-1 py-0.5 rounded font-bold text-center transition-colors ${
                      isSelected
                        ? 'bg-blue-700 hover:bg-blue-600 text-white'
                        : 'bg-blue-50 hover:bg-blue-100 text-blue-700'
                    }`}
                    title={`Create Bilty with ${city.name} as Origin`}
                  >
                    ⚡ BT
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCity(city.name);
                      onNavigate('memo', 'new', { fromCity: city.name });
                    }}
                    className={`flex-1 py-0.5 rounded font-bold text-center transition-colors ${
                      isSelected
                        ? 'bg-sky-600 hover:bg-sky-500 text-white'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                    title={`Create Memo with ${city.name} as Origin`}
                  >
                    🚚 Memo
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 2: DESKTOP CITY-WISE SELECTION & COMMAND HUB (Desktop city wise selection rakho) */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Top Control Bar */}
        <div className="bg-slate-900 text-white p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-black tracking-widest text-sky-400">
                  Desktop City Dispatch Hub
                </span>
                {selectedCity !== 'ALL' && (
                  <span className="bg-blue-500 text-white text-[10px] font-mono px-2 py-0.2 rounded-full font-bold">
                    Filtered: {selectedCity}
                  </span>
                )}
              </div>
              <h3 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                <span>City-Wise Operational Volume & Command</span>
              </h3>
            </div>
          </div>

          {/* Controls: City Picker & Direction Filter */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* City Selector Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
              <MapPin className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span className="text-slate-400 font-semibold hidden sm:inline">City:</span>
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="bg-transparent text-white font-bold text-xs focus:outline-none cursor-pointer"
              >
                <option value="ALL" className="bg-slate-800 text-white">All India Hubs (All Cities)</option>
                {operatingCities.map((c) => (
                  <option key={`sel-${c.id}`} value={c.name} className="bg-slate-800 text-white">
                    {c.name} {c.state ? `(${c.state})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Direction Filter */}
            {selectedCity !== 'ALL' && (
              <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={() => setDirectionFilter('BOTH')}
                  className={`px-2 py-1 rounded transition-colors ${
                    directionFilter === 'BOTH' ? 'bg-blue-600 text-white font-bold' : 'text-slate-300 hover:text-white'
                  }`}
                  title="Include consignments originating OR arriving at this city"
                >
                  Both Ways
                </button>
                <button
                  type="button"
                  onClick={() => setDirectionFilter('ORIGIN')}
                  className={`px-2 py-1 rounded transition-colors ${
                    directionFilter === 'ORIGIN' ? 'bg-blue-600 text-white font-bold' : 'text-slate-300 hover:text-white'
                  }`}
                  title="Consignments originating from this city"
                >
                  From {selectedCity}
                </button>
                <button
                  type="button"
                  onClick={() => setDirectionFilter('DESTINATION')}
                  className={`px-2 py-1 rounded transition-colors ${
                    directionFilter === 'DESTINATION' ? 'bg-blue-600 text-white font-bold' : 'text-slate-300 hover:text-white'
                  }`}
                  title="Consignments arriving to this city"
                >
                  To {selectedCity}
                </button>
              </div>
            )}

            {/* Reset Button */}
            {selectedCity !== 'ALL' && (
              <button
                type="button"
                onClick={() => setSelectedCity('ALL')}
                className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-2.5 py-1.5 rounded-lg border border-slate-700 transition-colors"
                title="Show all cities"
              >
                <X className="w-3.5 h-3.5" />
                <span>Show All</span>
              </button>
            )}
          </div>
        </div>

        {/* Selected City Command Banner & Live Metrics */}
        <div className="p-4 sm:p-5">
          {selectedCity !== 'ALL' ? (
            <div className="space-y-4">
              {/* City Hero Banner */}
              <div className="bg-gradient-to-r from-blue-50 via-sky-50 to-indigo-50 border border-blue-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-base shadow-sm">
                    {currentCityObj?.code || selectedCity.substring(0, 3).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                        <span>{selectedCity} Hub</span>
                      </h4>
                      {currentCityObj?.isHub && (
                        <span className="bg-blue-100 text-blue-800 font-bold text-[10px] px-2 py-0.5 rounded-full border border-blue-200">
                          Major Logistics Hub
                        </span>
                      )}
                      {currentCityObj?.state && (
                        <span className="text-xs text-slate-500 font-medium">
                          &bull; {currentCityObj.state}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Showing{' '}
                      <strong>
                        {directionFilter === 'ORIGIN'
                          ? `outbound dispatches from ${selectedCity}`
                          : directionFilter === 'DESTINATION'
                          ? `inbound arrivals to ${selectedCity}`
                          : `both outbound & inbound movements for ${selectedCity}`}
                      </strong>
                    </p>
                  </div>
                </div>

                {/* 1-Click Fast Actions for Selected City */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onNavigate('bilty', undefined, { fromCity: selectedCity })}
                    className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New Bilty from {selectedCity}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate('memo', 'new', { fromCity: selectedCity })}
                    className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-colors"
                  >
                    <Truck className="w-3.5 h-3.5" />
                    <span>Create Memo from {selectedCity}</span>
                  </button>
                </div>
              </div>

              {/* 4 Metric Cards for Selected City */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Weight */}
                <div className="p-3.5 bg-white rounded-xl border border-blue-200 shadow-xs">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1">
                    <span className="flex items-center gap-1 text-blue-900 font-bold">
                      <Scale className="w-3.5 h-3.5 text-blue-600" />
                      <span>{selectedCity} Tonnage</span>
                    </span>
                    <span className="bg-blue-100 text-blue-800 text-[10px] font-mono px-1 rounded font-bold">
                      {selectedStats.totalWeightMT} MT
                    </span>
                  </div>
                  <div className="text-2xl font-black text-slate-900 font-mono">
                    {selectedStats.totalWeightKg.toLocaleString()} <span className="text-xs text-slate-500">Kg</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Across {selectedStats.totalPackages.toLocaleString()} packages
                  </div>
                </div>

                {/* Bilties Count */}
                <div className="p-3.5 bg-white rounded-xl border border-indigo-200 shadow-xs">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1">
                    <span className="flex items-center gap-1 text-indigo-900 font-bold">
                      <FileText className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Total Bilties</span>
                    </span>
                    <span className="bg-indigo-100 text-indigo-800 text-[10px] font-mono px-1 rounded font-bold">
                      BTs
                    </span>
                  </div>
                  <div className="text-2xl font-black text-slate-900 font-mono">
                    {selectedStats.totalCount}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Connected to {selectedStats.connectedCitiesCount} other cities
                  </div>
                </div>

                {/* Freight Booked */}
                <div className="p-3.5 bg-white rounded-xl border border-emerald-200 shadow-xs">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1">
                    <span className="flex items-center gap-1 text-emerald-900 font-bold">
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Freight Booked</span>
                    </span>
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-mono px-1 rounded font-bold">
                      Revenue
                    </span>
                  </div>
                  <div className="text-2xl font-black text-slate-900 font-mono">
                    {settings.currencySymbol} {selectedStats.totalFreight.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Pending Dues: <span className="font-semibold text-rose-700 font-mono">{settings.currencySymbol} {selectedStats.totalBalance.toLocaleString()}</span>
                  </div>
                </div>

                {/* Vehicles */}
                <div className="p-3.5 bg-white rounded-xl border border-amber-200 shadow-xs">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1">
                    <span className="flex items-center gap-1 text-amber-900 font-bold">
                      <Truck className="w-3.5 h-3.5 text-amber-600" />
                      <span>Active Fleet</span>
                    </span>
                    <span className="bg-amber-100 text-amber-800 text-[10px] font-mono px-1 rounded font-bold">
                      Lorries
                    </span>
                  </div>
                  <div className="text-2xl font-black text-slate-900 font-mono">
                    {selectedStats.vehicleCount}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 truncate" title={selectedStats.connectedCities.join(', ')}>
                    Corridors: {selectedStats.connectedCities.slice(0, 2).join(', ') || 'Direct'}
                  </div>
                </div>
              </div>

              {/* Toggle Drilldown Table for this City */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                <span className="text-slate-600">
                  {selectedStats.totalCount > 0 ? (
                    <span>
                      Found <strong className="text-slate-900 font-mono">{selectedStats.totalCount}</strong> bilty records associated with <strong>{selectedCity}</strong>.
                    </span>
                  ) : (
                    <span className="italic text-slate-400">
                      No bilty records found for {selectedCity} under current filter. Ready for new bookings!
                    </span>
                  )}
                </span>

                {selectedStats.totalCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowCityTable(!showCityTable)}
                    className="flex items-center gap-1 font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-lg border border-blue-200 transition-colors"
                  >
                    <span>{showCityTable ? 'Hide Records' : `View ${selectedCity} Bilties Register`}</span>
                    {showCityTable ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>

              {/* Detailed City Bilties Table */}
              {showCityTable && selectedStats.totalCount > 0 && (
                <div className="border border-blue-200 rounded-xl overflow-hidden bg-white animate-in fade-in duration-200">
                  <div className="p-3 bg-blue-900 text-white flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-300" />
                      <span className="font-bold">{selectedCity} Consignment Register ({selectedStats.totalCount} BTs)</span>
                    </div>
                    <button
                      onClick={() => onNavigate('bilty')}
                      className="flex items-center gap-1 bg-white text-blue-900 hover:bg-blue-50 px-2.5 py-1 rounded text-[11px] font-bold transition-colors"
                    >
                      <span>Open in Bilty Manager</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="overflow-x-auto max-h-72">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="sticky top-0 bg-slate-100 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b">
                        <tr>
                          <th className="py-2 px-3 text-center w-8">#</th>
                          <th className="py-2 px-3">Bilty #</th>
                          <th className="py-2 px-3">Date</th>
                          <th className="py-2 px-3">Route</th>
                          <th className="py-2 px-3">Parties</th>
                          <th className="py-2 px-3">Vehicle</th>
                          <th className="py-2 px-3 text-center">Pkgs</th>
                          <th className="py-2 px-3 text-right">Weight</th>
                          <th className="py-2 px-3 text-right">Freight</th>
                          <th className="py-2 px-3 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedCityBilties.map((b, idx) => (
                          <tr key={b.id} className="hover:bg-blue-50/50 transition-colors">
                            <td className="py-2 px-3 text-center font-mono text-slate-400">{idx + 1}</td>
                            <td className="py-2 px-3 font-mono font-bold text-blue-700">{b.biltyNumber}</td>
                            <td className="py-2 px-3 text-slate-600 font-mono text-[11px]">{b.biltyDate}</td>
                            <td className="py-2 px-3 font-medium text-slate-800">
                              <span className={b.fromCity === selectedCity ? 'font-bold text-blue-900' : ''}>{b.fromCity}</span>
                              <span className="text-slate-400 mx-1">&rarr;</span>
                              <span className={b.toCity === selectedCity ? 'font-bold text-blue-900' : ''}>{b.toCity}</span>
                            </td>
                            <td className="py-2 px-3 max-w-[150px] truncate text-slate-700" title={`${b.consignor} / ${b.consignee}`}>
                              {b.consignor}
                            </td>
                            <td className="py-2 px-3 font-mono font-bold text-slate-700">{b.vehicleNumber}</td>
                            <td className="py-2 px-3 text-center font-mono">{b.packages}</td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-blue-900">
                              {Number(b.weight).toLocaleString()} Kg
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                              {settings.currencySymbol} {b.totalAmount.toLocaleString()}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <button
                                onClick={() => onNavigate('bilty', b.id)}
                                className="text-blue-600 hover:text-blue-900 p-1 rounded"
                                title="View details"
                              >
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Multi-City Overview Grid when "ALL" is selected */
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span className="font-semibold text-slate-700 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-blue-600" />
                  <span>All India City Volume Distribution:</span>
                </span>
                <span>Click any city to view isolated analytics & register</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {operatingCities.map((city) => {
                  const m = cityMetricsMap[city.name] || { count: 0, totalWeightKg: 0, totalFreight: 0 };
                  const weightMt = (m.totalWeightKg / 1000).toFixed(1);

                  return (
                    <button
                      key={`hub-stat-${city.id}`}
                      type="button"
                      onClick={() => setSelectedCity(city.name)}
                      className="p-3 rounded-xl border border-slate-200 hover:border-blue-400 bg-white hover:bg-blue-50/40 text-left transition-all group shadow-2xs"
                    >
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                        <span className="font-mono font-bold text-slate-600 uppercase">{city.code || 'HUB'}</span>
                        <ArrowRight className="w-3 h-3 text-slate-300 group-hover:text-blue-600 transition-colors" />
                      </div>
                      <div className="font-bold text-slate-900 text-xs truncate group-hover:text-blue-700">
                        {city.name}
                      </div>
                      <div className="mt-2 flex items-baseline justify-between text-[11px]">
                        <span className="font-mono font-bold text-blue-900">{m.count} BTs</span>
                        <span className="font-mono text-slate-500 text-[10px]">{weightMt} MT</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 3: QUICK CITY ROUTES (Setting mein quick City route banane ka bhi option rakho) */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-2xl border border-slate-800 shadow-sm p-4 sm:p-5 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-black tracking-widest text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30">
                Corridor Dispatch Shortcuts
              </span>
              <span className="text-xs text-slate-300 flex items-center gap-1 font-mono">
                <Navigation className="w-3.5 h-3.5 text-emerald-400" />
                <span>Quick City Routes from Settings</span>
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-black tracking-tight text-white mt-1 flex items-center gap-2">
              <ArrowLeftRight className="w-5 h-5 text-emerald-400" />
              <span>Frequent Transport Corridors (Quick Routes)</span>
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
              1-click dispatch for your configured standard routes. Pre-fills origin, destination, and standard freight.
            </p>
          </div>

          <button
            onClick={() => onNavigate('settings')}
            className="flex items-center gap-1 text-xs font-bold text-emerald-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-emerald-700/50 transition-colors self-start sm:self-center shrink-0"
            title="Create new Quick Routes in Settings"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            <span>+ Create Quick Route</span>
          </button>
        </div>

        {/* Route Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {quickRoutes.map((route) => {
            // Count pending/booked bilties on this exact route
            const routeBilties = bilties.filter(
              (b) =>
                (b.fromCity || '').toLowerCase() === route.fromCity.toLowerCase() &&
                (b.toCity || '').toLowerCase() === route.toCity.toLowerCase()
            );

            return (
              <div
                key={route.id}
                className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700 hover:border-emerald-500/60 rounded-xl p-3.5 flex flex-col justify-between transition-all group"
              >
                <div>
                  <div className="flex items-center justify-between text-xs mb-2">
                    {/* Route Corridor Title */}
                    <div className="flex items-center gap-1.5 font-black text-sm">
                      <span className="text-white">{route.fromCity}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-emerald-400 group-hover:translate-x-0.5 transition-transform" />
                      <span className="text-emerald-300">{route.toCity}</span>
                    </div>

                    {route.routeCode && (
                      <span className="text-[10px] font-mono bg-slate-900 text-slate-400 border border-slate-700 px-1.5 py-0.5 rounded font-bold">
                        {route.routeCode}
                      </span>
                    )}
                  </div>

                  {/* Corridor Specs */}
                  <div className="flex items-center gap-3 text-[11px] text-slate-400 mb-2">
                    {route.distanceKm && (
                      <span className="flex items-center gap-1">
                        <Navigation className="w-3 h-3 text-slate-400" />
                        <span>{route.distanceKm.toLocaleString()} Km</span>
                      </span>
                    )}
                    {route.approxTransitTime && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{route.approxTransitTime}</span>
                      </span>
                    )}
                    {route.defaultFreightRate && (
                      <span className="font-mono text-emerald-400 font-bold">
                        {settings.currencySymbol} {route.defaultFreightRate.toLocaleString()}
                      </span>
                    )}
                  </div>

                  {route.remarks && (
                    <div className="text-[11px] text-slate-400 truncate mb-3" title={route.remarks}>
                      {route.remarks}
                    </div>
                  )}
                </div>

                {/* Waiting Bilties & 1-Click Action Buttons */}
                <div className="pt-2.5 border-t border-slate-700/80 flex items-center justify-between gap-2">
                  <div className="text-[11px]">
                    {routeBilties.length > 0 ? (
                      <span className="text-emerald-400 font-bold flex items-center gap-1 font-mono">
                        <Sparkles className="w-3 h-3" />
                        <span>{routeBilties.length} BTs Ready</span>
                      </span>
                    ) : (
                      <span className="text-slate-500">Express Corridor</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        onNavigate('bilty', undefined, { fromCity: route.fromCity, toCity: route.toCity })
                      }
                      className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-[11px] font-bold transition-colors"
                      title="Create Bilty for this route"
                    >
                      + Bilty
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onNavigate('memo', 'new', { fromCity: route.fromCity, toCity: route.toCity })
                      }
                      className="px-2.5 py-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 rounded text-[11px] font-black transition-all shadow-sm"
                      title="Dispatch Memo for this route"
                    >
                      Dispatch Memo
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
