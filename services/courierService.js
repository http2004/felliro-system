const https = require('https');

/**
 * Fetch live parcel tracking information from Fardar Express Domestic
 * @param {string} trackingNumber - Courier Waybill / Barcode (e.g. IND1156565)
 * @returns {Promise<Object>}
 */
async function fetchCourierTracking(trackingNumber) {
  if (!trackingNumber || typeof trackingNumber !== 'string') {
    return { success: false, message: 'Invalid tracking number provided' };
  }

  const cleanTrackingNo = trackingNumber.trim();
  const postData = `track_number=${encodeURIComponent(cleanTrackingNo)}`;

  return new Promise((resolve) => {
    const options = {
      hostname: 'www.fdedomestic.com',
      port: 443,
      path: '/track.php',
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html, */*; q=0.01',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': 'https://www.fdedomestic.com/',
        'Origin': 'https://www.fdedomestic.com',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 8000
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = parseFdeTrackingHtml(data, cleanTrackingNo);
          resolve(parsed);
        } catch (err) {
          resolve({
            success: false,
            courierName: 'Fardar Express Domestic',
            trackingNumber: cleanTrackingNo,
            message: 'Failed to parse courier response'
          });
        }
      });
    });

    req.on('error', (err) => {
      resolve({
        success: false,
        courierName: 'Fardar Express Domestic',
        trackingNumber: cleanTrackingNo,
        message: 'Courier tracking server temporarily unreachable'
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        success: false,
        courierName: 'Fardar Express Domestic',
        trackingNumber: cleanTrackingNo,
        message: 'Courier tracking request timed out'
      });
    });

    req.write(postData);
    req.end();
  });
}

/**
 * Parse HTML returned by FDE track.php
 */
function parseFdeTrackingHtml(html, requestedTrackingNo) {
  if (!html || html.includes('Access denied')) {
    return {
      success: false,
      courierName: 'Fardar Express Domestic',
      trackingNumber: requestedTrackingNo,
      message: 'Access denied by courier gateway'
    };
  }

  if (html.includes('Parcel not found') || html.includes('No Data Found') || html.trim() === '') {
    return {
      success: false,
      courierName: 'Fardar Express Domestic',
      trackingNumber: requestedTrackingNo,
      message: 'Parcel not found in courier system'
    };
  }

  // Extract Tracking ID
  const idMatch = html.match(/Tracking\s*ID\s*:\s*([^\s<]+)/i);
  // Extract Status (e.g. "Waiting", "In Transit", "Dispatched", "Delivered", "Removed", "Returned")
  const statusMatch = html.match(/<p class="text-muted fs-25">\s*([\s\S]*?)\s*<\/p>/i);
  // Extract Branch / Location
  const branchMatch = html.match(/<a class="text-primary[^>]*>\s*([\s\S]*?)\s*<\/a>/i);
  // Extract Last Update timestamp
  const updateMatch = html.match(/Last Update\s*:\s*([^<]*)/i);

  const trackingId = idMatch ? idMatch[1].trim() : requestedTrackingNo;
  const status = statusMatch ? statusMatch[1].trim() : 'Active';
  const branch = branchMatch ? branchMatch[1].trim() : null;
  const lastUpdate = updateMatch ? updateMatch[1].trim() : null;

  return {
    success: true,
    courierName: 'Fardar Express Domestic',
    trackingNumber: trackingId,
    courierStatus: status,
    branch: branch || 'Hub',
    lastUpdate: lastUpdate || null,
    courierUrl: 'https://www.fdedomestic.com/'
  };
}

module.exports = {
  fetchCourierTracking
};
