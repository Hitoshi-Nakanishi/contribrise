try {
  const theme = localStorage.getItem("contribrise-theme");
  if (theme === "light" || theme === "dark") {
    document.documentElement.style.colorScheme = theme;
  }
} catch {}
