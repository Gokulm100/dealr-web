import React, { useState, useEffect, useRef } from 'react';
import { Camera, AlertCircle, X, ChevronLeft, Check, Sparkles } from 'lucide-react';
import { useApp } from '../context/AppContext';
import AiTextArea from '../components/aiTextArea';

const API = process.env.REACT_APP_API_BASE_URL || 'https://e4u-backend.onrender.com';

const KERALA_DISTRICTS = [
  'Thiruvananthapuram', 'Kollam', 'Pathanamthitta', 'Alappuzha', 'Kottayam',
  'Idukki', 'Ernakulam', 'Thrissur', 'Palakkad', 'Malappuram',
  'Kozhikode', 'Wayanad', 'Kannur', 'Kasaragod',
];

export default function PostAdPage() {
  const { user, apiFetch, navigate, showToast, categories, locations, pageExtra, fetchListings, fetchLocations } = useApp();
  const editingAd = pageExtra.ad || null;

  const [title, setTitle] = useState(editingAd?.title || '');
  const [price, setPrice] = useState(editingAd?.price || '');
  const [description, setDescription] = useState(editingAd?.description || '');
  const [selectedCatId, setSelectedCatId] = useState('');
  const [selectedCatName, setSelectedCatName] = useState('');
  const [subCategories, setSubCategories] = useState([]);
  const [selectedSubCat, setSelectedSubCat] = useState('');
  const [locationQuery, setLocationQuery] = useState(editingAd?.location || '');
  const [locationDropdown, setLocationDropdown] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [newLocation, setNewLocation] = useState(null); // structured form for an unlisted location
  const [districtQuery, setDistrictQuery] = useState('');
  const [districtDropdown, setDistrictDropdown] = useState(false);
  const [savingLocation, setSavingLocation] = useState(false);
  const [images, setImages] = useState([]);
  const [existingImages, setExistingImages] = useState(editingAd?.images || []);
  const [submitting, setSubmitting] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [visionLoading, setVisionLoading] = useState(false);
  const [aiDraftMeta, setAiDraftMeta] = useState(null);
  const [descInsights, setDescInsights] = useState({ total: 0, completed: 0, missing: 0, progress: 0, nextMissingLabel: '' });
  const fileRef = useRef(null);

  const filteredLocations = locations.filter(l =>
    l.name.toLowerCase().includes(locationQuery.toLowerCase())
  ).slice(0, 20);

  const resolveLocation = () => {
    if (selectedLocation?.name) return selectedLocation;
    const q = locationQuery.trim();
    if (!q) return null;
    const match = locations.find(l => l.name.toLowerCase() === q.toLowerCase());
    return match || { id: null, name: q };
  };

  // Distinct districts from existing data, merged with the full Kerala list.
  const districtOptions = [...new Set(locations.map(l => l.district).filter(Boolean))].sort();
  const districtChoices = [...new Set([...districtOptions, ...KERALA_DISTRICTS])].sort();

  const getDistrictChoicesForCity = (cityName) => {
    const city = String(cityName || '').trim().toLowerCase();
    if (!city) return districtChoices;
    const fromData = [...new Set(
      locations
        .filter(l =>
          l.city?.toLowerCase() === city
          || l.district?.toLowerCase() === city
        )
        .map(l => l.district)
        .filter(Boolean),
    )].sort();
    if (fromData.length) return fromData;
    return districtChoices;
  };

  const queryMatchesExisting = locations.some(
    l => l.name.toLowerCase() === locationQuery.trim().toLowerCase()
  );

  const suggestDistrictForCity = (cityName, currentDistrict = '') => {
    const city = String(cityName || '').trim();
    if (!city) return '';
    const choices = getDistrictChoicesForCity(city);
    if (currentDistrict && choices.includes(currentDistrict)) return currentDistrict;
    const exactDistrict = KERALA_DISTRICTS.find(d => d.toLowerCase() === city.toLowerCase());
    if (exactDistrict && choices.includes(exactDistrict)) return exactDistrict;
    if (choices.length === 1) return choices[0];
    return '';
  };

  const handleNewLocationCityChange = (city) => {
    setNewLocation(p => ({ ...p, city }));
  };

  const districtChoicesForForm = newLocation?.city
    ? getDistrictChoicesForCity(newLocation.city)
    : [];

  const filteredDistricts = districtChoicesForForm.filter(d =>
    d.toLowerCase().includes(districtQuery.trim().toLowerCase()),
  ).slice(0, 20);

  const pickDistrict = (district) => {
    setNewLocation(p => ({ ...p, district }));
    setDistrictQuery(district);
    setDistrictDropdown(false);
  };

  const handleDistrictQueryChange = (q) => {
    setDistrictQuery(q);
    setDistrictDropdown(q.trim().length > 0);
    const match = districtChoicesForForm.find(
      d => d.toLowerCase() === q.trim().toLowerCase(),
    );
    setNewLocation(p => ({ ...p, district: match || '' }));
  };

  const showDistrictList = districtDropdown
    && districtQuery.trim().length > 0
    && filteredDistricts.length > 0;

  const resetDistrictSearch = () => {
    setDistrictQuery('');
    setDistrictDropdown(false);
  };

  const confirmCityStep = () => {
    const city = newLocation?.city?.trim();
    if (!city) {
      showToast('Please enter a city.', 'error');
      return;
    }
    const district = suggestDistrictForCity(city);
    setNewLocation(p => ({ ...p, step: 'district', district }));
    setDistrictQuery(district || '');
    setDistrictDropdown(false);
  };

  const goBackToCityStep = () => {
    setNewLocation(p => ({ ...p, step: 'city', district: '' }));
    resetDistrictSearch();
  };

  // Open the form to capture details for a brand-new location.
  const openNewLocationForm = () => {
    const q = locationQuery.trim();
    const parts = q.split(',').map(s => s.trim()).filter(Boolean);
    setLocationDropdown(false);
    resetDistrictSearch();
    setNewLocation({
      locality: parts[0] || q,
      city: parts[1] || '',
      district: '',
      step: 'city',
    });
  };

  const saveNewLocation = async () => {
    const { locality, district, city } = newLocation || {};
    if (!locality?.trim() || !district?.trim() || !city?.trim()) {
      showToast('Please enter city and district.', 'error');
      return;
    }
    setSavingLocation(true);
    try {
      const token = localStorage.getItem('authToken');
      const res = await apiFetch('/api/users/locations/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          locality: locality.trim(),
          district: district.trim(),
          city: city.trim(),
        }),
      });
      const saved = res?.data;
      const name = `${saved?.locality || locality.trim()}, ${saved?.city || city.trim()}`;
      await fetchLocations();
      setSelectedLocation({ id: saved?._id || null, name });
      setLocationQuery(name);
      setNewLocation(null);
      resetDistrictSearch();
      showToast('Location added!', 'success');
    } catch {
      showToast('Could not add location. Please try again.', 'error');
    } finally {
      setSavingLocation(false);
    }
  };

  useEffect(() => {
    if (!editingAd?.location || !locations.length) return;
    const match = locations.find(
      l => l.name === editingAd.location
        || l.name.toLowerCase() === editingAd.location.toLowerCase(),
    );
    if (match) {
      setSelectedLocation(match);
      setLocationQuery(match.name);
    } else {
      setLocationQuery(editingAd.location);
      setSelectedLocation({ id: null, name: editingAd.location });
    }
  }, [editingAd, locations]);

  useEffect(() => {
    if (editingAd) {
      const cat = categories.find(c => c.id === editingAd.categoryId || c.name === editingAd.category);
      if (cat) {
        setSelectedCatId(cat.id);
        setSelectedCatName(cat.name);
        setSubCategories(cat.subCategories || []);
        setSelectedSubCat(editingAd.subCategory || '');
      }
    }
  }, [editingAd, categories]);

  const handleCatClick = (cat) => {
    setSelectedCatId(cat.id);
    setSelectedCatName(cat.name);
    setSubCategories(cat.subCategories || []);
    setSelectedSubCat('');
  };

  const handleSubCatClick = (sub) => {
    const name = typeof sub === 'string' ? sub : sub.name;
    setSelectedSubCat(prev => prev === name ? '' : name);
  };

  const handleImagePick = (e) => {
    const files = Array.from(e.target.files);
    setImages(prev => [...prev, ...files].slice(0, 8));
    setAiDraftMeta(null);
  };

  const removeImage = (i) => {
    setImages(prev => prev.filter((_, idx) => idx !== i));
    setAiDraftMeta(null);
  };
  const removeExisting = (i) => {
    setExistingImages(prev => prev.filter((_, idx) => idx !== i));
    setAiDraftMeta(null);
  };

  // Helper to animate text like a typewriter
  const animateDescription = (text) => {
    let i = 0;
    setDescription('');
    const interval = setInterval(() => {
      setDescription(prev => {
        if (i >= text.length) {
          clearInterval(interval);
          return prev;
        }
        i++;
        return text.slice(0, i);
      });
    }, 12); // Adjust speed as needed
  };

  const applyCategoryFromName = (categoryName, subCategoryName) => {
    if (!categoryName) return false;
    const cat = categories.find(
      (c) => c.name.toLowerCase() === String(categoryName).toLowerCase(),
    );
    if (!cat) return false;
    setSelectedCatId(cat.id);
    setSelectedCatName(cat.name);
    const subs = cat.subCategories || [];
    setSubCategories(subs);
    if (subCategoryName) {
      const match = subs.find((s) => {
        const name = typeof s === 'string' ? s : s.name;
        return name?.toLowerCase() === String(subCategoryName).toLowerCase();
      });
      setSelectedSubCat(match ? (typeof match === 'string' ? match : match.name) : '');
    } else {
      setSelectedSubCat('');
    }
    return true;
  };

  const fillFormFromAiDraft = (draft) => {
    const applied = [];
    const skipped = [];

    if (draft.title) {
      if (!title.trim()) {
        setTitle(draft.title);
        applied.push('title');
      } else {
        skipped.push('title');
      }
    }

    if (draft.category) {
      if (!selectedCatId) {
        if (applyCategoryFromName(draft.category, draft.subCategory)) {
          applied.push('category');
          if (draft.subCategory) applied.push('subcategory');
        }
      } else {
        skipped.push('category');
      }
    } else if (draft.subCategory && selectedCatId && !selectedSubCat) {
      applyCategoryFromName(selectedCatName, draft.subCategory);
      applied.push('subcategory');
    }

    if (draft.description) {
      if (!description.trim()) {
        animateDescription(draft.description);
        applied.push('description');
      } else {
        skipped.push('description');
      }
    }

    setAiDraftMeta({
      applied,
      skipped,
      confidence: draft.confidence || {},
      notes: draft.notes || '',
      attributes: draft.visibleAttributes || {},
    });

    return { applied, skipped };
  };

  const fillWithAiFromPhotos = async () => {
    if (!user) {
      showToast('Please sign in to use AI fill.', 'error');
      return;
    }
    if (!images.length && !existingImages.length) {
      showToast('Add at least one photo first.', 'error');
      return;
    }
    if (!images.length) {
      showToast('Add a new photo to analyze (existing listing photos aren’t re-uploaded).', 'error');
      return;
    }

    setVisionLoading(true);
    setAiDraftMeta(null);
    try {
      const formData = new FormData();
      images.slice(0, 5).forEach((img) => formData.append('images', img));
      formData.append(
        'categories',
        JSON.stringify(
          categories.map((c) => ({
            name: c.name,
            subCategories: (c.subCategories || []).map((s) =>
              typeof s === 'string' ? s : s.name,
            ),
          })),
        ),
      );

      const token = localStorage.getItem('authToken');
      const res = await fetch(`${API}/api/ads/extractAdFromImages`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.message || body.error || 'AI analysis failed');
      }

      const draft = body.data || {};
      const { applied } = fillFormFromAiDraft(draft);

      if (!applied.length) {
        showToast(
          draft.notes
            || 'Couldn’t fill fields confidently — try clearer photos or fill manually.',
          'error',
        );
      } else {
        showToast(
          `AI filled ${applied.join(', ')}. Review, then add price & location.`,
          'success',
        );
      }
    } catch (err) {
      showToast(err.message || 'AI photo analysis failed.', 'error');
    } finally {
      setVisionLoading(false);
    }
  };

  const generateAiDescription = async () => {
    if (!title || !selectedCatName) { showToast('Please add a title and category first.', 'error'); return; }
    const loc = resolveLocation();
    if (!loc?.name) { showToast('Please select or enter a location first.', 'error'); return; }
    setAiLoading(true);
    try {
      const res = await apiFetch('/api/ads/generateDescriptionUsingAI', {
        method: 'POST',
        body: JSON.stringify({
          title,
          price: price || '',
          category: selectedCatName,
          subCategory: selectedSubCat || 'General',
          description: description || '',
          location: loc.name,
        }),
      });
      if (res.data) animateDescription(res.data);
    } catch { showToast('AI description failed.', 'error'); }
    finally { setAiLoading(false); }
  };

  const aiButtonLabel = (() => {
    if (aiLoading) return '...';
    if (descInsights.total > 0 && descInsights.missing === 0) return 'Refine with AI';
    return 'AI Write';
  })();

  const handleSubmit = async () => {
    if (!user) { showToast('Please sign in to post an ad.', 'error'); return; }
    if (!title.trim()) { showToast('Please enter a title.', 'error'); return; }
    if (!selectedCatId) { showToast('Please select a category.', 'error'); return; }
    if (!price) { showToast('Please enter a price.', 'error'); return; }
    const loc = resolveLocation();
    if (!loc?.name) { showToast('Please select a location.', 'error'); return; }
    const isKnownLocation = !!selectedLocation?.id || queryMatchesExisting;
    if (!isKnownLocation) {
      showToast('New location — please add its details first.', 'error');
      openNewLocationForm();
      return;
    }
    if (description.length < 150) { showToast('Description must be at least 150 characters.', 'error'); return; }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('price', price);
      formData.append('description', description);
      formData.append('category', selectedCatId);
      if (selectedSubCat) formData.append('subCategory', selectedSubCat);
      formData.append('location', loc.name);
      if (existingImages.length) formData.append('existingImages', JSON.stringify(existingImages));
      images.forEach(img => formData.append('images', img));

      const token = localStorage.getItem('authToken');
      const url = editingAd
        ? `${API}/api/ads/edit/${editingAd.id}`
        : `${API}/api/ads/postAdd`;
      const method = editingAd ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) throw new Error('Failed');
      showToast(editingAd ? 'Ad updated!' : 'Ad posted successfully!', 'success');
      fetchListings(1, true);
      fetchLocations();
      navigate('my-ads');
    } catch { showToast(`Failed to ${editingAd ? 'update' : 'post'} ad.`, 'error'); }
    finally { setSubmitting(false); }
  };

  return (
    <div>
      <div className="page-title">{editingAd ? 'Edit Ad' : 'Post Ad'}</div>
      <div className="post-form">
        {!user && (
          <div className="login-warn">
            <AlertCircle size={16} /> You must be logged in to post an ad.
          </div>
        )}

        <div className="form-card">
          <label className="form-label">Photos</label>
          <p className="form-hint">
            Add a few clear photos, then let AI draft the title, category, and description.
            You still set price and location.
          </p>
          <button className="img-picker-btn" type="button" onClick={() => fileRef.current?.click()}>
            <Camera size={18} />
            <span>Add Photos ({images.length + existingImages.length}/8)</span>
          </button>
          <input type="file" ref={fileRef} accept="image/*" multiple style={{ display: 'none' }} onChange={handleImagePick} />

          <div className="img-preview-row">
            {existingImages.map((src, i) => (
              <div key={`ex-${i}`} className="img-preview-wrap">
                <img className="img-preview" src={src} alt="" />
                <button className="img-remove-btn" type="button" onClick={() => removeExisting(i)}>✕</button>
              </div>
            ))}
            {images.map((file, i) => (
              <div key={`new-${i}`} className="img-preview-wrap">
                <img className="img-preview" src={URL.createObjectURL(file)} alt="" />
                <button className="img-remove-btn" type="button" onClick={() => removeImage(i)}>✕</button>
              </div>
            ))}
          </div>

          {(images.length > 0 || existingImages.length > 0) && (
            <button
              type="button"
              className={`ai-fill-btn${visionLoading ? ' is-loading' : ''}`}
              onClick={fillWithAiFromPhotos}
              disabled={visionLoading || !user || images.length === 0}
            >
              <span className="ai-fill-btn-icon" aria-hidden="true">
                {visionLoading ? (
                  <span className="ai-fill-btn-spinner" />
                ) : (
                  <Sparkles size={18} strokeWidth={2.25} />
                )}
              </span>
              <span className="ai-fill-btn-copy">
                <span className="ai-fill-btn-label">
                  {visionLoading ? 'Analyzing photos…' : 'Fill form with AI'}
                </span>
                <span className="ai-fill-btn-sub">
                  {visionLoading
                    ? 'Reading your photos to draft the listing'
                    : 'Drafts title, category & description — you review'}
                </span>
              </span>
            </button>
          )}

          {aiDraftMeta && (
            <div className="ai-draft-banner">
              <div className="ai-draft-banner-title">AI draft ready — review before posting</div>
              <p className="ai-draft-banner-text">
                {aiDraftMeta.applied?.length
                  ? `Filled: ${aiDraftMeta.applied.join(', ')}.`
                  : 'No high-confidence fields were filled.'}
                {' '}Price and location stay manual.
                {aiDraftMeta.skipped?.length
                  ? ` Skipped existing: ${aiDraftMeta.skipped.join(', ')}.`
                  : ''}
              </p>
              {!!Object.keys(aiDraftMeta.confidence || {}).length && (
                <div className="ai-draft-confidence">
                  {Object.entries(aiDraftMeta.confidence).map(([key, value]) => (
                    <span key={key} className={`ai-conf-chip${Number(value) >= 0.6 ? ' is-ok' : ' is-low'}`}>
                      {key} {Math.round(Number(value) * 100)}%
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          <label className="form-label">Title *</label>
          <input className="form-input" type="text" placeholder="e.g. iPhone 13 Pro Max" value={title} onChange={e => setTitle(e.target.value)} />

          <label className="form-label">Category *</label>
          <div className="pills-row" style={{ paddingBottom: 0 }}>
            {categories.map(cat => (
              <button key={cat.id} className={`pill${selectedCatId === cat.id ? ' active' : ''}`} onClick={() => handleCatClick(cat)}>
                {cat.name}
              </button>
            ))}
          </div>

          {subCategories.length > 0 && (
            <>
              <label className="form-label">Subcategory</label>
              <div className="pills-row" style={{ paddingBottom: 0 }}>
                {subCategories.map(sub => {
                  const name = typeof sub === 'string' ? sub : sub.name;
                  return (
                    <button key={name} className={`pill sub${selectedSubCat === name ? ' active' : ''}`} onClick={() => handleSubCatClick(sub)}>
                      {name}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          <label className="form-label">Price (₹) *</label>
          <input className="form-input" type="number" placeholder="e.g. 15000" value={price} onChange={e => setPrice(e.target.value)} />

          <label className="form-label">Location *</label>
          <div className="location-dropdown">
            <input
              className="form-input"
              type="text"
              placeholder="Search city..."
              autoComplete="off"
              value={locationQuery}
              onChange={e => {
                const q = e.target.value;
                setLocationQuery(q);
                setLocationDropdown(true);
                const match = locations.find(l => l.name.toLowerCase() === q.trim().toLowerCase());
                setSelectedLocation(match || null);
              }}
              onFocus={() => setLocationDropdown(true)}
              onBlur={() => {
                setTimeout(() => {
                  setLocationDropdown(false);
                  const q = locationQuery.trim();
                  if (!q) return;
                  const match = locations.find(l => l.name.toLowerCase() === q.toLowerCase());
                  if (match) setSelectedLocation(match);
                }, 200);
              }}
            />
            {locationDropdown && (filteredLocations.length > 0 || (locationQuery.trim() && !queryMatchesExisting)) && (
              <div className="location-list">
                {filteredLocations.map(loc => (
                  <div key={loc.id} className="location-item" onMouseDown={() => { setSelectedLocation(loc); setLocationQuery(loc.name); setLocationDropdown(false); }}>
                    {loc.name}
                  </div>
                ))}
                {locationQuery.trim() && !queryMatchesExisting && (
                  <div
                    className="location-item location-item-add"
                    onMouseDown={(e) => { e.preventDefault(); openNewLocationForm(); }}
                  >
                    + Add &ldquo;{locationQuery.trim()}&rdquo; as a new location
                  </div>
                )}
              </div>
            )}
          </div>

          {newLocation && (
            <div className={`new-location-card${showDistrictList ? ' is-dropdown-open' : ''}`}>
              <div className="new-location-top">
                <div className="new-location-top-left">
                  <p className="new-location-eyebrow">
                    {newLocation.locality}
                    {newLocation.step === 'district' && newLocation.city?.trim() && (
                      <>
                        <span className="new-location-breadcrumb-sep">&gt;</span>
                        <span className="new-location-breadcrumb-city">{newLocation.city.trim()}</span>
                      </>
                    )}
                  </p>
                  <div className="new-location-dots" aria-hidden="true">
                    <span className={`new-location-dot${newLocation.step === 'city' ? ' is-active' : ' is-done'}`} />
                    <span className={`new-location-dot${newLocation.step === 'district' ? ' is-active' : ''}`} />
                  </div>
                </div>
                <button
                  type="button"
                  className="new-location-close"
                  onClick={() => { setNewLocation(null); resetDistrictSearch(); }}
                  disabled={savingLocation}
                  aria-label="Cancel"
                >
                  <X size={18} strokeWidth={1.5} />
                </button>
              </div>

              <div className={`new-location-slider${showDistrictList ? ' is-dropdown-open' : ''}`}>
                <div className={`new-location-track${newLocation.step === 'district' ? ' is-district' : ''}`}>
                  <div className="new-location-slide">
                    <h4 className="new-location-question">What is the city?</h4>
                    <div className="new-location-field-row">
                      <input
                        id="new-location-city"
                        type="text"
                        className="new-location-input"
                        placeholder="e.g. Thiruvananthapuram"
                        value={newLocation.city}
                        onChange={(e) => handleNewLocationCityChange(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            confirmCityStep();
                          }
                        }}
                        disabled={savingLocation}
                        autoFocus
                      />
                      <button
                        type="button"
                        className="new-location-tick"
                        onClick={confirmCityStep}
                        disabled={savingLocation || !newLocation.city?.trim()}
                        aria-label="Continue"
                      >
                        <Check size={17} strokeWidth={2.5} />
                      </button>
                    </div>
                  </div>

                  <div className="new-location-slide">
                    <button
                      type="button"
                      className="new-location-back"
                      onClick={goBackToCityStep}
                      disabled={savingLocation}
                    >
                      <ChevronLeft size={15} strokeWidth={2} />
                      Back
                    </button>
                    <h4 className="new-location-question">What is the district?</h4>
                    <div className="new-location-field-row">
                      <div className="new-location-district-wrap">
                        <input
                          id="new-location-district"
                          type="text"
                          className="new-location-input"
                          placeholder="Search district..."
                          autoComplete="off"
                          value={districtQuery}
                          onChange={(e) => handleDistrictQueryChange(e.target.value)}
                          onBlur={() => {
                            setTimeout(() => setDistrictDropdown(false), 200);
                          }}
                          disabled={savingLocation}
                        />
                        {showDistrictList && (
                          <div className="location-list new-location-district-list">
                            {filteredDistricts.map(d => (
                              <div
                                key={d}
                                className="location-item"
                                onMouseDown={(e) => { e.preventDefault(); pickDistrict(d); }}
                              >
                                {d}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        className="new-location-tick"
                        onClick={saveNewLocation}
                        disabled={savingLocation || !newLocation.district}
                        aria-label="Add location"
                      >
                        {savingLocation
                          ? <span className="new-location-tick-loading">…</span>
                          : <Check size={17} strokeWidth={2.5} />
                        }
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <label className="form-label">
            Description * <span className="char-count">({description.length}/150 min)</span>
          </label>
          <AiTextArea
            value={description}
            onChange={e => setDescription(e.target.value)}
            category={selectedCatName}
            subcategory={selectedSubCat}
            title={title}
            price={price}
            location={selectedLocation?.name || locationQuery}
            onInsightsChange={setDescInsights}
            onAiWrite={generateAiDescription}
            aiLoading={aiLoading}
            aiButtonLabel={aiButtonLabel}
          />
        </div>

        <button className="submit-btn" onClick={handleSubmit} disabled={submitting || !user}>
          {submitting ? 'Submitting...' : (editingAd ? 'Save Changes' : 'Post Ad')}
        </button>
      </div>
    </div>
  );
}
