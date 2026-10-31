(() => {
  "use strict";
  const $ = (id) => document.getElementById(id),
    form = $("form"),
    input = $("users"),
    year = $("year"),
    mode = $("mode"),
    status = $("status"),
    submit = $("submit"),
    chart = $("chart"),
    tip = $("tooltip");
  const colors = [
    "var(--blue)",
    "var(--orange)",
    "var(--green)",
    "var(--purple)",
    "var(--red)",
  ];
  const dashes = ["", "7 4", "2 3", "9 3 2 3", "4 3"];
  const translations = {
    ja: {
      theme: "配色",
      themeSystem: "システム",
      themeLight: "ライト",
      themeDark: "ダーク",
      subtitle: "学びの軌跡を、見える形に。",
      users: "GitHubユーザー名",
      year: "年",
      compare: "比較",
      compareUsers: "ユーザー別",
      compareYears: "年別",
      years: "比較する年",
      yearsHint:
        "ユーザー名を1件、年をカンマ区切りか範囲で指定（最大10年）。例: 2022–2026",
      yearsLimit:
        "年別比較はユーザー名1件と、2008〜{year}の年を最大10件指定してください。",
      monthDay: "月日",
      leftAxis: "左軸",
      rightAxis: "右軸",
      hint: "カンマ・空白で区切って最大5アカウント。",
      show: "表示",
      loadingButton: "取得中…",
      loading: "GitHubから取得しています…",
      chartTitle: "累積Contributions",
      privateNote:
        "非公開活動は、プロフィールで件数が公開されている分を含みます。",
      accounts: "比較アカウント",
      empty: "GitHubユーザー名を入力して、学びの軌跡を見てみましょう。",
      count: "{value}件",
      source: "出典: GitHub",
      updated: "GitHub · {time} 取得（日本時間）",
      dateAxis: "日付（{year}年）",
      valueAxis: "累積活動数（件）",
      svgTitle: "{year}年の累積Contributions",
      limit: "ユーザー名を1〜5件入力してください。",
      username:
        "GitHubユーザー名を確認してください。英数字とハイフンで指定します。",
      yearRange: "年は2008〜{year}で指定してください。",
      disconnected:
        "アプリとの接続が切れています。start.cmdから開き直してください。",
      timeout: "{user}: 接続がタイムアウトしました。再度お試しください。",
      fetchFailed: "{user}: 取得できませんでした。接続を確認してください。",
      fileMode:
        "データを取得するには、同じフォルダーの start.cmd をダブルクリックしてください。",
      notFound: "{user}: ユーザーが見つかりません。",
      cliMissing:
        "GitHub CLIが見つかりません。このPCの設定を確認してください。",
      login:
        "GitHubに接続できません。GitHub CLIのログインと接続を確認してください。",
      calendar:
        "{user}: GitHubのカレンダーを読み取れませんでした。再度お試しください。",
    },
    en: {
      theme: "Theme",
      themeSystem: "System",
      themeLight: "Light",
      themeDark: "Dark",
      subtitle: "See your learning curve.",
      users: "GitHub usernames",
      year: "Year",
      compare: "Compare",
      compareUsers: "By user",
      compareYears: "By year",
      years: "Years to compare",
      yearsHint:
        "One username, up to 10 years separated by commas or a range. Example: 2022–2026",
      yearsLimit:
        "For yearly comparison, enter one username and up to 10 years from 2008 to {year}.",
      monthDay: "Month / day",
      leftAxis: "Left axis",
      rightAxis: "Right axis",
      hint: "Up to 5 accounts, separated by commas or spaces.",
      show: "Show",
      loadingButton: "Loading…",
      loading: "Fetching from GitHub…",
      chartTitle: "Cumulative contributions",
      privateNote: "Includes private activity counts shared on each profile.",
      accounts: "Compared accounts",
      empty: "Enter GitHub usernames to explore your learning curve.",
      count: "{value} contributions",
      source: "Source: GitHub",
      updated: "GitHub · Fetched at {time} JST",
      dateAxis: "Date ({year})",
      valueAxis: "Cumulative contributions",
      svgTitle: "Cumulative contributions in {year}",
      limit: "Enter 1 to 5 usernames.",
      username: "Check the GitHub usernames. Use letters, numbers and hyphens.",
      yearRange: "Enter a year from 2008 to {year}.",
      disconnected: "The app is disconnected. Open it again using start.cmd.",
      timeout: "{user}: The connection timed out. Please try again.",
      fetchFailed: "{user}: Could not fetch data. Check your connection.",
      fileMode: "To fetch data, double-click start.cmd in the same folder.",
      notFound: "{user}: User not found.",
      cliMissing: "GitHub CLI was not found. Check its setup on this PC.",
      login:
        "Cannot connect to GitHub. Check your GitHub CLI login and connection.",
      calendar: "{user}: Could not read the GitHub calendar. Please try again.",
    },
  };
  let language;
  try {
    language = localStorage.getItem("contribrise-language");
  } catch {}
  if (!translations[language])
    language = navigator.language.toLowerCase().startsWith("ja") ? "ja" : "en";
  const locale = () => (language === "ja" ? "ja-JP" : "en-US");
  const t = (key, params = {}) =>
    Object.entries(params).reduce(
      (text, [name, value]) => text.replaceAll("{" + name + "}", value),
      translations[language][key] || translations[language].fetchFailed,
    );
  const count = (value) =>
    t("count", { value: value.toLocaleString(locale()) });
  const currentYear = Number(
    new Intl.DateTimeFormat("en", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
    }).format(new Date()),
  );
  year.max = currentYear;
  year.value = currentYear;
  let series = [],
    activeYear = currentYear,
    activeMode = "users",
    resizeTimer;
  let statusState = { messages: [], error: false };
  function renderStatus() {
    status.textContent = statusState.messages
      .map((message) => t(message.key, message))
      .join(" ");
    status.className = statusState.error ? "error" : "";
  }
  function setStatus(key, error = false, params = {}) {
    statusState = {
      messages: Array.isArray(key) ? key : key ? [{ key, ...params }] : [],
      error,
    };
    renderStatus();
  }
  function renderLanguage() {
    document.documentElement.lang = language;
    $("language").value = language;
    $("theme").setAttribute("aria-label", t("theme"));
    document
      .querySelectorAll("[data-i18n]")
      .forEach((node) => (node.textContent = t(node.dataset.i18n)));
    document.querySelector('label[for="year"]').textContent = t(
      mode.value === "years" ? "years" : "year",
    );
    $("hint").textContent = t(mode.value === "years" ? "yearsHint" : "hint");
    input.placeholder =
      mode.value === "years" ? "octocat" : "octocat, username";
    $("legend").setAttribute("aria-label", t("accounts"));
    submit.textContent = t(submit.disabled ? "loadingButton" : "show");
    if (series.length) {
      const time = new Intl.DateTimeFormat(locale(), {
        timeZone: "Asia/Tokyo",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(new Date(series[0].fetchedAt));
      $("updated").textContent = t("updated", { time });
    } else $("updated").textContent = t("source");
    renderStatus();
    legend();
    draw();
  }
  let stored = {};
  try {
    stored = JSON.parse(localStorage.getItem("contribrise") || "{}");
  } catch {}
  const query = new URLSearchParams(location.search);
  input.value = query.get("users") || stored.users || "";
  mode.value =
    query.get("mode") ||
    (query.has("users") ? "users" : stored.mode) ||
    "users";
  if (!["users", "years"].includes(mode.value)) mode.value = "users";
  if (mode.value === "years")
    year.value =
      query.get("years") || stored.years || `${currentYear - 4}-${currentYear}`;
  else if (query.has("year")) year.value = query.get("year");
  function dateText(value) {
    return value.replaceAll("-", "/");
  }
  function legend() {
    $("legend").replaceChildren(
      ...series.map((s, i) => {
        const button = document.createElement("button");
        button.type = "button";
        button.setAttribute("aria-pressed", String(s.visible));
        const swatch = document.createElement("span");
        swatch.className = "swatch";
        swatch.style.setProperty("--series", colors[i % colors.length]);
        swatch.style.borderTopStyle = i >= colors.length ? "dashed" : "solid";
        const name = document.createElement("span");
        name.textContent =
          s.label +
          (series.some((item) => item.axis === 1)
            ? ` · ${t(s.axis ? "rightAxis" : "leftAxis")}`
            : "");
        const total = document.createElement("span");
        total.className = "total";
        total.textContent = count(s.total);
        button.append(swatch, name, total);
        button.addEventListener("click", () => {
          s.visible = !s.visible;
          button.setAttribute("aria-pressed", String(s.visible));
          draw();
        });
        return button;
      }),
    );
  }
  async function load(event) {
    event?.preventDefault();
    const users = [
      ...new Map(
        input.value
          .split(/[,\s、，]+/)
          .filter(Boolean)
          .map((name) => [name.toLowerCase(), name]),
      ).values(),
    ];
    if (!users.length || users.length > 5) {
      setStatus("limit", true);
      input.focus();
      return;
    }
    if (
      users.some(
        (name) =>
          !/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/.test(name) ||
          name.includes("--"),
      )
    ) {
      setStatus("username", true);
      input.focus();
      return;
    }
    const requestedMode = mode.value;
    const years = [];
    for (const token of year.value.split(/[,\s、，]+/).filter(Boolean)) {
      const range = token.match(/^(\d{4})[-–](\d{4})$/);
      if (range) {
        const first = Number(range[1]),
          last = Number(range[2]);
        if (first > last || last - first >= 10) {
          years.push(NaN);
          break;
        }
        for (let value = first; value <= last; value++) years.push(value);
      } else years.push(/^\d{4}$/.test(token) ? Number(token) : NaN);
    }
    const requestedYears = [...new Set(years)].sort((a, b) => a - b);
    if (
      !requestedYears.length ||
      requestedYears.some(
        (value) =>
          !Number.isInteger(value) || value < 2008 || value > currentYear,
      ) ||
      (requestedMode === "users" && requestedYears.length !== 1) ||
      (requestedMode === "years" &&
        (users.length !== 1 || requestedYears.length > 10))
    ) {
      setStatus(requestedMode === "years" ? "yearsLimit" : "yearRange", true, {
        year: currentYear,
      });
      return;
    }
    const requestedYear = requestedYears[0];
    const requests =
      requestedMode === "years"
        ? requestedYears.map((value) => ({ name: users[0], value }))
        : users.map((name) => ({ name, value: requestedYear }));
    submit.disabled = true;
    submit.textContent = t("loadingButton");
    setStatus("loading");
    try {
      const results = [];
      for (let offset = 0; offset < requests.length; offset += 3)
        results.push(
          ...(await Promise.all(
            requests.slice(offset, offset + 3).map(async ({ name, value }) => {
              try {
                const response = await fetch(
                  `/api/contributions?user=${encodeURIComponent(name)}&year=${value}`,
                  { signal: AbortSignal.timeout(25000) },
                );
                const data = await response.json();
                if (!response.ok)
                  throw Object.assign(new Error(), {
                    key: data.code || "fetchFailed",
                  });
                let cumulative = 0;
                return {
                  ...data,
                  label:
                    requestedMode === "years" ? String(value) : data.username,
                  axis: 0,
                  visible: true,
                  values: data.days.map(([date, count]) => ({
                    date,
                    x: Date.parse(
                      (requestedMode === "years"
                        ? "2000" + date.slice(4)
                        : date) + "T00:00:00Z",
                    ),
                    y: (cumulative += count),
                    count,
                  })),
                };
              } catch (error) {
                const key =
                  error instanceof TypeError
                    ? "disconnected"
                    : error.name === "TimeoutError"
                      ? "timeout"
                      : error.key || "fetchFailed";
                return {
                  error: {
                    key,
                    ...(key === "disconnected"
                      ? {}
                      : {
                          user:
                            requestedMode === "years"
                              ? `${name} (${value})`
                              : name,
                          year: currentYear,
                        }),
                  },
                };
              }
            }),
          )),
        );
      series = results.filter((result) => !result.error);
      activeYear = requestedYear;
      activeMode = requestedMode;
      if (activeMode === "years") {
        const ordered = series
          .filter((s) => s.total > 0)
          .toSorted((a, b) => a.total - b.total);
        let gap = 5,
          cutoff = null;
        for (let i = 1; i < ordered.length; i++) {
          const ratio = ordered[i].total / ordered[i - 1].total;
          if (ratio >= gap) {
            gap = ratio;
            cutoff = ordered[i - 1].total;
          }
        }
        if (cutoff !== null)
          series.forEach((s) => (s.axis = Number(s.total > cutoff)));
      }
      legend();
      draw();
      const failures = [
        ...new Map(
          results
            .filter((result) => result.error)
            .map((result) => [JSON.stringify(result.error), result.error]),
        ).values(),
      ];
      setStatus(failures, failures.length > 0);
      if (series.length) {
        $("period").textContent =
          activeMode === "years"
            ? `${series[0].username} · ${requestedYears.join(", ")}`
            : `${activeYear}/01/01 – ${dateText(series[0].until)}`;
        try {
          localStorage.setItem(
            "contribrise",
            JSON.stringify({
              users: users.join(", "),
              mode: requestedMode,
              years: requestedYears.join(","),
            }),
          );
        } catch {}
        const params = new URLSearchParams({
          users: users.join(","),
          year: String(activeYear),
          ...(activeMode === "years"
            ? { mode: "years", years: requestedYears.join(",") }
            : { mode: "users" }),
        });
        history.replaceState(null, "", "?" + params);
      } else {
        $("period").textContent = "";
      }
    } catch (error) {
      setStatus("fetchFailed", true, { user: "" });
    } finally {
      submit.disabled = false;
      renderLanguage();
    }
  }
  function draw() {
    chart.querySelector("svg")?.remove();
    chart.querySelector(".empty")?.remove();
    tip.hidden = true;
    if (!series.length) {
      const empty = document.createElement("div");
      empty.className = "empty";
      empty.textContent = t("empty");
      chart.prepend(empty);
      return;
    }
    const width = chart.clientWidth,
      height = 380,
      left = 62,
      right = series.some((s) => s.axis === 1) ? 62 : 16,
      top = 25,
      bottom = 322;
    if (width < 100) return;
    const axisYear = activeMode === "years" ? 2000 : activeYear;
    const start = Date.UTC(axisYear, 0, 1),
      end =
        activeMode === "years"
          ? Date.UTC(axisYear, 11, 31)
          : series[0].values.at(-1).x;
    const scales = [0, 1].map((axis) => {
      const maximum = Math.max(
        ...series.filter((s) => s.axis === axis).map((s) => s.total),
        1,
      );
      const rawStep = maximum / 5,
        magnitude = 10 ** Math.floor(Math.log10(rawStep));
      const step = [1, 2, 2.5, 5, 10]
        .map((value) => value * magnitude)
        .find((value) => value >= rawStep);
      return { step, ceiling: Math.ceil(maximum / step) * step };
    });
    const x = (t) =>
        left +
        3 +
        ((t - start) / Math.max(end - start, 86400000)) *
          (width - left - right - 6),
      y = (n, axis = 0) =>
        bottom - 3 - (n / scales[axis].ceiling) * (bottom - top - 6);
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", width);
    svg.setAttribute("height", height);
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("role", "img");
    function add(tag, attrs = {}, text) {
      const node = document.createElementNS(svg.namespaceURI, tag);
      for (const [key, value] of Object.entries(attrs))
        node.setAttribute(key, String(value));
      if (text !== undefined) node.textContent = text;
      svg.append(node);
      return node;
    }
    add(
      "title",
      {},
      activeMode === "years"
        ? t("chartTitle")
        : t("svgTitle", { year: activeYear }),
    );
    add(
      "desc",
      {},
      series
        .map(
          (s) =>
            `${s.label}: ${count(s.total)}${right > 16 ? " " + t(s.axis ? "rightAxis" : "leftAxis") : ""}`,
        )
        .join(", "),
    );
    [0, ...(right > 16 ? [1] : [])].forEach((axis) => {
      const { step, ceiling } = scales[axis];
      for (let n = 0; n <= ceiling + 0.00001; n += step) {
        const py = y(n, axis);
        if (axis === 0)
          add("line", {
            x1: left,
            y1: py,
            x2: width - right,
            y2: py,
            stroke: "var(--line)",
            "stroke-width": 1,
          });
        add(
          "text",
          {
            x: axis ? width - right + 10 : left - 10,
            y: py + 4,
            "text-anchor": axis ? "start" : "end",
            "data-y-axis": axis,
          },
          Number(n.toFixed(3)).toLocaleString(locale()),
        );
      }
    });
    const monthStep = width < 500 ? 3 : 1;
    for (let m = 0; m < 12; m += monthStep) {
      const time = Date.UTC(axisYear, m, 1);
      if (time > end) break;
      add(
        "text",
        {
          x: x(time),
          y: bottom + 25,
          "text-anchor": m === 0 ? "start" : m === 11 ? "end" : "middle",
        },
        language === "ja"
          ? `${m + 1}月`
          : new Intl.DateTimeFormat("en", {
              month: "short",
              timeZone: "UTC",
            }).format(time),
      );
    }
    add(
      "text",
      {
        x: (left + width - right) / 2,
        y: height - 10,
        "text-anchor": "middle",
        class: "axis-title",
      },
      activeMode === "years"
        ? t("monthDay")
        : t("dateAxis", { year: activeYear }),
    );
    add(
      "text",
      {
        transform: `translate(13 ${(top + bottom) / 2}) rotate(-90)`,
        "text-anchor": "middle",
        class: "axis-title",
      },
      t("valueAxis") + (right > 16 ? " · " + t("leftAxis") : ""),
    );
    if (right > 16)
      add(
        "text",
        {
          transform: `translate(${width - 12} ${(top + bottom) / 2}) rotate(90)`,
          "text-anchor": "middle",
          class: "axis-title",
        },
        t("valueAxis") + " · " + t("rightAxis"),
      );
    series.forEach((s, i) => {
      if (!s.visible) return;
      let path = "";
      s.values.forEach((point, index) => {
        const px = x(point.x),
          py = y(point.y, s.axis);
        path += index
          ? `H${px.toFixed(2)}V${py.toFixed(2)}`
          : `M${px.toFixed(2)},${py.toFixed(2)}`;
      });
      add("path", {
        d: path,
        fill: "none",
        stroke: colors[i % colors.length],
        "stroke-width": 2,
        "stroke-dasharray": dashes[Math.floor(i / colors.length)],
        "data-series": s.label,
        "data-axis": s.axis,
      });
    });
    const guide = add("line", {
      x1: left,
      x2: left,
      y1: top,
      y2: bottom,
      stroke: "var(--muted)",
      visibility: "hidden",
    });
    const markers = series.map((s, i) =>
      add("circle", {
        r: 4,
        fill: colors[i % colors.length],
        visibility: "hidden",
      }),
    );
    let pinned = false;
    function show(event) {
      const px = Math.max(
        x(start),
        Math.min(x(end), event.clientX - svg.getBoundingClientRect().left),
      );
      const timestamp =
        start +
        ((px - x(start)) / Math.max(x(end) - x(start), 1)) * (end - start);
      const day =
        start + Math.floor((timestamp - start) / 86400000 + 1e-7) * 86400000;
      guide.setAttribute("x1", px);
      guide.setAttribute("x2", px);
      guide.setAttribute("visibility", "visible");
      tip.replaceChildren();
      const date = document.createElement("div");
      date.className = "tip-date";
      date.textContent = dateText(
        new Date(day).toISOString().slice(activeMode === "years" ? 5 : 0, 10),
      );
      tip.append(date);
      series.forEach((s, i) => {
        markers[i].setAttribute("visibility", s.visible ? "visible" : "hidden");
        if (!s.visible) return;
        const point = s.values.findLast((point) => point.x <= day);
        const available =
          point &&
          day <= s.values.at(-1).x &&
          (activeMode !== "years" ||
            new Date(day).toISOString().slice(5, 10) !== "02-29" ||
            point.x === day);
        markers[i].setAttribute("visibility", available ? "visible" : "hidden");
        markers[i].setAttribute("cx", px);
        if (available) markers[i].setAttribute("cy", y(point.y, s.axis));
        const row = document.createElement("div");
        row.className = "tip-row";
        const name = document.createElement("span");
        name.textContent =
          s.label +
          (right > 16 ? " · " + t(s.axis ? "rightAxis" : "leftAxis") : "");
        const count = document.createElement("strong");
        count.textContent = available ? point.y.toLocaleString(locale()) : "—";
        row.append(name, count);
        tip.append(row);
      });
      tip.hidden = !series.some((s) => s.visible);
      tip.style.left =
        Math.max(4, Math.min(px + 12, width - tip.offsetWidth - 4)) + "px";
      tip.style.top = "22px";
    }
    const overlay = add("rect", {
      x: left,
      y: top,
      width: width - left - right,
      height: bottom - top,
      fill: "transparent",
      "data-hover": "",
    });
    overlay.addEventListener("pointermove", (event) => {
      if (!pinned) show(event);
    });
    overlay.addEventListener("click", (event) => {
      pinned = !pinned;
      show(event);
    });
    overlay.addEventListener("pointerleave", () => {
      if (!pinned) {
        tip.hidden = true;
        guide.setAttribute("visibility", "hidden");
        markers.forEach((marker) =>
          marker.setAttribute("visibility", "hidden"),
        );
      }
    });
    chart.prepend(svg);
  }
  form.addEventListener("submit", load);
  $("theme").value = document.documentElement.style.colorScheme || "system";
  $("theme").addEventListener("change", (event) => {
    const theme = event.target.value;
    document.documentElement.style.colorScheme =
      theme === "system" ? "light dark" : theme;
    try {
      localStorage.setItem("contribrise-theme", theme);
    } catch {}
  });
  mode.addEventListener("change", () => {
    if (mode.value === "years") {
      input.value = input.value.split(/[,\s、，]+/).filter(Boolean)[0] || "";
      year.value = `${currentYear - 4}-${currentYear}`;
    } else year.value = String(currentYear);
    renderLanguage();
  });
  new ResizeObserver(() => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(draw, 50);
  }).observe(chart);
  $("language").addEventListener("change", (event) => {
    language = event.target.value;
    try {
      localStorage.setItem("contribrise-language", language);
    } catch {}
    renderLanguage();
  });
  renderLanguage();
  if (location.protocol === "file:") {
    setStatus("fileMode", true);
    return;
  }
  if (input.value.trim()) load();
})();
