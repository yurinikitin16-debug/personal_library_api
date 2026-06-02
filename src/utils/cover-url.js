function isLikelyImageUrl(value) {
  if (!value) {
    return false;
  }

  try {
    const url = new URL(value);
    return /\.(avif|gif|jpe?g|png|svg|webp)$/i.test(url.pathname);
  } catch (error) {
    return false;
  }
}

function mapCoverUrl(value) {
  return isLikelyImageUrl(value) ? value : null;
}

module.exports = {
  mapCoverUrl
};
