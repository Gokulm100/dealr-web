import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  MapPin, IndianRupee, SlidersHorizontal, X, ChevronDown, RotateCcw,
  Search, Sparkles, ArrowUpDown,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { filterLocationsByQuery } from '../utils/locationFilter';

const PRICE_PRESETS = [
  { id: 'any', label: 'Any', min: '', max: '' },
  { id: 'under5k', label: 'Under ₹5K', min: '', max: '5000' },
  { id: '5k-20k', label: '₹5K – ₹20K', min: '5000', max: '20000' },
  { id: '20k-1l', label: '₹20K – ₹1L', min: '20000', max: '100000' },
  { id: 'above1l', label: '₹1L+', min: '100000', max: '' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'price_low', label: 'Price: Low to high' },
  { value: 'price_high', label: 'Price: High to low' },
  { value: 'most_viewed', label: 'Most viewed' },
];

function formatInr(n) {
  if (n === '' || n == null) return '';
  const num = Number(n);
  if (Number.isNaN(num)) return n;
  return num.toLocaleString('en-IN');
}

export default function FilterBar() {
  const {
    categories, selectedCategory, setSelectedCategory,
    subCategories, setSubCategories,
    selectedSubCategory, setSelectedSubCategory,
    setSelectedCategoryId,
    locations, filterLocation, setFilterLocation,
    priceMin, setPriceMin, priceMax, setPriceMax,
    listingSort, setListingSort,
    searchQuery, setSearchQuery, activeFilterCount, clearAllFilters,
    listings, loading,
    setPage,
  } = useApp();

  const [locationQuery, setLocationQuery] = useState(filterLocation);
  const [locationOpen, setLocationOpen] = useState(false);
  const [priceOpen, setPriceOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const locationRef = useRef(null);
  const priceRef = useRef(null);

  const resultCount = listings.length;

  useEffect(() => {
    setLocationQuery(filterLocation);
  }, [filterLocation]);

  useEffect(() => {
    const onDocClick = (e) => {
      if (locationRef.current && !locationRef.current.contains(e.target)) {
        setLocationOpen(false);
      }
      if (priceRef.current && !priceRef.current.contains(e.target)) {
        setPriceOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const closeDropdowns = () => {
    setLocationOpen(false);
    setPriceOpen(false);
  };

  const allCats = ['All', ...categories.map(c => c.name)];

  const handleCategoryClick = (cat) => {
    if (cat === 'All') {
      setSelectedCategory('All');
      setSelectedCategoryId('');
      setSubCategories([]);
      setSelectedSubCategory('');
    } else {
      const catObj = categories.find(c => c.name === cat);
      setSelectedCategory(cat);
      setSelectedCategoryId(catObj?.id || '');
      setSubCategories(catObj?.subCategories || []);
      setSelectedSubCategory('');
    }
    setPage(1);
  };

  const handleSubCategoryClick = (sub) => {
    setSelectedSubCategory(prev => prev === sub ? '' : sub);
    setPage(1);
  };

  const activePricePreset = PRICE_PRESETS.find(
    p => String(p.min) === String(priceMin) && String(p.max) === String(priceMax)
  )?.id || (priceMin || priceMax ? 'custom' : 'any');

  const applyPricePreset = (preset) => {
    setPriceMin(preset.min);
    setPriceMax(preset.max);
    setPage(1);
    setPriceOpen(false);
  };

  const priceLabel = activePricePreset === 'any'
    ? 'Any price'
    : activePricePreset === 'custom'
      ? [priceMin && `From ₹${formatInr(priceMin)}`, priceMax && `Up to ₹${formatInr(priceMax)}`].filter(Boolean).join(' · ') || 'Custom range'
      : PRICE_PRESETS.find(p => p.id === activePricePreset)?.label || 'Price';

  const filteredLocations = useMemo(
    () => filterLocationsByQuery(locations, locationQuery, { limit: 12 }),
    [locations, locationQuery],
  );

  const applyLocation = (value) => {
    setFilterLocation(value);
    setLocationQuery(value);
    closeDropdowns();
    setPage(1);
  };

  const removeFilter = (key) => {
    switch (key) {
      case 'category':
        setSelectedCategory('All');
        setSelectedCategoryId('');
        setSubCategories([]);
        setSelectedSubCategory('');
        break;
      case 'sub':
        setSelectedSubCategory('');
        break;
      case 'location':
        setFilterLocation('');
        setLocationQuery('');
        break;
      case 'price':
        setPriceMin('');
        setPriceMax('');
        break;
      default:
        break;
    }
    setPage(1);
  };

  const handleClearAll = () => {
    clearAllFilters();
    setLocationQuery('');
    closeDropdowns();
  };

  const openLocation = () => {
    setPriceOpen(false);
    setLocationOpen(v => !v);
  };

  const openPrice = () => {
    setLocationOpen(false);
    setPriceOpen(v => !v);
  };

  return (
    <div className="filter-panel">
      <div className="filter-panel-accent" aria-hidden="true" />

      <header className="filter-panel-header">
        <div className="filter-panel-heading">
          <div className="filter-panel-icon">
            <SlidersHorizontal size={18} strokeWidth={2.25} />
          </div>
          <div>
            <h2 className="filter-panel-title">Find your deal</h2>
            <p className="filter-panel-subtitle">
              {resultCount} {resultCount === 1 ? 'listing' : 'listings'}
              {activeFilterCount > 0 ? ` · ${activeFilterCount} filter${activeFilterCount > 1 ? 's' : ''} on` : ''}
            </p>
          </div>
          {activeFilterCount > 0 && (
            <span className="filter-count-badge">{activeFilterCount}</span>
          )}
        </div>
        <div className="filter-header-actions">
          <label className="filter-sort-control">
            <ArrowUpDown size={14} aria-hidden />
            <select
              className="filter-sort-select"
              value={listingSort}
              onChange={(e) => {
                setListingSort(e.target.value);
                setPage(1);
              }}
              disabled={loading}
              aria-label="Sort listings"
            >
              {SORT_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="filter-toggle-more"
            onClick={() => setMoreOpen(v => !v)}
            aria-expanded={moreOpen}
          >
            {moreOpen ? 'Less' : 'Filters'}
            <ChevronDown size={16} className={moreOpen ? 'filter-chevron open' : 'filter-chevron'} />
          </button>
          {activeFilterCount > 0 && (
            <button type="button" className="filter-reset-btn" onClick={handleClearAll}>
              <RotateCcw size={14} />
              Reset
            </button>
          )}
        </div>
      </header>

      {searchQuery && (
        <div className="filter-search-banner">
          <Search size={15} />
          <span>Results for <strong>{searchQuery}</strong></span>
          <button
            type="button"
            className="filter-search-banner-clear"
            aria-label="Clear search"
            onClick={() => {
              setSearchQuery('');
              setPage(1);
            }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      <section className="filter-section filter-section-categories">
        <span className="filter-section-label">Categories</span>
        <div className="pills-scroll-wrap">
          <div className="pills-row">
            {allCats.map(cat => (
              <button
                key={cat}
                type="button"
                className={`pill${selectedCategory === cat ? ' active' : ''}`}
                onClick={() => handleCategoryClick(cat)}
              >
                {cat === 'All' && <Sparkles size={13} className="pill-icon" />}
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {subCategories.length > 0 && (
        <section className="filter-section filter-section-sub">
          <span className="filter-section-label">Refine by type</span>
          <div className="pills-scroll-wrap">
            <div className="sub-pills-row">
              {subCategories.map(sub => {
                const name = typeof sub === 'string' ? sub : sub.name;
                return (
                  <button
                    key={name}
                    type="button"
                    className={`pill sub${selectedSubCategory === name ? ' active' : ''}`}
                    onClick={() => handleSubCategoryClick(name)}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <div className={`filter-body${moreOpen ? ' is-open' : ''}`}>
        <div className="filter-controls-card">
          <div className="filter-controls">
            <div className="filter-control" ref={locationRef}>
              <span className="filter-control-label">Location</span>
              <button
                type="button"
                className={`filter-trigger${filterLocation ? ' is-active' : ''}${locationOpen ? ' is-open' : ''}`}
                onClick={openLocation}
                aria-expanded={locationOpen}
              >
                <span className="filter-trigger-icon"><MapPin size={16} /></span>
                <span className="filter-trigger-text">{filterLocation || 'Anywhere'}</span>
                <ChevronDown size={16} className={`filter-chevron${locationOpen ? ' open' : ''}`} />
              </button>
              {locationOpen && (
                <div className="filter-dropdown-panel">
                  <div className="filter-dropdown-search-wrap">
                    <Search size={15} className="filter-dropdown-search-icon" />
                    <input
                      type="text"
                      className="filter-dropdown-search"
                      placeholder="Locality, city, or district..."
                      value={locationQuery}
                      autoFocus
                      onChange={e => {
                        setLocationQuery(e.target.value);
                        if (!e.target.value) {
                          setFilterLocation('');
                          setPage(1);
                        }
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && locationQuery.trim()) {
                          const exact = filteredLocations.find(
                            (l) => l.name.toLowerCase() === locationQuery.trim().toLowerCase()
                          );
                          applyLocation(exact?.name || locationQuery.trim());
                        }
                      }}
                    />
                  </div>
                  <div className="filter-dropdown-list">
                    <button
                      type="button"
                      className={`filter-dropdown-option${!filterLocation ? ' selected' : ''}`}
                      onClick={() => applyLocation('')}
                    >
                      Anywhere
                    </button>
                    {!locationQuery.trim() && filteredLocations.length > 0 && (
                      <p className="filter-dropdown-hint" style={{ padding: '8px 14px 4px' }}>Popular nearby</p>
                    )}
                    {filteredLocations.map(loc => (
                      <button
                        key={loc.id || loc.name}
                        type="button"
                        className={`filter-dropdown-option${filterLocation === loc.name ? ' selected' : ''}`}
                        onClick={() => applyLocation(loc.name)}
                      >
                        <MapPin size={14} />
                        <span>
                          {loc.name}
                          {loc.district && loc.district !== loc.city ? (
                            <small className="filter-dropdown-option-meta"> · {loc.district}</small>
                          ) : null}
                        </span>
                      </button>
                    ))}
                    {locationQuery.trim() && !filteredLocations.some(l => l.name.toLowerCase() === locationQuery.toLowerCase()) && (
                      <button
                        type="button"
                        className="filter-dropdown-option filter-dropdown-custom"
                        onClick={() => applyLocation(locationQuery.trim())}
                      >
                        Search &quot;{locationQuery.trim()}&quot;
                      </button>
                    )}
                    {filteredLocations.length === 0 && locationQuery.trim() && (
                      <p className="filter-dropdown-empty">No matching places — press Enter to search anyway</p>
                    )}
                    {filteredLocations.length === 0 && !locationQuery.trim() && (
                      <p className="filter-dropdown-empty">Locations are still loading…</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="filter-control filter-control-price" ref={priceRef}>
              <span className="filter-control-label">Budget</span>
              <button
                type="button"
                className={`filter-trigger${activePricePreset !== 'any' ? ' is-active' : ''}${priceOpen ? ' is-open' : ''}`}
                onClick={openPrice}
                aria-expanded={priceOpen}
              >
                <span className="filter-trigger-icon"><IndianRupee size={16} /></span>
                <span className="filter-trigger-text">{priceLabel}</span>
                <ChevronDown size={16} className={`filter-chevron${priceOpen ? ' open' : ''}`} />
              </button>
              {priceOpen && (
                <div className="filter-dropdown-panel filter-price-panel">
                  <p className="filter-dropdown-hint">Quick ranges</p>
                  <div className="price-preset-grid">
                    {PRICE_PRESETS.map(preset => (
                      <button
                        key={preset.id}
                        type="button"
                        className={`price-preset-chip${activePricePreset === preset.id ? ' active' : ''}`}
                        onClick={() => applyPricePreset(preset)}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                  <p className="filter-dropdown-hint">Or set your own</p>
                  <div className="price-custom-row">
                    <div className="price-input-wrap">
                      <span className="price-input-prefix">₹</span>
                      <input
                        type="number"
                        className="price-input"
                        placeholder="Min"
                        min="0"
                        value={priceMin}
                        onChange={e => { setPriceMin(e.target.value); setPage(1); }}
                      />
                    </div>
                    <span className="price-range-sep">—</span>
                    <div className="price-input-wrap">
                      <span className="price-input-prefix">₹</span>
                      <input
                        type="number"
                        className="price-input"
                        placeholder="Max"
                        min="0"
                        value={priceMax}
                        onChange={e => { setPriceMax(e.target.value); setPage(1); }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>

        {activeFilterCount > 0 && (
          <div className="active-filters-block">
            <span className="active-filters-label">Applied</span>
            <div className="active-filters-row">
              {selectedCategory !== 'All' && (
                <span className="active-filter-tag">
                  {selectedCategory}
                  <button type="button" aria-label="Remove category" onClick={() => removeFilter('category')}>
                    <X size={12} />
                  </button>
                </span>
              )}
              {selectedSubCategory && (
                <span className="active-filter-tag">
                  {selectedSubCategory}
                  <button type="button" aria-label="Remove subcategory" onClick={() => removeFilter('sub')}>
                    <X size={12} />
                  </button>
                </span>
              )}
              {filterLocation && (
                <span className="active-filter-tag">
                  <MapPin size={12} />
                  {filterLocation}
                  <button type="button" aria-label="Remove location" onClick={() => removeFilter('location')}>
                    <X size={12} />
                  </button>
                </span>
              )}
              {(priceMin || priceMax) && (
                <span className="active-filter-tag">
                  <IndianRupee size={12} />
                  {priceLabel}
                  <button type="button" aria-label="Remove price" onClick={() => removeFilter('price')}>
                    <X size={12} />
                  </button>
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
