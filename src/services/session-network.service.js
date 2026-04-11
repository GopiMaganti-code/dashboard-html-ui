;(function(global){
  /**
   * Normalizes GET /api/v1/session-info (or equivalent) for UI.
   * No dummy IPs — missing values stay null for display as "—".
   *
   * Expected API shape (all fields optional):
   * {
   *   connection_ip, current_ip, ip_changed, previous_ip,
   *   connection_at,
   *   location: { city, country },
   *   connection_location: { city, country },
   *   isp_type | asn_type: 'residential' | 'datacenter' | 'hosting' | 'unknown',
   *   country_changed: boolean,
   *   ip_history: [{ at, ip, city, country, isp_type }]
   * }
   */
  function str(v){
    if (v == null) return null;
    var s = String(v).trim();
    return s ? s : null;
  }

  function normalizeLocation(obj){
    if (!obj || typeof obj !== 'object') return { city: null, country: null };
    return {
      city: str(obj.city),
      country: str(obj.country)
    };
  }

  function normalizeHistoryEntry(row){
    if (!row || typeof row !== 'object') return null;
    return {
      at: str(row.at || row.timestamp || row.time),
      ip: str(row.ip || row.ip_address),
      city: str(row.city || (row.location && row.location.city)),
      country: str(row.country || (row.location && row.location.country)),
      isp_type: normalizeIspType(row.isp_type || row.ispType)
    };
  }

  function normalizeIspType(raw){
    var s = String(raw || '').trim().toLowerCase();
    if (!s) return 'unknown';
    if (s === 'datacenter' || s === 'hosting' || s === 'dc') return 'datacenter';
    if (s === 'residential' || s === 'isp' || s === 'mobile') return 'residential';
    return s;
  }

  function ispLabel(isp){
    if (isp === 'datacenter' || isp === 'hosting') return 'Datacenter';
    if (isp === 'residential') return 'Residential';
    return 'Unknown';
  }

  /**
   * @returns {object|null} null if payload empty/invalid
   */
  function normalizeSessionInfo(raw){
    if (!raw || typeof raw !== 'object') return null;
    var loc = normalizeLocation(raw.location);
    var connLoc = normalizeLocation(raw.connection_location || raw.connectionLocation);
    var hist = Array.isArray(raw.ip_history) ? raw.ip_history : (Array.isArray(raw.ipHistory) ? raw.ipHistory : []);
    var history = hist.map(normalizeHistoryEntry).filter(Boolean).slice(0, 10);

    var connectionIp = str(raw.connection_ip || raw.connectionIp);
    var currentIp = str(raw.current_ip || raw.currentIp);
    var previousIp = str(raw.previous_ip || raw.previousIp);

    var ipChanged = raw.ip_changed === true || raw.ipChanged === true;
    if (!ipChanged && connectionIp && currentIp && connectionIp !== currentIp) {
      ipChanged = true;
    }
    if (!previousIp && ipChanged && connectionIp && currentIp && connectionIp !== currentIp) {
      previousIp = connectionIp;
    }

    var countryChanged = raw.country_changed === true || raw.countryChanged === true;
    if (!countryChanged && loc.country && connLoc.country && loc.country !== connLoc.country) {
      countryChanged = true;
    }

    return {
      connectionIp: connectionIp,
      currentIp: currentIp,
      previousIp: previousIp,
      ipChanged: ipChanged,
      connectionAt: str(
        raw.connection_at ||
          raw.connectionAt ||
          raw.first_connection_at ||
          raw.firstConnectionAt ||
          raw.initial_login_at ||
          raw.initialLoginAt
      ),
      location: loc,
      connectionLocation: connLoc,
      ispType: normalizeIspType(raw.isp_type || raw.ispType || raw.asn_type || raw.asnType),
      countryChanged: countryChanged,
      ipHistory: history
    };
  }

  /**
   * True when API returned at least one field we can show (otherwise empty object / all null).
   */
  function hasSessionTelemetry(n){
    if (!n) return false;
    if (n.connectionIp || n.currentIp || n.previousIp) return true;
    if (n.connectionAt) return true;
    if (n.location && (n.location.city || n.location.country)) return true;
    if (n.connectionLocation && (n.connectionLocation.city || n.connectionLocation.country)) return true;
    if (n.ispType && n.ispType !== 'unknown') return true;
    if (n.ipChanged || n.countryChanged) return true;
    if (n.ipHistory && n.ipHistory.length > 0) return true;
    return false;
  }

  /**
   * Risk rules: IP change → warning; datacenter → high; country change → critical.
   * @returns {{ level: string, badges: Array<{text:string,cls:string}> }}
   */
  function evaluateSessionRisks(n){
    if (!n) {
      return { level: 'none', badges: [] };
    }
    var badges = [];
    var level = 'none';

    if (n.countryChanged) {
      badges.push({ text: 'Country changed — critical account risk', cls: 'session-risk--critical' });
      level = 'critical';
    }
    if (n.ispType === 'datacenter' || n.ispType === 'hosting') {
      badges.push({ text: 'Datacenter / hosting IP — high detection risk', cls: 'session-risk--high' });
      if (level !== 'critical') level = 'high';
    }
    if (n.ipChanged) {
      badges.push({ text: 'IP changed since connection', cls: 'session-risk--warning' });
      if (level === 'none') level = 'warning';
    }

    return { level: level, badges: badges };
  }

  global.AppSessionNetworkService = {
    normalizeSessionInfo: normalizeSessionInfo,
    hasSessionTelemetry: hasSessionTelemetry,
    evaluateSessionRisks: evaluateSessionRisks,
    ispLabel: ispLabel
  };
})(window);
