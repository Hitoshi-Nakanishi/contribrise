(() => {
  "use strict";
  const $ = (id) => document.getElementById(id),
    form = $("form"),
    input = $("users"),
    year = $("year"),
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
      subtitle: "学びの軌跡を、見える形に。",
      users: "GitHubユーザー名",
      year: "年",
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
      subtitle: "See your learning curve.",
      users: "GitHub usernames",
      year: "Year",
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
    document
      .querySelectorAll("[data-i18n]")
      .forEach((node) => (node.textContent = t(node.dataset.i18n)));
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
  if (query.has("year")) year.value = query.get("year");
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
        swatch.style.setProperty("--series", colors[i]);
        swatch.style.borderTopStyle =
          i === 2 ? "dotted" : i ? "dashed" : "solid";
        const name = document.createElement("span");
        name.textContent = s.username;
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
    const requestedYear = Number(year.value);
    if (
      !Number.isInteger(requestedYear) ||
      requestedYear < 2008 ||
      requestedYear > currentYear
    ) {
      setStatus("yearRange", true, { year: currentYear });
      return;
    }
    submit.disabled = true;
    submit.textContent = t("loadingButton");
    setStatus("loading");
    try {
      const results = await Promise.all(
        users.map(async (name) => {
          try {
            const response = await fetch(
              `/api/contributions?user=${encodeURIComponent(name)}&year=${requestedYear}`,
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
              visible: true,
              values: data.days.map(([date, count]) => ({
                date,
                x: Date.parse(date + "T00:00:00Z"),
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
                  : { user: name, year: currentYear }),
              },
            };
          }
        }),
      );
      series = results.filter((result) => !result.error);
      activeYear = requestedYear;
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
          `${activeYear}/01/01 – ${dateText(series[0].until)}`;
        try {
          localStorage.setItem(
            "contribrise",
            JSON.stringify({ users: users.join(", ") }),
          );
        } catch {}
        const params = new URLSearchParams({
          users: users.join(","),
          year: String(activeYear),
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
      right = 16,
      top = 25,
      bottom = 322;
    if (width < 100) return;
    const start = Date.UTC(activeYear, 0, 1),
      end = series[0].values.at(-1).x;
    const maximum = Math.max(...series.map((s) => s.total), 1),
      rawStep = maximum / 5,
      magnitude = 10 ** Math.floor(Math.log10(rawStep));
    const step = [1, 2, 2.5, 5, 10]
        .map((v) => v * magnitude)
        .find((v) => v >= rawStep),
      ceiling = Math.ceil(maximum / step) * step;
    const x = (t) =>
        left +
        3 +
        ((t - start) / Math.max(end - start, 86400000)) *
          (width - left - right - 6),
      y = (n) => bottom - 3 - (n / ceiling) * (bottom - top - 6);
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
    add("title", {}, t("svgTitle", { year: activeYear }));
    add(
      "desc",
      {},
      series.map((s) => `${s.username}: ${count(s.total)}`).join(", "),
    );
    for (let n = 0; n <= ceiling + 0.00001; n += step) {
      const py = y(n);
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
        { x: left - 10, y: py + 4, "text-anchor": "end" },
        n.toLocaleString(),
      );
    }
    const monthStep = width < 500 ? 3 : 1;
    for (let m = 0; m < 12; m += monthStep) {
      const time = Date.UTC(activeYear, m, 1);
      if (time > end) break;
      add(
        "text",
        {
          x: x(time),
          y: bottom + 25,
          "text-anchor": m === 0 ? "start" : "middle",
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
      t("dateAxis", { year: activeYear }),
    );
    add(
      "text",
      {
        transform: `translate(13 ${(top + bottom) / 2}) rotate(-90)`,
        "text-anchor": "middle",
        class: "axis-title",
      },
      t("valueAxis"),
    );
    series.forEach((s, i) => {
      if (!s.visible) return;
      let path = "";
      s.values.forEach((point, index) => {
        const px = x(point.x),
          py = y(point.y);
        path += index
          ? `H${px.toFixed(2)}V${py.toFixed(2)}`
          : `M${px.toFixed(2)},${py.toFixed(2)}`;
      });
      add("path", {
        d: path,
        fill: "none",
        stroke: colors[i],
        "stroke-width": 2,
        "stroke-dasharray": dashes[i],
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
      add("circle", { r: 4, fill: colors[i], visibility: "hidden" }),
    );
    let pinned = false;
    function show(event) {
      const px = Math.max(
        x(start),
        Math.min(x(end), event.clientX - svg.getBoundingClientRect().left),
      );
      const t =
        start +
        ((px - x(start)) / Math.max(x(end) - x(start), 1)) * (end - start);
      const index = Math.max(
        0,
        Math.min(
          series[0].values.length - 1,
          Math.floor((t - start) / 86400000 + 1e-7),
        ),
      );
      guide.setAttribute("x1", px);
      guide.setAttribute("x2", px);
      guide.setAttribute("visibility", "visible");
      tip.replaceChildren();
      const date = document.createElement("div");
      date.className = "tip-date";
      date.textContent = dateText(series[0].values[index].date);
      tip.append(date);
      series.forEach((s, i) => {
        markers[i].setAttribute("visibility", s.visible ? "visible" : "hidden");
        if (!s.visible) return;
        markers[i].setAttribute("cx", px);
        markers[i].setAttribute("cy", y(s.values[index].y));
        const row = document.createElement("div");
        row.className = "tip-row";
        const name = document.createElement("span");
        name.textContent = s.username;
        const count = document.createElement("strong");
        count.textContent = s.values[index].y.toLocaleString();
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
