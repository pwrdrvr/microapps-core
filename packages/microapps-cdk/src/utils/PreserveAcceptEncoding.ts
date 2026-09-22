/** Viewer-request code: preserve preferences before CloudFront normalizes Accept-Encoding. */
export const preserveAcceptEncodingCode = `function handler(event) {
  var request = event.request;
  var header = request.headers['accept-encoding'];
  var raw = header ? (header.multiValue ? header.multiValue.map(function(h) { return h.value; }).join(',') : header.value) : '';
  // Always overwrite viewer-supplied copies of this internal header.
  request.headers['x-microapps-accept-encoding'] = { value: raw };
  var weights = {};
  raw.toLowerCase().split(',').forEach(function(part) {
    var pieces = part.trim().split(';');
    var name = pieces.shift().trim();
    if (!name) return;
    var weight = 1;
    pieces.forEach(function(parameter) {
      var pair = parameter.trim().split('=');
      if (pair[0] === 'q') {
        weight = /^(0(?:\\.\\d{0,3})?|1(?:\\.0{0,3})?)$/.test(pair[1] || '') ? Number(pair[1]) : 0;
      }
    });
    weights[name] = weight;
  });
  function weight(name) {
    return weights[name] !== undefined ? weights[name] : (weights['*'] || 0);
  }
  var best = Math.max(weight('br'), weight('gzip'), weights.identity || 0);
  var accepted = ['br', 'gzip'].filter(function(name) { return weight(name) > 0 && weight(name) === best; });
  // Automatic compression must not use an explicitly refused or less preferred encoding.
  if (accepted.length) request.headers['accept-encoding'] = { value: accepted.join(',') };
  else delete request.headers['accept-encoding'];
  return request;
}`;
