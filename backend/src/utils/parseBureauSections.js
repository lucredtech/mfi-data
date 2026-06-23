function parseBureauSections(result) {
  const arr = result?.data ?? (Array.isArray(result) ? result : []);
  const sec = {};
  arr.forEach(item => {
    const key = Object.keys(item || {})[0];
    if (key) sec[key] = item[key];
  });
  return sec;
}

module.exports = parseBureauSections;
