(function (global) {
  function esc(s) {
    if (
      global.AppUtilsEscape &&
      typeof global.AppUtilsEscape.escapeHtml === "function"
    ) {
      return global.AppUtilsEscape.escapeHtml(s);
    }
    var d = document.createElement("div");
    d.textContent = String(s == null ? "" : s);
    return d.innerHTML;
  }

  function badge(status, running) {
    if (running)
      return '<span class="run-badge run-badge--running">⏳ running</span>';
    if (status === "success")
      return '<span class="run-badge run-badge--success">✅ success</span>';
    if (status === "pending" || status === "queued" || status === "waiting")
      return '<span class="run-badge run-badge--pending">🟡 pending</span>';
    if (status === "failed")
      return '<span class="run-badge run-badge--failed">❌ failed</span>';
    return '<span class="run-badge run-badge--none">No Data</span>';
  }

  function formatRunTs(raw) {
    if (!raw) return "—";
    if (
      global.AppUtilsFormatters &&
      typeof global.AppUtilsFormatters.normalizeTimestampToIso === "function"
    ) {
      var iso = global.AppUtilsFormatters.normalizeTimestampToIso(raw);
      if (iso && global.AppUtilsFormatters.formatIsoForDisplay) {
        return global.AppUtilsFormatters.formatIsoForDisplay(iso);
      }
    }
    return String(raw);
  }

  function kv(label, value, mono) {
    return (
      '<div class="run-kv"><span>' +
      esc(label) +
      "</span><strong" +
      (mono ? ' class="mono"' : "") +
      ">" +
      esc(value || "—") +
      "</strong></div>"
    );
  }

  function renderAcceptanceStatusKv(run, running) {
    return (
      '<div class="run-kv"><span>Status</span><strong>' +
      badge(run && run.status, running) +
      "</strong></div>"
    );
  }

  function displayReferenceSlug(raw) {
    var ref = String(raw || "").trim();
    if (!ref) return "—";
    var normalized = /^https?:\/\//i.test(ref) ? ref : "https://" + ref;
    var m = normalized.match(/\/in\/([^\/?#]+)\/?/i);
    if (m && m[1]) return decodeURIComponent(m[1]);
    return ref.replace(/^https?:\/\//i, "").replace(/\/$/, "");
  }

  function renderReferenceNodeKv(acceptanceRun) {
    var ref =
      acceptanceRun && acceptanceRun.new_reference_node
        ? String(acceptanceRun.new_reference_node)
        : "";
    if (!ref) return kv("Reference node", "—", true);
    var href = /^https?:\/\//i.test(ref) ? ref : "https://" + ref;
    var label = displayReferenceSlug(ref);
    return (
      '<div class="run-kv"><span>Reference node</span><strong class="mono"><a class="run-reference-link" href="' +
      esc(href) +
      '" target="_blank" rel="noopener noreferrer" title="' +
      esc(href) +
      '">' +
      esc(label) +
      "</a></strong></div>"
    );
  }

  function renderRecentLeadCell(row) {
    var url = row && row.url ? String(row.url) : "";
    if (!url) return "—";
    var href = /^https?:\/\//i.test(url) ? url : "https://" + url;
    var display = url;
    if (url.indexOf("/in/") >= 0) {
      var parts = url.split("/in/");
      display = parts[1] ? parts[1].replace(/\/$/, "") : url;
    }
    var shortDisplay =
      display.length > 15 ? display.slice(0, 15) + "..." : display;
    return (
      '<div class="cell-flex truncate"><a class="run-link-truncate" href="' +
      esc(href) +
      '" target="_blank" rel="noopener noreferrer" title="' +
      esc(url) +
      '">' +
      esc(shortDisplay) +
      "</a></div>"
    );
  }

  function renderActionStatus(status) {
    var raw = String(status || "").trim();
    if (!raw) return '<span class="run-muted">—</span>';
    return (
      '<span class="run-action-status" title="' +
      esc(raw) +
      '">' +
      esc(raw) +
      "</span>"
    );
  }

  function renderActionResult(ok) {
    if (ok === true)
      return '<span class="run-action-result run-action-result--ok" title="Action succeeded">✅</span>';
    if (ok === false)
      return '<span class="run-action-result run-action-result--fail" title="Action failed">❌</span>';
    return '<span class="run-action-result run-action-result--na" title="No result">—</span>';
  }

  function renderRunTrackingPanels(deps) {
    var recentMount = document.getElementById("recent-runs-summary-slot");
    var acceptanceMount = document.getElementById("acceptance-runs-slot");
    var messagesMount = document.getElementById("messages-runs-slot");
    if (!recentMount || !acceptanceMount || !messagesMount) return;

    var recentRows = deps.getRecentRows();
    var acceptanceRun = deps.getAcceptanceRun();
    var messagesRun = deps.getMessagesRun();
    var acceptanceRunning = deps.isAcceptanceRunning();
    var messagesRunning = deps.isMessagesRunning();

    var recentRowsHtml = recentRows.length
      ? recentRows
          .map(function (r) {
            var timeTitle =
              r && r.timeRaw ? ' title="' + esc(r.timeRaw) + '"' : "";
            var leadTitle = r && r.url ? ' title="' + esc(r.url) + '"' : "";
            return (
              "<tr>" +
              "<td" +
              leadTitle +
              ">" +
              renderRecentLeadCell(r) +
              "</td>" +
              "<td>" +
              deps.statusPill(r.status || "") +
              "</td>" +
              "<td>" +
              esc(r.action || "—") +
              "</td>" +
              "<td>" +
              renderActionStatus(r.actionStatus) +
              "</td>" +
              "<td" +
              timeTitle +
              ">" +
              esc(r.time || "—") +
              "</td>" +
              "<td>" +
              renderActionResult(r.actionOk) +
              "</td>" +
              "</tr>"
            );
          })
          .join("")
      : '<tr><td colspan="6" class="run-replies-empty">No recent runs available</td></tr>';

    recentMount.innerHTML =
      '<div class="run-section-head"><div class="sec-title">Recent runs</div></div>' +
      '<div class="table-wrap recent-runs-container"><div class="table-scroll-x"><table class="run-table"><thead><tr><th>Lead</th><th>Status</th><th>Last action</th><th>Action status</th><th>Last action time</th><th>Result</th></tr></thead>' +
      "<tbody>" +
      recentRowsHtml +
      "</tbody></table></div></div>";

    acceptanceMount.innerHTML =
      '<div class="run-section-head"><div class="sec-title">Acceptance runs</div>' +
      (acceptanceRunning
        ? '<span class="run-badge run-badge--running">⏳ syncing</span>'
        : "") +
      "</div>" +
      '<div class="run-summary-grid">' +
      renderAcceptanceStatusKv(acceptanceRun, acceptanceRunning) +
      kv(
        "Last run",
        acceptanceRun
          ? formatRunTs(acceptanceRun.completed_at || acceptanceRun.started_at)
          : "—",
      ) +
      kv(
        "Executed count",
        acceptanceRun && acceptanceRun.executed_count != null
          ? String(acceptanceRun.executed_count)
          : "--",
      ) +
      kv(
        "Accepted count",
        (acceptanceRun && String(acceptanceRun.accepted_count)) || "0",
      ) +
      renderReferenceNodeKv(acceptanceRun) +
      "</div>" +
      (acceptanceRun &&
      acceptanceRun.status === "failed" &&
      acceptanceRun.error_message
        ? '<div class="run-inline-error">' +
          esc(acceptanceRun.error_message) +
          "</div>"
        : "");

    messagesMount.innerHTML =
      '<div class="run-section-head"><div class="sec-title">Messages runs</div>' +
      (messagesRunning
        ? '<span class="run-badge run-badge--running">⏳ syncing</span>'
        : "") +
      "</div>" +
      '<div class="run-summary-grid">' +
      kv("Status", "", false).replace(
        "</strong>",
        badge((messagesRun && messagesRun.status) || "", messagesRunning) + "</strong>",
      ) +
      kv(
        "Last run",
        messagesRun
          ? formatRunTs(messagesRun.completed_at || messagesRun.started_at)
          : "—",
      ) +
      kv(
        "Executed count",
        messagesRun && messagesRun.executed_count != null
          ? String(messagesRun.executed_count)
          : "--",
      ) +
      kv(
        "Succeeded count",
        messagesRun && messagesRun.succeeded_count != null
          ? String(messagesRun.succeeded_count)
          : "--",
      ) +
      kv(
        "Leads processed",
        (messagesRun && messagesRun.leads_processed != null ? String(messagesRun.leads_processed) : "--"),
      ) +
      kv(
        "Replies detected",
        (messagesRun && messagesRun.replies_detected != null ? String(messagesRun.replies_detected) : "--"),
      ) +
      kv(
        "Failed count",
        (messagesRun && messagesRun.failed_count != null ? String(messagesRun.failed_count) : "--"),
      ) +
      "</div>" +
      '<div class="run-replies-title">Replies preview</div>' +
      '<div class="run-replies-list">' +
      (messagesRun &&
      Array.isArray(messagesRun.replies) &&
      messagesRun.replies.length
        ? messagesRun.replies
            .slice(0, 5)
            .map(function (r) {
              return (
                '<div class="run-reply-item"><div class="run-reply-name">' +
                esc(r.name || r.identifier || "Unknown") +
                '</div><div class="run-reply-msg">' +
                esc(r.last_reply_message || "Reply detected") +
                (r.replied_at
                  ? '<div class="run-reply-time">' + esc(formatRunTs(r.replied_at)) + "</div>"
                  : "") +
                "</div></div>"
              );
            })
            .join("")
        : '<div class="run-replies-empty">No replies captured for the last run.</div>') +
      "</div>";
  }

  global.AppRunTrackingPanel = {
    renderRunTrackingPanels: renderRunTrackingPanels,
  };
})(window);
