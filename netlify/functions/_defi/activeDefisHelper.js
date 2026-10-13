function toDate(val) {
  if (!val) return new Date(0);
  if (val.toDate) return val.toDate();
  return new Date(val);
}

function getActiveDefis(profileData) {
  const now = new Date();

  if (Array.isArray(profileData.activeDefis)) {
    return profileData.activeDefis
      .map(ad => ({
        slug: ad.slug,
        titre: ad.titre || 'Mon défi',
        audience: ad.audience || 'tous',
        expiresAt: toDate(ad.expiresAt),
      }))
      .filter(ad => ad.expiresAt > now);
  }

  if (profileData.activeDefi && profileData.activeDefi.slug) {
    const exp = toDate(profileData.activeDefi.expiresAt);
    if (exp > now) {
      return [{
        slug: profileData.activeDefi.slug,
        titre: 'Mon défi',
        audience: 'tous',
        expiresAt: exp,
      }];
    }
  }

  return [];
}

function canCreateDefi(activeDefis) {
  return activeDefis.length < 3;
}

function buildActiveDefisUpdate(currentActiveDefis, newEntry) {
  return [...currentActiveDefis, newEntry];
}

module.exports = { getActiveDefis, canCreateDefi, buildActiveDefisUpdate };
