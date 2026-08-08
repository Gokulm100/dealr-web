import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Search,
  X,
  Clock,
  Tag,
  MapPin,
  Layers,
  CornerDownLeft,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  buildSearchSuggestions,
  clearRecentSearches,
  loadRecentSearches,
  saveRecentSearch,
} from '../utils/searchSuggestions';

const DEBOUNCE_MS = 320;

function SuggestionIcon({ type }) {
  if (type === 'recent') return <Clock size={15} strokeWidth={2.2} />;
  if (type === 'location') return <MapPin size={15} strokeWidth={2.2} />;
  if (type === 'subcategory') return <Layers size={15} strokeWidth={2.2} />;
  if (type === 'category') return <Tag size={15} strokeWidth={2.2} />;
  return <Search size={15} strokeWidth={2.2} />;
}

export default function SearchBar() {
  const {
    categories,
    locations,
    searchQuery,
    setSearchQuery,
    setSelectedCategory,
    setSelectedCategoryId,
    setSubCategories,
    setSelectedSubCategory,
    setFilterLocation,
    setPage,
    navigate,
    currentPage,
  } = useApp();

  const [query, setQuery] = useState(searchQuery || '');
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [recent, setRecent] = useState(() => loadRecentSearches());
  const wrapRef = useRef(null);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);
  const skipDebounceRef = useRef(false);

  useEffect(() => {
    setQuery(searchQuery || '');
  }, [searchQuery]);

  useEffect(() => {
    const onDoc = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const suggestions = useMemo(
    () => buildSearchSuggestions({
      query,
      categories,
      locations,
      recent,
      limit: 8,
    }),
    [query, categories, locations, recent],
  );

  useEffect(() => {
    setActiveIdx(0);
  }, [query, open]);

  const cancelDebounce = () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  };

  const goHomeIfNeeded = () => {
    if (currentPage !== 'home') navigate('home');
  };

  const applyTextSearch = (text, { persistRecent = true } = {}) => {
    const next = String(text || '').trim();
    cancelDebounce();
    skipDebounceRef.current = true;
    setQuery(next);
    setSearchQuery(next);
    setPage(1);
    goHomeIfNeeded();
    if (persistRecent && next) setRecent(saveRecentSearch(next));
    setOpen(false);
  };

  const applySuggestion = (item) => {
    if (!item) return;

    if (item.type === 'category') {
      cancelDebounce();
      skipDebounceRef.current = true;
      setSelectedCategory(item.categoryName);
      setSelectedCategoryId(item.categoryId || '');
      setSubCategories(item.subCategories || []);
      setSelectedSubCategory('');
      setQuery('');
      setSearchQuery('');
      setPage(1);
      goHomeIfNeeded();
      setOpen(false);
      return;
    }

    if (item.type === 'subcategory') {
      cancelDebounce();
      skipDebounceRef.current = true;
      setSelectedCategory(item.categoryName);
      setSelectedCategoryId(item.categoryId || '');
      setSubCategories(item.subCategories || []);
      setSelectedSubCategory(item.subCategory || '');
      setQuery('');
      setSearchQuery('');
      setPage(1);
      goHomeIfNeeded();
      setOpen(false);
      return;
    }

    if (item.type === 'location') {
      cancelDebounce();
      skipDebounceRef.current = true;
      setFilterLocation(item.location || item.value);
      setQuery('');
      setSearchQuery('');
      setPage(1);
      goHomeIfNeeded();
      setOpen(false);
      return;
    }

    applyTextSearch(item.value);
  };

  // Live debounced search while typing (text query only)
  useEffect(() => {
    if (skipDebounceRef.current) {
      skipDebounceRef.current = false;
      return undefined;
    }

    cancelDebounce();

    const trimmed = query.trim();
    if (trimmed === (searchQuery || '').trim()) return undefined;

    debounceRef.current = setTimeout(() => {
      setSearchQuery(trimmed);
      setPage(1);
      if (trimmed.length >= 2 && currentPage !== 'home') navigate('home');
    }, DEBOUNCE_MS);

    return cancelDebounce;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const handleClear = () => {
    cancelDebounce();
    skipDebounceRef.current = true;
    setQuery('');
    setSearchQuery('');
    setPage(1);
    setOpen(true);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActiveIdx((i) => Math.min(i + 1, Math.max(suggestions.length - 1, 0)));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (open && suggestions[activeIdx]) {
        applySuggestion(suggestions[activeIdx]);
      } else {
        applyTextSearch(query);
      }
    }
  };

  const showPanel = open && (suggestions.length > 0 || !query.trim());

  return (
    <div className={`topbar-search${open ? ' is-open' : ''}`} ref={wrapRef} role="search">
      <Search size={16} className="topbar-search-icon" aria-hidden />
      <input
        ref={inputRef}
        type="search"
        role="combobox"
        enterKeyHint="search"
        autoComplete="off"
        spellCheck={false}
        placeholder="Search mobiles, Kochi, bikes…"
        value={query}
        aria-label="Search listings"
        aria-expanded={showPanel}
        aria-controls="dealr-search-suggestions"
        aria-autocomplete="list"
        aria-haspopup="listbox"
        aria-activedescendant={showPanel && suggestions[activeIdx] ? suggestions[activeIdx].id : undefined}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
      />
      {query ? (
        <button type="button" className="topbar-search-clear" onClick={handleClear} aria-label="Clear search">
          <X size={16} />
        </button>
      ) : null}

      {showPanel && (
        <div className="search-suggest" id="dealr-search-suggestions" role="listbox">
          {!query.trim() && recent.length > 0 && (
            <div className="search-suggest-head">
              <span>Recent</span>
              <button
                type="button"
                className="search-suggest-clear-recent"
                onClick={() => setRecent(clearRecentSearches())}
              >
                Clear
              </button>
            </div>
          )}
          {!query.trim() && recent.length === 0 && categories.length > 0 && (
            <div className="search-suggest-head">
              <span>Browse categories</span>
            </div>
          )}
          {suggestions.length === 0 && query.trim() && (
            <p className="search-suggest-empty">No quick matches — press Enter to search listings</p>
          )}
          <ul className="search-suggest-list">
            {suggestions.map((item, idx) => (
              <li key={item.id} role="presentation">
                <button
                  type="button"
                  id={item.id}
                  role="option"
                  aria-selected={idx === activeIdx}
                  className={`search-suggest-item${idx === activeIdx ? ' is-active' : ''}`}
                  onMouseEnter={() => setActiveIdx(idx)}
                  onClick={() => applySuggestion(item)}
                >
                  <span className={`search-suggest-icon search-suggest-icon--${item.type}`}>
                    <SuggestionIcon type={item.type} />
                  </span>
                  <span className="search-suggest-copy">
                    <span className="search-suggest-label">
                      {item.type === 'query' ? (
                        <>Search for <strong>{item.label}</strong></>
                      ) : (
                        item.label
                      )}
                    </span>
                    <span className="search-suggest-meta">{item.meta}</span>
                  </span>
                  {idx === activeIdx && (
                    <span className="search-suggest-enter" aria-hidden>
                      <CornerDownLeft size={13} />
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
